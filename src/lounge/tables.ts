/**
 * Table logic: seats, turns, drops, the house bot, and housekeeping.
 *
 * All game rules come from the pure engine (../engine/connectfour). This file
 * owns the *who may write what* rules for the CRDT-synced components (see
 * state.ts) and the local player's relationship to the tables.
 *
 * Every mutation goes through a small set of functions (sit / stand / drop /
 * inviteBot / rematch / vacate) so the write discipline stays in one place:
 *  - a seat component is written by its holder (claim, heartbeat, leave) or by
 *    a janitor when the holder went silent;
 *  - the board component is written by the player to move, by whoever seats
 *    the second player (deal), or by a seated player applying a timeout.
 * Concurrent identical writes converge; concurrent conflicting writes are
 * only possible on seat claims, and the loser simply sees the seat taken.
 */
import { engine, Entity, Transform, timers } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isStateSyncronized, syncEntity } from '@dcl/sdk/network'
import { getPlayer, onLeaveScene } from '@dcl/sdk/src/players'
import { movePlayerTo } from '~system/RestrictedActions'
import { applyMove, getBotMove, isColumnPlayable } from '../engine/connectfour'
import {
  AUTO_STAND_AFTER_MS,
  AUTO_STAND_DISTANCE,
  BOT_THINK_MS,
  HEARTBEAT_MS,
  NEAR_TABLE_DISTANCE,
  SEAT_PAD_OFFSET,
  SEAT_STALE_MS,
  SYNC_TABLE_BASE,
  TABLES,
  TURN_LIMIT_MS,
  type TableDef
} from './config'
import {
  BOT_ADDR,
  BOT_NAME,
  C4Board,
  C4SeatA,
  C4SeatB,
  SEAT_A,
  SEAT_B,
  Status,
  Winner,
  cellIndex,
  emptyBoard,
  emptyCells,
  emptySeat,
  fromEngineGrid,
  toEngineState,
  type BoardData,
  type Seat,
  type SeatData
} from './state'

export interface Table {
  def: TableDef
  /** Entity carrying the synced C4Board / C4SeatA / C4SeatB components. */
  root: Entity
}

export const tables: Table[] = []

/** The local player, resolved shortly after scene start. */
export const me = { addr: '', name: 'Guest', ready: false }

/** Volatile local-only info for the UI (recomputed by systems). */
export const local = {
  /** Table within NEAR_TABLE_DISTANCE of the avatar, or -1. */
  nearTableId: -1,
  nearDistance: Infinity,
  /** True once the player has taken any seat (hides the onboarding hint). */
  hasEverSat: false,
  /** Timestamp when the player first wandered far from their table. */
  farSince: 0,
  /** Table whose seat card the player dismissed; cleared when they walk away. */
  dismissedTableId: -1,
  /** Mobile controller: show the mini board instead of the compact drop strip. */
  showMiniBoard: false,
  /** Set when the CRDT room never connected; local play is still allowed. */
  offline: false,
  startedAt: 0,
  toast: { text: '', until: 0 }
}

// ---------------------------------------------------------------- creation

export function createTables(): void {
  for (const def of TABLES) {
    const root = engine.addEntity()
    Transform.create(root, {
      position: def.position,
      rotation: Quaternion.fromEulerDegrees(0, def.rotationY, 0)
    })
    C4Board.create(root, emptyBoard())
    C4SeatA.create(root, emptySeat())
    C4SeatB.create(root, emptySeat())
    syncEntity(
      root,
      [C4Board.componentId, C4SeatA.componentId, C4SeatB.componentId],
      SYNC_TABLE_BASE + def.id
    )
    tables.push({ def, root })
  }
  local.startedAt = Date.now()
  onLeaveScene((userId) => vacateEverywhere(userId.toLowerCase()))
}

export function getTable(id: number): Table | undefined {
  return tables[id]
}

// ---------------------------------------------------------------- accessors

export function boardOf(t: Table): BoardData {
  return C4Board.get(t.root)
}

export function seatOf(t: Table, seat: Seat): SeatData {
  return seat === SEAT_A ? C4SeatA.get(t.root) : C4SeatB.get(t.root)
}

function seatMutable(t: Table, seat: Seat) {
  return seat === SEAT_A ? C4SeatA.getMutable(t.root) : C4SeatB.getMutable(t.root)
}

export function otherSeat(seat: Seat): Seat {
  return seat === SEAT_A ? SEAT_B : SEAT_A
}

export function seatIsOpen(s: SeatData): boolean {
  return s.addr === ''
}

export function seatHeldByMe(s: SeatData): boolean {
  return me.ready && s.addr === me.addr
}

