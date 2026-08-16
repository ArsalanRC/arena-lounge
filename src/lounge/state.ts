/**
 * Synced state for one lounge table (game-agnostic).
 *
 * Networking model (serverless CRDT, see multiplayer-sync skill):
 *  - every client creates the same table entities with the same fixed sync ids
 *  - three components live on each table entity, each a separate last-write-
 *    wins register, so writers never clobber each other:
 *      TableBoard -> written by the player whose turn it is (and for resets)
 *      TableSeatA..D -> written by whoever holds / vacates that seat (C and
 *                       D only exist on tables whose game seats more than two)
 *  - the game's engine state travels as JSON in TableBoard.state; the rules
 *    that produce it live in the game plugin (see games/types.ts), never here.
 */
import { engine, Schemas } from '@dcl/sdk/ecs'

/** TableBoard.status values. */
export const Status = { Waiting: 0, Playing: 1, Finished: 2 } as const
/** TableBoard.winner values: 0 = none yet, 1..4 = the winning seat, 9 = draw. */
export const Winner = { None: 0, Draw: 9 } as const
/** Seat numbers as used by TableBoard.turn / winner and the UI. Games declare how many they use (2 by default, Ludo 4). */
export const SEAT_A = 1
export const SEAT_B = 2
export const SEAT_C = 3
export const SEAT_D = 4
export type Seat = typeof SEAT_A | typeof SEAT_B | typeof SEAT_C | typeof SEAT_D
export const ALL_SEATS: Seat[] = [SEAT_A, SEAT_B, SEAT_C, SEAT_D]
export const MAX_SEATS = 4

/** Address stored in a seat when the house bot occupies it. */
export const BOT_ADDR = 'bot'
export const BOT_NAME = 'House Bot'

export const TableBoard = engine.defineComponent('arena::tableBoard', {
  /** Game plugin id (games/types.ts GameId). */
  gameId: Schemas.String,
  /** Engine state encoded by the game plugin ('' while waiting). */
  state: Schemas.String,
  /** Encoded last action, for animations ('' when none). */
  lastAction: Schemas.String,
  status: Schemas.Int,
  /** Seat to move (1..4), 0 = nobody. */
  turn: Schemas.Int,
  winner: Schemas.Int,
  moveCount: Schemas.Int,
  /** Increments every time a fresh board is dealt; drives visual resets. */
  round: Schemas.Int,
  /**
   * Game side (colour) per physical seat for the current round, indexed by
   * seat - 1; 0 for seats not in the round. Dealt at random when a round
   * starts from Waiting, then rotated every round, so nobody picks white /
   * yellow / red by choosing a chair.
   */
  sides: Schemas.Array(Schemas.Int),
  /** How many players the host wants at a multi-seat table (2..seats); 2-seat games ignore it. */
  players: Schemas.Int,
  winsA: Schemas.Int,
  winsB: Schemas.Int,
  winsC: Schemas.Int,
  winsD: Schemas.Int,
  /** Date.now() of the last state change (turn timer + staleness). */
  updatedAt: Schemas.Int64
})

const seatSpec = {
  /** Lower-cased wallet address, BOT_ADDR for the house bot, '' when empty. */
  addr: Schemas.String,
  name: Schemas.String,
  bot: Schemas.Boolean,
  /** Date.now() of the holder's last heartbeat. */
  beat: Schemas.Int64
}
export const TableSeatA = engine.defineComponent('arena::tableSeatA', seatSpec)
export const TableSeatB = engine.defineComponent('arena::tableSeatB', seatSpec)
export const TableSeatC = engine.defineComponent('arena::tableSeatC', seatSpec)
export const TableSeatD = engine.defineComponent('arena::tableSeatD', seatSpec)
/** Seat components in seat order (index = seat - 1). C and D exist only on multi-seat tables. */
export const SEAT_COMPONENTS = [TableSeatA, TableSeatB, TableSeatC, TableSeatD] as const

export type BoardData = ReturnType<typeof TableBoard.get>
export type SeatData = ReturnType<typeof TableSeatA.get>

export function emptyBoard(gameId: string): BoardData {
  return {
    gameId,
    state: '',
    lastAction: '',
    status: Status.Waiting,
    turn: 0,
    winner: Winner.None,
    moveCount: 0,
    round: 0,
    sides: [],
    players: 2,
    winsA: 0,
    winsB: 0,
    winsC: 0,
    winsD: 0,
    updatedAt: 0
  }
}

export function emptySeat(): SeatData {
  return { addr: '', name: '', bot: false, beat: 0 }
}

/** Series wins of a seat. */
export function winsOf(b: BoardData, seat: Seat): number {
  return seat === SEAT_A ? b.winsA : seat === SEAT_B ? b.winsB : seat === SEAT_C ? b.winsC : b.winsD
}

export function setWins(b: { winsA: number; winsB: number; winsC: number; winsD: number }, seat: Seat, wins: number): void {
  if (seat === SEAT_A) b.winsA = wins
  else if (seat === SEAT_B) b.winsB = wins
  else if (seat === SEAT_C) b.winsC = wins
  else b.winsD = wins
}
