/**
 * Snakes & Ladders engine constants — board geometry, snake/ladder positions, helpers.
 *
 * Board is a 10×10 grid numbered 1–100 in boustrophedon (zigzag) order:
 *   Row 1 (bottom): 1→10  left-to-right
 *   Row 2:          20→11 right-to-left
 *   Row 3:          21→30 left-to-right
 *   ...alternating...
 *   Row 10 (top):   100→91 right-to-left
 */

import type { PlayerColor } from "../types";

// ---------------------------------------------------------------------------
// Board dimensions
// ---------------------------------------------------------------------------
export const BOARD_SIZE = 10;
export const TOTAL_SQUARES = 100;

// ---------------------------------------------------------------------------
// Position constants
// ---------------------------------------------------------------------------
/** Off-board — piece has not entered yet. */
export const START_POSITION = 0;
/** Winning square — first to reach this wins. */
export const WIN_POSITION = 100;

// ---------------------------------------------------------------------------
// Player limits
// ---------------------------------------------------------------------------
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

// ---------------------------------------------------------------------------
// Bust threshold
// ---------------------------------------------------------------------------
/** Three consecutive bonus rolls (6 in single / doubles in double) = bust. */
export const BUST_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Player colors in turn order
// ---------------------------------------------------------------------------
export const COLOR_ORDER: PlayerColor[] = ["red", "blue", "green", "yellow"];

// ---------------------------------------------------------------------------
// Default board layout — 9 ladders + 9 snakes
// Positions chosen for balanced gameplay across all four quarters of the board.
// ---------------------------------------------------------------------------
export const DEFAULT_LADDERS: { from: number; to: number }[] = [
  { from: 2, to: 38 },
  { from: 7, to: 14 },
  { from: 8, to: 31 },
  { from: 15, to: 26 },
  { from: 21, to: 42 },
  { from: 28, to: 84 },
  { from: 36, to: 44 },
  { from: 51, to: 67 },
  { from: 71, to: 91 },
];

export const DEFAULT_SNAKES: { from: number; to: number }[] = [
  { from: 16, to: 6 },
  { from: 47, to: 26 },
  { from: 49, to: 11 },
  { from: 56, to: 53 },
  { from: 62, to: 19 },
  { from: 64, to: 60 },
  { from: 87, to: 24 },
  { from: 93, to: 73 },
  { from: 95, to: 75 },
];

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

/**
 * Convert a square number (1–100) to SVG grid coordinates.
 * Returns { row, col } where (0,0) is top-left of the SVG viewBox.
 */
export function squareToCoords(square: number): { row: number; col: number } {
  const zeroIndex = square - 1;
  const rowFromBottom = Math.floor(zeroIndex / BOARD_SIZE);
  const row = BOARD_SIZE - 1 - rowFromBottom; // flip: row 0 = top
  const colInRow = zeroIndex % BOARD_SIZE;
  // Even rows from bottom (0, 2, 4...) go left-to-right; odd rows go right-to-left
  const col =
    rowFromBottom % 2 === 0 ? colInRow : BOARD_SIZE - 1 - colInRow;
  return { row, col };
}

/**
 * Convert SVG grid coordinates back to a square number (1–100).
 * Inverse of squareToCoords.
 */
export function coordsToSquare(row: number, col: number): number {
  const rowFromBottom = BOARD_SIZE - 1 - row;
  const colInRow =
    rowFromBottom % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  return rowFromBottom * BOARD_SIZE + colInRow + 1;
}