/** 0 when the local player is not seated at this table. */
export function mySeatAt(t: Table): 0 | Seat {
  if (!me.ready) return 0
  if (C4SeatA.get(t.root).addr === me.addr) return SEAT_A
  if (C4SeatB.get(t.root).addr === me.addr) return SEAT_B
  return 0
}

export function findMySeat(): { table: Table; seat: Seat } | null {
  for (const t of tables) {
    const s = mySeatAt(t)
    if (s) return { table: t, seat: s }
  }
  return null
}

/** True while it is safe to write synced state. */
export function canWrite(): boolean {
  return me.ready && (isStateSyncronized() || local.offline)
}

export function toast(text: string, ms = 2600): void {
  local.toast = { text, until: Date.now() + ms }
}

// ---------------------------------------------------------------- actions

function writeSeat(t: Table, seat: Seat, data: SeatData): void {
  const m = seatMutable(t, seat)
  m.addr = data.addr
  m.name = data.name
  m.bot = data.bot
  m.beat = data.beat
}

function resetBoard(t: Table, resetSeries: boolean): void {
  const cur = C4Board.get(t.root)
  const b = C4Board.getMutable(t.root)
  b.cells = emptyCells()
  b.status = Status.Waiting
  b.turn = 0
  b.winner = Winner.None
  b.winCells = []
  b.lastCell = -1
  b.moveCount = 0
  b.round = cur.round + 1
  if (resetSeries) {
    b.winsA = 0
    b.winsB = 0
  }
  b.updatedAt = Date.now()
}

/** Deal a new round if both seats are taken and nothing is in progress. */
export function maybeStart(t: Table): void {
  const a = C4SeatA.get(t.root)
  const bs = C4SeatB.get(t.root)
  if (a.addr === '' || bs.addr === '') return
  const cur = C4Board.get(t.root)
  if (cur.status === Status.Playing) return
  const b = C4Board.getMutable(t.root)
  const round = cur.round + 1
  b.cells = emptyCells()
  b.round = round
  b.status = Status.Playing
  // Alternate who opens; the human always opens against the bot.
  b.turn = bs.bot ? SEAT_A : a.bot ? SEAT_B : round % 2 === 1 ? SEAT_A : SEAT_B
  b.winner = Winner.None
  b.winCells = []
  b.lastCell = -1
  b.moveCount = 0
  b.updatedAt = Date.now()
}

/** Take a seat. Stands up from any other seat first. */
export function sit(t: Table, seat: Seat, snap = true): boolean {
  if (!canWrite()) {
    toast('Connecting to the lounge, one moment…')
    return false
  }
  const s = seatOf(t, seat)
  if (!seatIsOpen(s) && !seatHeldByMe(s)) {
    toast('That seat is taken')
    return false
  }
  const cur = findMySeat()
  if (cur && (cur.table !== t || cur.seat !== seat)) vacate(cur.table, cur.seat)
  writeSeat(t, seat, { addr: me.addr, name: me.name, bot: false, beat: Date.now() })
  local.hasEverSat = true
  local.farSince = 0
  maybeStart(t)
  if (snap) snapToSeat(t, seat)
  return true
}

export function stand(t: Table): void {
  const seat = mySeatAt(t)
  if (!seat) return
  vacate(t, seat)
}

/**
 * Free a seat. If a game was running or finished, the board resets so the
 * remaining player waits for a fresh opponent; the series score resets too.
 * A house bot never sits alone, so it leaves with its human.
 */
export function vacate(t: Table, seat: Seat): void {
  const cur = C4Board.get(t.root)
  const other = otherSeat(seat)
  const otherData = seatOf(t, other)
  if (!seatIsOpen(seatOf(t, seat))) writeSeat(t, seat, emptySeat())
  if (otherData.bot) writeSeat(t, other, emptySeat())
  if (cur.status !== Status.Waiting || cur.moveCount > 0) resetBoard(t, true)
}

function vacateEverywhere(addr: string): void {
  if (!addr) return
  for (const t of tables) {
    if (C4SeatA.get(t.root).addr === addr) vacate(t, SEAT_A)
    if (C4SeatB.get(t.root).addr === addr) vacate(t, SEAT_B)
  }
}

/** Seat the house bot opposite the local player. */
export function inviteBot(t: Table): void {
  const mine = mySeatAt(t)
  if (!mine || !canWrite()) return
  const other = otherSeat(mine)
  if (!seatIsOpen(seatOf(t, other))) return
  writeSeat(t, other, { addr: BOT_ADDR, name: BOT_NAME, bot: true, beat: Date.now() })
  maybeStart(t)
}

