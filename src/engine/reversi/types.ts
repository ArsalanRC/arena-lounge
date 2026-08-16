/**
 * Reversi engine types.
 *
 * Classic 8×8 disc-flip game. Black moves first; starting 4 discs placed
 * in the centre (black at d5/e4, white at d4/e5 in algebraic notation,
 * i.e. row 3 col 4 / row 4 col 3 for black; row 3 col 3 / row 4 col 4
 * for white when rows and cols are 0-indexed).
 *
 * A legal placement must flank at least one continuous straight line of
 * enemy discs between the new disc and an existing friendly disc in any
 * of the 8 directions. All flanked discs flip.
 *
 * Game ends when neither side has a legal move. Highest disc count wins.
 */

import type { BaseGameMove, BaseGameState } from "../types";

export type ReversiCell = "empty" | "black" | "white";

export type ReversiDifficulty = "easy" | "medium" | "hard";

/**
 * The full Reversi game state. `passCount` tracks consecutive passes —
 * when it reaches 2 the game is over (both sides have no legal move).
 */
export interface ReversiGameState extends BaseGameState {
  /** 8×8 grid indexed as board[row][col], both 0-based. */
  board: ReversiCell[][];
  /** Black always uses player index 0, white uses player index 1. */
  currentPlayerIndex: number;
  /** Number of consecutive passes. Resets to 0 on any disc placement. */
  passCount: number;
  /** Coordinates of the last placed disc, or null at game start. */
  lastMove: { r: number; c: number } | null;
}

/** A single Reversi move — either placing a disc or passing. */
export interface ReversiMove extends BaseGameMove {
  kind: "place" | "pass";
  /** Defined when kind === "place". */
  row?: number;
  /** Defined when kind === "place". */
  col?: number;
}
