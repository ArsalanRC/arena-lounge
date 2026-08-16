/**
 * Table logic: seats, turns, actions, the house bot, and housekeeping.
 *
 * Game rules come from the table's game plugin (games/*). This file owns the
 * *who may write what* rules for the CRDT-synced components (see state.ts)
 * and the local player's relationship to the tables.
 *
 * Every mutation goes through a small set of functions (sit / stand / act /
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
import { botSettings } from './games/botSettings'
import { t as L } from './i18n'
import {
  AFK_MS,
  AUTO_STAND_AFTER_MS,
  AUTO_STAND_DISTANCE,
  BOT_THINK_MS,
  ELEVATORS,
  ELEVATOR_RADIUS,
  FLOORS,
  HEARTBEAT_MS,
  NEAR_TABLE_DISTANCE,
  PLAZA,
  SEAT_PAD_OFFSET,
  SEAT_STALE_MS,
  SYNC_TABLE_BASE,
  TABLES,
  TURN_LIMIT_MS,
  type FloorDef,
  type TableDef
} from './config'
import { getGame } from './games/registry'
import type { TableGame } from './games/types'
import {
  BOT_ADDR,
  BOT_NAME,
  SEAT_A,
  SEAT_B,
  Status,
  TableBoard,
  TableSeatA,
  TableSeatB,
  Winner,
  emptyBoard,
  emptySeat,
  type BoardData,
  type Seat,
  type SeatData
} from './state'

export interface Table {
  def: TableDef
  game: TableGame
  /** Entity carrying the synced TableBoard / TableSeatA / TableSeatB components. */
  root: Entity
  /** Decoded engine state cache, keyed by round:moveCount. */
  cache: { key: string; state: unknown; lastAction: unknown }
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
  /** Mobile controller: show the full board instead of the compact controls. */
  showMiniBoard: false,
  /** Whether the "How to play" panel is open, which game tab it shows, and whether the language grid is expanded. */
  helpOpen: false,
  helpGame: '',
  langPickerOpen: false,
  /** Last time the local player did something at a table (sit / act / rematch). */
  lastActionAt: 0,
  /** Set when the CRDT room never connected; local play is still allowed. */
  offline: false,
  startedAt: 0,
  toast: { text: '', until: 0 },
  /** Elevator: panel open while the player stands on a pad; which shaft; the floor they are on. */
  elevatorOpen: false,
  elevatorIndex: 0,
  floor: 0,
  /** Set after a ride so the panel does not reopen until the player steps off the pad. */
  elevatorArmed: true
}

// ---------------------------------------------------------------- creation

export function createTables(): void {
  for (const def of TABLES) {
    const root = engine.addEntity()
    Transform.create(root, {
      position: def.position,
      rotation: Quaternion.fromEulerDegrees(0, def.rotationY, 0)
    })
    TableBoard.create(root, emptyBoard(def.gameId))
    TableSeatA.create(root, emptySeat())
    TableSeatB.create(root, emptySeat())
    syncEntity(
      root,
      [TableBoard.componentId, TableSeatA.componentId, TableSeatB.componentId],
      SYNC_TABLE_BASE + def.id
    )
    tables.push({ def, game: getGame(def.gameId), root, cache: { key: '', state: null, lastAction: null } })
  }
  local.startedAt = Date.now()
  onLeaveScene((userId) => vacateEverywhere(userId.toLowerCase()))
}

export function getTable(id: number): Table | undefined {
  return tables[id]
}

// ---------------------------------------------------------------- accessors

export function boardOf(t: Table): BoardData {
  return TableBoard.get(t.root)
}

/** Decoded engine state for the current round, or null while waiting. */
export function gameStateOf(t: Table): unknown | null {
  const b = TableBoard.get(t.root)
  if (b.state === '') return null
  const key = `${b.round}:${b.moveCount}:${b.status}`
  if (t.cache.key !== key) {
    let state: unknown = null
    let lastAction: unknown = null
    try {
      state = t.game.decode(b.state)
      lastAction = b.lastAction === '' ? null : JSON.parse(b.lastAction)
    } catch (e) {
      console.log('[arena] failed to decode table state', e)
    }
    t.cache = { key, state, lastAction }
  }
  return t.cache.state
}

export function lastActionOf(t: Table): unknown | null {
  gameStateOf(t)
  return t.cache.lastAction
}

export function seatOf(t: Table, seat: Seat): SeatData {
  return seat === SEAT_A ? TableSeatA.get(t.root) : TableSeatB.get(t.root)
}