/** One-tap solo start: take the free seat (yellow first) and seat the bot opposite. */
export function sitWithBot(t: Table): void {
  if (!canWrite()) {
    toast('Connecting to the lounge, one moment…')
    return
  }
  let mine = mySeatAt(t)
  if (!mine) {
    const a = C4SeatA.get(t.root)
    const b = C4SeatB.get(t.root)
    const free: 0 | Seat = a.addr === '' ? SEAT_A : b.addr === '' ? SEAT_B : 0
    if (!free) {
      toast('That table is full')
      return
    }
    if (!sit(t, free)) return
    mine = free
  }
  inviteBot(t)
}

export function dismissBot(t: Table): void {
  const mine = mySeatAt(t)
  if (!mine) return
  const other = otherSeat(mine)
  if (seatOf(t, other).bot) vacate(t, other)
}

/** Deal the next round of a finished game (either seated player may tap). */
export function rematch(t: Table): void {
  if (!mySeatAt(t) || !canWrite()) return
  if (boardOf(t).status !== Status.Finished) return
  maybeStart(t)
}

/** Drop a disc for the local player. Returns false if not allowed right now. */
export function drop(t: Table, col: number): boolean {
  if (!canWrite()) return false
  const board = C4Board.get(t.root)
  if (board.status !== Status.Playing) return false
  const seat = mySeatAt(t)
  if (!seat || board.turn !== seat) return false
  return applyDrop(t, col)
}

/** Apply a drop for whoever's turn it is (used by drop() and the bot). */
function applyDrop(t: Table, col: number): boolean {
  const board = C4Board.get(t.root)
  const st = toEngineState(board)
  if (!isColumnPlayable(st.board, col)) return false
  const player = st.players[st.currentPlayerIndex]
  const next = applyMove(st, {
    kind: 'drop',
    column: col,
    row: 0,
    playerId: player.id,
    color: player.color,
    timestamp: Date.now()
  })
  const mover = board.turn as Seat
  const b = C4Board.getMutable(t.root)
  b.cells = fromEngineGrid(next.board)
  b.lastCell = next.lastMove ? cellIndex(next.lastMove.row, col) : -1
  b.moveCount = board.moveCount + 1
  b.updatedAt = Date.now()
  if (next.status === 'finished') {
    b.status = Status.Finished
    b.turn = 0
    if (next.winningCells) {
      b.winner = mover
      b.winCells = next.winningCells.map(([r, c]) => cellIndex(r, c))
      if (mover === SEAT_A) b.winsA = board.winsA + 1
      else b.winsB = board.winsB + 1
    } else {
      b.winner = Winner.Draw
      b.winCells = []
    }
  } else {
    b.turn = otherSeat(mover)
  }
  return true
}

// ---------------------------------------------------------------- helpers

/** World-space centre of a seat pad. */
export function seatPadWorldPosition(t: Table, seat: Seat): Vector3 {
  const localOffset = Vector3.create(0, 0, seat === SEAT_A ? -SEAT_PAD_OFFSET : SEAT_PAD_OFFSET)
  const rot = Quaternion.fromEulerDegrees(0, t.def.rotationY, 0)
  return Vector3.add(t.def.position, Vector3.rotate(localOffset, rot))
}

/**
 * Move the avatar onto its seat pad, facing the board. The pad carries a
 * first-person CameraModeArea; the client adopts the avatar heading when it
 * switches camera, so after the move we re-issue the heading once more (yaw
 * only: pitch is left level, which is why the tables are bar height).
 */
function snapToSeat(t: Table, seat: Seat): void {
  const pos = seatPadWorldPosition(t, seat)
  const target = Vector3.create(t.def.position.x, 1.6, t.def.position.z)
  const swallow = () => {
    /* moving the player is a nicety; ignore if the client refuses */
  }
  movePlayerTo({
    newRelativePosition: { x: pos.x, y: 0, z: pos.z },
    cameraTarget: target,
    avatarTarget: target
  }).catch(swallow)
  timers.setTimeout(() => {
    movePlayerTo({ newRelativePosition: { x: pos.x, y: 0, z: pos.z }, avatarTarget: target }).catch(swallow)
  }, 450)
}

function playerPosition(): Vector3 | null {
  const tr = Transform.getOrNull(engine.PlayerEntity)
  return tr ? tr.position : null
}

function distanceToTable(t: Table, p: Vector3): number {
  const dx = p.x - t.def.position.x
  const dz = p.z - t.def.position.z
  return Math.sqrt(dx * dx + dz * dz)
}

// ---------------------------------------------------------------- systems

const botPending = new Map<number, string>()

function identitySystem(): void {
  if (me.ready) return
  const p = getPlayer()
  if (!p || !p.userId) return
  me.addr = p.userId.toLowerCase()
  me.name = p.name && p.name.trim() !== '' ? p.name.trim() : 'Guest'
  me.ready = true
}

