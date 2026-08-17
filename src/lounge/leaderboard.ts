/**
 * Persistent leaderboard: wins against real players, kept in a Supabase
 * project (config LEADERBOARD). Two RPCs behind row-level security, called
 * with the public key over HTTPS:
 *   record_result(p_address, p_name, p_game, p_result) -> the player's totals
 *   leaderboard(p_limit)                                -> ranked rows
 * Rounds against the house bot are not reported: the board is about people
 * playing people. Everything here degrades to "no board" when the config is
 * empty or the network is down; the game never waits on it.
 */
import { LEADERBOARD } from './config'

export interface LeaderRow {
  rank: number
  name: string
  address: string
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

/** Report one finished round for the local player; refreshes the board afterwards. Never throws. */
export async function reportResult(address: string, name: string, gameId: string, result: 'win' | 'loss' | 'draw'): Promise<void> {
  if (!leaderboardEnabled() || !address) return
  try {
    const rows = await rpc<MyStats[]>('record_result', { p_address: address, p_name: name, p_game: gameId, p_result: result })
    if (Array.isArray(rows) && rows[0]) board.me = rows[0]
    board.version++
    board.fetchedAt = 0
    void refreshLeaderboard(true)
  } catch (e) {
    console.log('[arena] result report failed', e)
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
export function leaderboardTicker(dt: number, wanted: boolean): void {
  timer += dt
  if (timer < 5) return
  timer = 0
  if (wanted) void refreshLeaderboard(false)
}