function seatMutable(t: Table, seat: Seat) {
  return seat === SEAT_A ? TableSeatA.getMutable(t.root) : TableSeatB.getMutable(t.root)
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
  if (TableSeatA.get(t.root).addr === me.addr) return SEAT_A
  if (TableSeatB.get(t.root).addr === me.addr) return SEAT_B
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
  const cur = TableBoard.get(t.root)
  const b = TableBoard.getMutable(t.root)
  b.state = ''
  b.lastAction = ''
  b.status = Status.Waiting
  b.turn = 0
  b.winner = Winner.None
  b.moveCount = 0
  b.round = cur.round + 1
  if (resetSeries) {
    b.winsA = 0
    b.winsB = 0
  }
  b.updatedAt = Date.now()
}

/**
 * Game side (1 = the game's first colour, 2 = the second) played by a physical
 * seat, and back: the mapping is an involution, so one function serves both.
 */
export function sideOf(t: Table, seat: Seat): Seat {
  return TableBoard.get(t.root).swap ? otherSeat(seat) : seat
}

/** Deal a new round if both seats are taken and nothing is in progress. */
export function maybeStart(t: Table): void {
  const a = TableSeatA.get(t.root)
  const bs = TableSeatB.get(t.root)
  if (a.addr === '' || bs.addr === '') return
  const cur = TableBoard.get(t.root)
  if (cur.status === Status.Playing) return
  const round = cur.round + 1
  // Sides: random when a pairing starts (also against the bot), then they
  // alternate every round so both players get each colour and each opening.
  const swap = cur.status === Status.Finished ? !cur.swap : Math.random() < 0.5
  const state = t.game.newGame(1)
  const b = TableBoard.getMutable(t.root)
  b.gameId = t.game.id
  b.state = t.game.encode(state)
  b.lastAction = ''
  b.round = round
  b.swap = swap
  b.status = Status.Playing
  b.turn = swap ? SEAT_B : SEAT_A
  b.winner = Winner.None
  b.moveCount = 0
  b.updatedAt = Date.now()
}

/** Take a seat. Stands up from any other seat first. */
export function sit(t: Table, seat: Seat, snap = true): boolean {
  if (!canWrite()) {
    toast(L().connectingWait)
    return false
  }
  const s = seatOf(t, seat)
  if (!seatIsOpen(s) && !seatHeldByMe(s)) {
    toast(L().seatTaken)
    return false
  }
  const cur = findMySeat()
  if (cur && (cur.table !== t || cur.seat !== seat)) vacate(cur.table, cur.seat)
  writeSeat(t, seat, { addr: me.addr, name: me.name, bot: false, beat: Date.now() })
  local.hasEverSat = true
  local.farSince = 0
  local.lastActionAt = Date.now()
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
  const cur = TableBoard.get(t.root)
  const other = otherSeat(seat)
  const otherData = seatOf(t, other)
  if (!seatIsOpen(seatOf(t, seat))) writeSeat(t, seat, emptySeat())
  if (otherData.bot) writeSeat(t, other, emptySeat())
  if (cur.status !== Status.Waiting || cur.moveCount > 0) resetBoard(t, true)
}

function vacateEverywhere(addr: string): void {
  if (!addr) return
  for (const t of tables) {
    if (TableSeatA.get(t.root).addr === addr) vacate(t, SEAT_A)
    if (TableSeatB.get(t.root).addr === addr) vacate(t, SEAT_B)
  }
}

/** Seat the house bot opposite the local player. */
export function inviteBot(t: Table): void {
  const mine = mySeatAt(t)
  if (!mine || !canWrite()) return
  const other = otherSeat(mine)
  if (!seatIsOpen(seatOf(t, other))) return
  writeSeat(t, other, { addr: BOT_ADDR, name: BOT_NAME, bot: true, beat: Date.now() })
  local.lastActionAt = Date.now()
  maybeStart(t)
}

/** One-tap solo start: take the free seat (A first) and seat the bot opposite. */
export function sitWithBot(t: Table): void {
  if (!canWrite()) {
    toast(L().connectingWait)
    return
  }
  let mine = mySeatAt(t)
  if (!mine) {
    const a = TableSeatA.get(t.root)
    const b = TableSeatB.get(t.root)
    const free: 0 | Seat = a.addr === '' ? SEAT_A : b.addr === '' ? SEAT_B : 0
    if (!free) {
      toast(L().tableFull)
      return
    }
    if (!sit(t, free)) return
    mine = free
  }
  inviteBot(t)
}