let syncWatch = 0
function syncWatchdog(dt: number): void {
  if (local.offline || isStateSyncronized()) return
  syncWatch += dt
  if (syncWatch > 8) {
    local.offline = true
    console.log('[arena] sync room not connected after 8 s, allowing local play')
  }
}

let proximityTimer = 0
function proximitySystem(dt: number): void {
  proximityTimer += dt
  if (proximityTimer < 0.15) return
  proximityTimer = 0
  const p = playerPosition()
  if (!p) return
  let best = -1
  let bestD = Infinity
  for (const t of tables) {
    const d = distanceToTable(t, p)
    if (d < bestD) {
      bestD = d
      best = t.def.id
    }
  }
  local.nearDistance = bestD
  local.nearTableId = bestD <= NEAR_TABLE_DISTANCE ? best : -1
  if (local.dismissedTableId >= 0 && local.dismissedTableId !== local.nearTableId) local.dismissedTableId = -1
}

let heartbeatTimer = 0
function heartbeatSystem(dt: number): void {
  heartbeatTimer += dt
  if (heartbeatTimer * 1000 < HEARTBEAT_MS) return
  heartbeatTimer = 0
  if (!canWrite()) return
  const mine = findMySeat()
  if (!mine) return
  const m = seatMutable(mine.table, mine.seat)
  m.beat = Date.now()
}

let janitorTimer = 0
function janitorSystem(dt: number): void {
  janitorTimer += dt
  if (janitorTimer < 2) return
  janitorTimer = 0
  if (!canWrite()) return
  const now = Date.now()
  for (const t of tables) {
    const a = C4SeatA.get(t.root)
    const b = C4SeatB.get(t.root)
    // seats whose holder went silent
    if (a.addr !== '' && !a.bot && now - a.beat > SEAT_STALE_MS) vacate(t, SEAT_A)
    if (b.addr !== '' && !b.bot && now - b.beat > SEAT_STALE_MS) vacate(t, SEAT_B)
    // a bot never sits alone
    const a2 = C4SeatA.get(t.root)
    const b2 = C4SeatB.get(t.root)
    if (a2.bot && b2.addr === '') vacate(t, SEAT_A)
    if (b2.bot && a2.addr === '') vacate(t, SEAT_B)
    // turn timer, applied by a seated player
    const board = C4Board.get(t.root)
    if (board.status === Status.Playing && mySeatAt(t) && now - board.updatedAt > TURN_LIMIT_MS) {
      const loser = board.turn as Seat
      const winner = otherSeat(loser)
      const m = C4Board.getMutable(t.root)
      m.status = Status.Finished
      m.turn = 0
      m.winner = winner
      m.winCells = []
      if (winner === SEAT_A) m.winsA = board.winsA + 1
      else m.winsB = board.winsB + 1
      m.updatedAt = now
      if (loser === mySeatAt(t)) toast('Time ran out, your opponent takes the round')
      else toast('Your opponent ran out of time. Round is yours!')
    }
  }
  // auto-stand when the local player wanders off
  const mine = findMySeat()
  const p = playerPosition()
  if (mine && p) {
    if (distanceToTable(mine.table, p) > AUTO_STAND_DISTANCE) {
      if (!local.farSince) local.farSince = now
      else if (now - local.farSince > AUTO_STAND_AFTER_MS) {
        stand(mine.table)
        toast('You left the table, your seat is free again')
      }
    } else {
      local.farSince = 0
    }
  }
}

function botSystem(): void {
  if (!canWrite()) return
  for (const t of tables) {
    const board = C4Board.get(t.root)
    if (board.status !== Status.Playing || board.turn === 0) continue
    const turnSeat = seatOf(t, board.turn as Seat)
    if (!turnSeat.bot) continue
    // the human sharing the table drives the bot
    if (!seatHeldByMe(seatOf(t, otherSeat(board.turn as Seat)))) continue
    const key = `${board.round}:${board.moveCount}`
    if (botPending.get(t.def.id) === key) continue
    botPending.set(t.def.id, key)
    timers.setTimeout(() => {
      const b2 = C4Board.get(t.root)
      if (b2.status !== Status.Playing) return
      if (`${b2.round}:${b2.moveCount}` !== key) return
      if (!seatOf(t, b2.turn as Seat).bot) return
      const move = getBotMove(toEngineState(b2), 'medium')
      if (move) applyDrop(t, move.column)
    }, BOT_THINK_MS)
  }
}

export function startTableSystems(): void {
  engine.addSystem(identitySystem)
  engine.addSystem(syncWatchdog)
  engine.addSystem(proximitySystem)
  engine.addSystem(heartbeatSystem)
  engine.addSystem(janitorSystem)
  engine.addSystem(botSystem)
}
