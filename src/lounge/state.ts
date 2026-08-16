/**
 * Synced game state for one Connect Four table.
 *
 * Networking model (serverless CRDT, see multiplayer-sync skill):
 *  - every client creates the same table entities with the same fixed sync ids
 *  - three components live on each table entity, each a separate last-write-
 *    wins register, so writers never clobber each other:
 *      C4Board  -> written by the player whose turn it is (and for resets)
 *      C4SeatA  -> written by whoever holds / vacates seat A (yellow)
 *      C4SeatB  -> written by whoever holds / vacates seat B (red)
 *  - the pure engine in ../engine/connectfour decides legality and wins; this
 *    module only converts between the flat synced representation and the
 *    engine's grid representation.
 */
import { engine, Schemas } from '@dcl/sdk/ecs'
import type { PlayerInfo } from '../engine/types'
import {
  COLS,
  ROWS,
  type ConnectFourCell,
  type ConnectFourGameState
} from '../engine/connectfour'

export const CELL_COUNT = ROWS * COLS

/** C4Board.status values. */
export const Status = { Waiting: 0, Playing: 1, Finished: 2 } as const
/** C4Board.winner values (0 = none yet). */
export const Winner = { None: 0, A: 1, B: 2, Draw: 3 } as const
/** Seat numbers as used by C4Board.turn / winner and the UI. */
export const SEAT_A = 1
export const SEAT_B = 2
export type Seat = typeof SEAT_A | typeof SEAT_B

/** Address stored in a seat when the house bot occupies it. */
export const BOT_ADDR = 'bot'
export const BOT_NAME = 'House Bot'

export const C4Board = engine.defineComponent('arena::c4Board', {
  /** 42 ints, row-major, row 0 = top. 0 empty, 1 yellow (A), 2 red (B). */
  cells: Schemas.Array(Schemas.Int),
  status: Schemas.Int,
  /** 1 = seat A to move, 2 = seat B to move, 0 = nobody. */
  turn: Schemas.Int,
  winner: Schemas.Int,
  /** Flat indices of the four winning cells (empty until someone wins). */
  winCells: Schemas.Array(Schemas.Int),
  /** Flat index of the most recent drop, -1 if none. */
  lastCell: Schemas.Int,
  moveCount: Schemas.Int,
  /** Increments every time a fresh board is dealt; drives visual resets. */
  round: Schemas.Int,
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
export const C4SeatA = engine.defineComponent('arena::c4SeatA', seatSpec)
export const C4SeatB = engine.defineComponent('arena::c4SeatB', seatSpec)

export type BoardData = ReturnType<typeof C4Board.get>
export type SeatData = ReturnType<typeof C4SeatA.get>

export function emptyCells(): number[] {
  return new Array<number>(CELL_COUNT).fill(0)
}

export function emptyBoard(): BoardData {
  return {
    cells: emptyCells(),
    status: Status.Waiting,
    turn: 0,
    winner: Winner.None,
    winCells: [],
    lastCell: -1,
    moveCount: 0,
    round: 0,
    winsA: 0,
    winsB: 0,
    updatedAt: 0
  }
}

export function emptySeat(): SeatData {
  return { addr: '', name: '', bot: false, beat: 0 }
}

export function cellIndex(row: number, col: number): number {
  return row * COLS + col
}
export function cellRow(index: number): number {
  return Math.floor(index / COLS)
}
export function cellCol(index: number): number {
  return index % COLS
}

/** Engine player list: platform colour "red" maps to the yellow disc (index 0). */
export const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]

/** Build an engine state from the flat synced board so the pure rules can run. */
export function toEngineState(board: BoardData): ConnectFourGameState {
  const grid: ConnectFourCell[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: ConnectFourCell[] = []
    for (let c = 0; c < COLS; c++) {
      const v = board.cells[cellIndex(r, c)] ?? 0
      row.push(v === 1 ? 'yellow' : v === 2 ? 'red' : 'empty')
    }
    grid.push(row)
  }
  const aToMove = board.turn !== SEAT_B
  return {
    status: board.status === Status.Playing ? 'playing' : 'finished',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: aToMove ? 0 : 1,
    turnNumber: board.moveCount + 1,
    finishOrder: [],
    board: grid,
    currentDisc: aToMove ? 'yellow' : 'red',
    winningCells: null,
    lastMove: null
  }
}

/** Flatten an engine grid back into the synced representation. */
export function fromEngineGrid(grid: ConnectFourCell[][]): number[] {
  const cells = emptyCells()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c]
      cells[cellIndex(r, c)] = v === 'yellow' ? 1 : v === 'red' ? 2 : 0
    }
  }
  return cells
}
