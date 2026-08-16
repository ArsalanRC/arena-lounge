/**
 * Connect Four engine types.
 *
 * Classic 7-column × 6-row vertical-drop game. Two players take turns
 * dropping a disc into a column; it falls to the lowest empty row.
 * First to align 4 discs horizontally, vertically, or diagonally wins.
 * Game is drawn if the board fills with no winner.
 *
 * Board indexing: board[row][col], row 0 = top, row 5 = bottom.
 * Player 1 uses "yellow" discs, player 2 uses "red" discs.
 */

import type { BaseGameMove, BaseGameState } from "../types";

export type ConnectFourCell = "empty" | "yellow" | "red";

export type ConnectFourDisc = "yellow" | "red";

/** A single dropped disc. */
export interface ConnectFourMove extends BaseGameMove {
  kind: "drop";
  column: number;
  /** Row where the disc landed (filled in by applyMove). */
  row: number;
}

export type ConnectFourDifficulty = "easy" | "medium" | "hard";

export interface ConnectFourGameState extends BaseGameState {
  /** board[row][col], row 0 = top, row 5 = bottom. */
  board: ConnectFourCell[][];
  /** Disc colour of the current player — "yellow" moves first. */
  currentDisc: ConnectFourDisc;
  /** The 4 cells forming the winning line, or null if game is not over. */
  winningCells: Array<[number, number]> | null;
  /** The last move played (for animations). */
  lastMove: ConnectFourMove | null;
}
