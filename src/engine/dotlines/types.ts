/**
 * Dot Lines (Dots-and-Boxes) engine types.
 *
 * Grid topology for a ROWS×COLS box grid:
 *   Dots:            (ROWS+1) × (COLS+1)
 *   Horizontal edges: (ROWS+1) × COLS   — top/bottom edges of each row of boxes
 *   Vertical edges:   ROWS × (COLS+1)   — left/right edges of each column of boxes
 *   Boxes:            ROWS × COLS
 *
 * Default configuration: 5×5 boxes (6×6 dot grid, 60 total edges).
 *
 * Move encoding:
 *   orientation "h" row r col c → horizontal edge between dot (r,c) and dot (r,c+1)
 *   orientation "v" row r col c → vertical edge between dot (r,c) and dot (r+1,c)
 */

import type { BaseGameMove, BaseGameState } from "../types";

export type DotLinesDifficulty = "easy" | "medium" | "hard";

/** A single 1×1 box on the board. */
export interface DotLinesBox {
  /** Index of the player who claimed this box, or null if unclaimed. */
  ownerIndex: number | null;
}

/** The last move recorded for animation / display purposes. */
export interface DotLinesLastMove {
  orientation: "h" | "v";
  row: number;
  col: number;
  /** Boxes that were completed by this single move (up to 2). */
  completedBoxes: Array<{ row: number; col: number }>;
}

export interface DotLinesGameState extends BaseGameState {
  rows: number;
  cols: number;
  /**
   * Drawn horizontal edges.
   * Indexed as horizontalLines[row][col] where
   *   row ∈ [0, rows] and col ∈ [0, cols-1].
   * true = the edge between dots (row,col)–(row,col+1) is drawn.
   */
  horizontalLines: boolean[][];
  /**
   * Drawn vertical edges.
   * Indexed as verticalLines[row][col] where
   *   row ∈ [0, rows-1] and col ∈ [0, cols].
   * true = the edge between dots (row,col)–(row+1,col) is drawn.
   */
  verticalLines: boolean[][];
  /** ROWS × COLS grid of box ownership. */
  boxes: DotLinesBox[][];
  /** scores[i] = number of boxes claimed by player i. */
  scores: number[];
  lastMove: DotLinesLastMove | null;
}

export interface DotLinesMove extends BaseGameMove {
  kind: "draw";
  orientation: "h" | "v";
  /** Row index of the edge. */
  row: number;
  /** Column index of the edge. */
  col: number;
}