/** Take the first free seat (A, then B): chairs carry no colour, sides are dealt at random. */
export function sitAnywhere(t: Table): boolean {
  const a = TableSeatA.get(t.root)
  const b = TableSeatB.get(t.root)
  const free: 0 | Seat = a.addr === '' || a.addr === me.addr ? SEAT_A : b.addr === '' || b.addr === me.addr ? SEAT_B : 0
  if (!free) {
    toast(L().tableFull)
    return false
  }
  return sit(t, free)
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
  local.lastActionAt = Date.now()
  maybeStart(t)
}

/** Perform a game action for the local player. Returns false if not allowed. */
export function act(t: Table, action: unknown): boolean {
  if (!canWrite()) return false
  const board = TableBoard.get(t.root)
  if (board.status !== Status.Playing) return false
  const seat = mySeatAt(t)
  if (!seat || board.turn !== seat) return false
  local.lastActionAt = Date.now()
  return applyAction(t, action, seat)
}

/** Apply an action for physical `seat` (used by act() and the bot driver); the plugin sees game sides. */
function applyAction(t: Table, action: unknown, seat: Seat): boolean {
  const board = TableBoard.get(t.root)
  const state = gameStateOf(t)
  if (state === null) return false
  const next = t.game.apply(state, action, sideOf(t, seat))
  if (next === null) return false
  const b = TableBoard.getMutable(t.root)
  b.state = t.game.encode(next)
  b.lastAction = JSON.stringify(action)
  b.moveCount = board.moveCount + 1
  b.updatedAt = Date.now()
  if (t.game.finished(next)) {
    b.status = Status.Finished
    b.turn = 0
    const w = t.game.winner(next)
    // winner comes back as a game side; store the chair that holds it
    const chair = w === 1 || w === 2 ? sideOf(t, w) : w
    b.winner = chair
    if (chair === SEAT_A) b.winsA = board.winsA + 1
    else if (chair === SEAT_B) b.winsB = board.winsB + 1
  } else {
    const side = t.game.turnSeat(next)
    b.turn = side ? sideOf(t, side) : otherSeat(seat)
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
  // The client measures the look direction from the avatar's base (y = 0),
  // not from the eyes: a target at 1.6 m height at 1.8 m distance tilts the
  // camera 42° up. Aiming at floor height gives a level view of the board.
  const y = t.def.position.y
  const target = Vector3.create(t.def.position.x, y, t.def.position.z)
  const swallow = () => {
    /* moving the player is a nicety; ignore if the client refuses */
  }
  movePlayerTo({ newRelativePosition: { x: pos.x, y, z: pos.z }, cameraTarget: target, avatarTarget: target }).catch(swallow)
}

// ---------------------------------------------------------------- elevator

/** Floor the player is standing on (nearest floor height at or below them). */
export function floorAt(y: number): FloorDef {
  let best = FLOORS[0]
  for (const f of FLOORS) if (y >= f.y - 1.5 && f.y >= best.y) best = f
  return best
}

/** Teleport onto a floor's landing just outside the shaft the player is in, facing the plaza. */
export function rideTo(f: FloorDef): void {
  local.elevatorOpen = false
  local.elevatorArmed = false
  const pad = ELEVATORS[local.elevatorIndex] ?? ELEVATORS[0]
  // step out towards the plaza so the panel does not reopen on arrival
  const dx = PLAZA.x - pad.x
  const dz = PLAZA.z - pad.z
  const len = Math.sqrt(dx * dx + dz * dz) || 1
  const landing = { x: pad.x + (dx / len) * 2.4, y: f.y, z: pad.z + (dz / len) * 2.4 }
  const target = Vector3.create(PLAZA.x, f.y, PLAZA.z)
  movePlayerTo({ newRelativePosition: landing, cameraTarget: target, avatarTarget: target }).catch(() => {
    /* ignore if the client refuses */
  })
}

/** Index of the elevator pad under the player (horizontal distance), or -1. */
function padAt(p: Vector3): number {
  for (let i = 0; i < ELEVATORS.length; i++) {
    const dx = p.x - ELEVATORS[i].x
    const dz = p.z - ELEVATORS[i].z
    if (Math.sqrt(dx * dx + dz * dz) <= ELEVATOR_RADIUS) return i
  }
  return -1
}

function playerPosition(): Vector3 | null {
  const tr = Transform.getOrNull(engine.PlayerEntity)
  return tr ? tr.position : null
}

/** Horizontal distance; tables on another floor count as far away. */
function distanceToTable(t: Table, p: Vector3): number {
  if (Math.abs(p.y - t.def.position.y) > 3) return Infinity
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
  // elevator pads: stepping on one opens the floor panel, stepping off closes it
  local.floor = floorAt(p.y).id
  const pad = padAt(p)
  const onPad = pad >= 0 && Math.abs(p.y - FLOORS[local.floor].y) < 2
  if (onPad) {
    local.elevatorIndex = pad
    if (local.elevatorArmed && !findMySeat()) local.elevatorOpen = true
  } else {
    local.elevatorOpen = false
    local.elevatorArmed = true
  }
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
    const a = TableSeatA.get(t.root)
    const b = TableSeatB.get(t.root)
    // seats whose holder went silent
    if (a.addr !== '' && !a.bot && now - a.beat > SEAT_STALE_MS) vacate(t, SEAT_A)
    if (b.addr !== '' && !b.bot && now - b.beat > SEAT_STALE_MS) vacate(t, SEAT_B)
    // a bot never sits alone
    const a2 = TableSeatA.get(t.root)
    const b2 = TableSeatB.get(t.root)
    if (a2.bot && b2.addr === '') vacate(t, SEAT_A)
    if (b2.bot && a2.addr === '') vacate(t, SEAT_B)
    // turn timer, applied by a seated player
    const board = TableBoard.get(t.root)
    if (board.status === Status.Playing && mySeatAt(t) && now - board.updatedAt > TURN_LIMIT_MS) {
      const loser = board.turn as Seat
      const winner = otherSeat(loser)
      const m = TableBoard.getMutable(t.root)
      m.status = Status.Finished
      m.turn = 0
      m.winner = winner
      if (winner === SEAT_A) m.winsA = board.winsA + 1
      else m.winsB = board.winsB + 1
      m.updatedAt = now
      if (loser === mySeatAt(t)) toast(L().timeoutLost)
      else toast(L().timeoutWon)
    }
  }
  // idle at a table while it is on you to act (or nothing is running): free the seat
  const mineNow = findMySeat()
  if (mineNow && local.lastActionAt && now - local.lastActionAt > AFK_MS) {
    const bd = boardOf(mineNow.table)
    const ballInMyCourt = bd.status !== Status.Playing || bd.turn === mineNow.seat
    if (ballInMyCourt) {
      stand(mineNow.table)
      toast(L().idleStood)
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
        toast(L().leftStood)
      }
    } else {
      local.farSince = 0
    }
  }
}

