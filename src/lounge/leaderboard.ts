/**
 * Persistent leaderboard: wins against real players, kept in a Supabase
 * project (config LEADERBOARD).
 *   Reads: two RPCs behind row-level security, called with the public key.
 *     leaderboard(p_limit) -> ranked rows, my_stats(p_address) -> own totals
 *   Writes: an Edge Function `report`, called with Decentraland's signedFetch,
 *     so the server knows which wallet is speaking; the address is never part
 *     of the body. A round counts once a second participant of the same round
 *     reports a consistent outcome (see supabase/003_signed_reports.sql).
 * Rounds against the house bot are not reported: the board is about people
 * playing people. Everything here degrades to "no board" when the config is
 * empty or the network is down; the game never waits on it.
 */
import { timers } from '@dcl/sdk/ecs'
import { signedFetch } from '~system/SignedFetch'
import { LEADERBOARD } from './config'

export interface LeaderRow {
  rank: number
  name: string
  address: string
  points: number
  wins: number
  streak: number
  best_streak: number
  games: number
}

export interface MyStats {
  wins: number
  losses: number
  draws: number
  streak: number
  best_streak: number
  games: number
}

/** Local mirror of the board and of the local player's totals (UI reads it, systems refresh it). */
export const board = {
  rows: [] as LeaderRow[],
  fetchedAt: 0,
  loading: false,
  failed: false,
  /** Bumped on every change so 3D text can cheaply notice. */
  version: 0,
  me: null as MyStats | null
}

export function leaderboardEnabled(): boolean {
  return LEADERBOARD.url !== '' && LEADERBOARD.key !== ''
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${LEADERBOARD.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: LEADERBOARD.key,
      Authorization: `Bearer ${LEADERBOARD.key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${name} ${res.status}`)
  return (await res.json()) as T
}

/** Fetch the ranked rows unless a fresh copy is in hand (or `force`). Never throws. */
export async function refreshLeaderboard(force = false): Promise<void> {
  if (!leaderboardEnabled() || board.loading) return
  if (!force && Date.now() - board.fetchedAt < LEADERBOARD.cacheMs) return
  board.loading = true
  try {
    const rows = await rpc<LeaderRow[]>('leaderboard', { p_limit: LEADERBOARD.rows })
    board.rows = Array.isArray(rows) ? rows : []
    board.fetchedAt = Date.now()
    board.failed = false
  } catch (e) {
    board.failed = true
    console.log('[arena] leaderboard fetch failed', e)
  } finally {
    board.loading = false
    board.version++
  }
}

/**
 * Report one finished round for the local player through the signed Edge Function.
 * `roundKey` = "<table>:<round>:<dealtAt>" (identical on every client of that round),
 * `opponents` = the other human addresses of the round. Refreshes the board afterwards. Never throws.
 */
export async function reportResult(name: string, gameId: string, result: 'win' | 'loss' | 'draw', roundKey: string, opponents: string[]): Promise<void> {
  if (!leaderboardEnabled() || opponents.length === 0) return
  // Up to 3 attempts, 9 s apart: a cold function isolate can be rejected by the database with
  // "JWT issued at future" (its service token races the db clock; seen live 21 Aug), and the
  // velocity rule needs 8 s+ between rows per address. The confirm window is 10 min, so late
  // retries still pair up with the opponent's report.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await signedFetch({
        url: `${LEADERBOARD.url}/functions/v1/report`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: LEADERBOARD.key },
          body: JSON.stringify({ name, game: gameId, result, round_key: roundKey, opponents })
        }
      })
      if (!res.ok) throw new Error(`report ${res.status} ${res.body}`)
      const stats = JSON.parse(res.body) as (MyStats & { confirmed?: boolean }) | null
      if (stats && typeof stats.wins === 'number') board.me = stats
      board.version++
      board.fetchedAt = 0
      void refreshLeaderboard(true)
      return
    } catch (e) {
      console.log(`[arena] result report failed (attempt ${attempt})`, e)
      if (attempt < 3) await new Promise((r) => timers.setTimeout(r as () => void, 9000))
    }
  }
}

/** Load the local player's totals once identity is known (so the panel can say "You: ..."). Never throws. */
export async function loadMyStats(address: string): Promise<void> {
  if (!leaderboardEnabled() || !address) return
  try {
    const rows = await rpc<MyStats[]>('my_stats', { p_address: address })
    if (Array.isArray(rows) && rows[0]) board.me = rows[0]
    board.version++
  } catch (e) {
    console.log('[arena] my_stats failed', e)
  }
}

/** Refresh the board every so often while something shows it (rooftop, open panel); the caller decides when. */
let timer = 0
let primed = false
export function leaderboardTicker(dt: number, wanted: boolean): void {
  timer += dt
  if (timer < 5) return
  timer = 0
  // one fetch shortly after start so the rooftop board is filled before anyone climbs; then only on demand
  if (wanted || !primed) void refreshLeaderboard(false)
  primed = true
}
