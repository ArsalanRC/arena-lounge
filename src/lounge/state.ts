/**
 * Synced state for one lounge table (game-agnostic).
 *
 * Networking model (serverless CRDT, see multiplayer-sync skill):
 *  - every client creates the same table entities with the same fixed sync ids
 *  - three components live on each table entity, each a separate last-write-
 *    wins register, so writers never clobber each other:
 *      TableBoard -> written by the player whose turn it is (and for resets)
 *      TableSeatA -> written by whoever holds / vacates seat A
 *      TableSeatB -> written by whoever holds / vacates seat B
 *  - the game's engine state travels as JSON in TableBoard.state; the rules
 *    that produce it live in the game plugin (see games/types.ts), never here.
 */
import { engine, Schemas } from '@dcl/sdk/ecs'

/** TableBoard.status values. */
export const Status = { Waiting: 0, Playing: 1, Finished: 2 } as const
/** TableBoard.winner values (0 = none yet, 3 = draw). */
export const Winner = { None: 0, A: 1, B: 2, Draw: 3 } as const
/** Seat numbers as used by TableBoard.turn / winner and the UI. */
export const SEAT_A = 1
export const SEAT_B = 2
export type Seat = typeof SEAT_A | typeof SEAT_B

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
  /** 1 = seat A to move, 2 = seat B to move, 0 = nobody. */
  turn: Schemas.Int,
  winner: Schemas.Int,
  moveCount: Schemas.Int,
  /** Increments every time a fresh board is dealt; drives visual resets. */
  round: Schemas.Int,
  /**
   * Which physical seat plays the game's first side (colour): false = seat A,
   * true = seat B. Random when a pairing starts, then alternates each round,
   * so nobody picks white / yellow / X by choosing a chair.
   */
  swap: Schemas.Boolean,
  winsA: Schemas.Int,
  winsB: Schemas.Int,
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
    swap: false,
    winsA: 0,
    winsB: 0,
    updatedAt: 0
  }
}

export function emptySeat(): SeatData {
  return { addr: '', name: '', bot: false, beat: 0 }
}