function botSystem(): void {
  if (!canWrite()) return
  for (const t of tables) {
    const board = TableBoard.get(t.root)
    if (board.status !== Status.Playing || board.turn === 0) continue
    const turnSeat = seatOf(t, board.turn as Seat)
    if (!turnSeat.bot) continue
    // the human sharing the table drives the bot
    if (!seatHeldByMe(seatOf(t, otherSeat(board.turn as Seat)))) continue
    const key = `${board.round}:${board.moveCount}`
    if (botPending.get(t.def.id) === key) continue
    botPending.set(t.def.id, key)
    timers.setTimeout(() => {
      const b2 = TableBoard.get(t.root)
      if (b2.status !== Status.Playing) return
      if (`${b2.round}:${b2.moveCount}` !== key) return
      const seat = b2.turn as Seat
      if (!seatOf(t, seat).bot) return
      const state = gameStateOf(t)
      if (state === null) return
      const action = t.game.botAction(state, botSettings.difficulty)
      if (action !== null) applyAction(t, action, seat)
    }, BOT_THINK_MS)
  }
}

const autoPending = new Map<number, string>()

/** Applies game-requested follow-up actions (see TableGame.pending) for seats this client drives. */
function autoActionSystem(): void {
  if (!canWrite()) return
  for (const t of tables) {
    if (!t.game.pending) continue
    const board = TableBoard.get(t.root)
    if (board.status !== Status.Playing || board.turn === 0) continue
    const seat = board.turn as Seat
    const holder = seatOf(t, seat)
    const driver = holder.bot ? seatHeldByMe(seatOf(t, otherSeat(seat))) : seatHeldByMe(holder)
    if (!driver) continue
    const state = gameStateOf(t)
    if (state === null) continue
    const pend = t.game.pending(state)
    if (!pend) continue
    const key = `${board.round}:${board.moveCount}`
    if (autoPending.get(t.def.id) === key) continue
    autoPending.set(t.def.id, key)
    timers.setTimeout(() => {
      const b2 = TableBoard.get(t.root)
      if (b2.status !== Status.Playing || `${b2.round}:${b2.moveCount}` !== key) return
      applyAction(t, pend.action, seat)
    }, pend.delayMs)
  }
}

export function startTableSystems(): void {
  engine.addSystem(identitySystem)
  engine.addSystem(syncWatchdog)
  engine.addSystem(proximitySystem)
  engine.addSystem(heartbeatSystem)
  engine.addSystem(janitorSystem)
  engine.addSystem(botSystem)
  engine.addSystem(autoActionSystem)
}
