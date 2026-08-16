/**
 * Reversi engine constants — board geometry, positional weights, and the
 * starting layout.
 *
 * Positional weights are used by the hard-difficulty bot to favour stable
 * edge and corner discs and avoid X-squares / C-squares that surrender
 * corner control to the opponent.
 */

import type { ReversiCell } from "./types";

export const SIZE = 8;

/** All 8 directions: [deltaRow, deltaCol]. */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1,  0],
  [-1,  1],
  [ 0, -1],
  [ 0,  1],
  [ 1, -1],
  [ 1,  0],
  [ 1,  1],
];

/**
 * Starting board — 4 discs in the centre.
 * Black on (3,4) and (4,3); white on (3,3) and (4,4).
 */
export const INITIAL_BOARD: ReversiCell[][] = (() => {
  const b: ReversiCell[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill("empty") as ReversiCell[]
  );
  b[3][3] = "white";
  b[3][4] = "black";
  b[4][3] = "black";
  b[4][4] = "white";
  return b;
})();

/**
 * Positional score table for the hard-difficulty minimax heuristic.
 * Indexed [row][col]. Reflects standard Reversi theory:
 *   corners  = 100  (stable, never flippable)
 *   edges    = 10   (tend to stay stable)
 *   X-squares = -20 (diagonal to corner — surrenders corner)
 *   C-squares = -10 (adjacent to corner on edge — almost as dangerous)
 *   centre   = 2    (moderate value in the opening)
 */
export const POSITION_WEIGHTS: ReadonlyArray<ReadonlyArray<number>> = [
  [100, -10,  10,   2,   2,  10, -10, 100],
  [-10, -20,  -2,  -2,  -2,  -2, -20, -10],
  [ 10,  -2,   2,   1,   1,   2,  -2,  10],
  [  2,  -2,   1,   2,   2,   1,  -2,   2],
  [  2,  -2,   1,   2,   2,   1,  -2,   2],
  [ 10,  -2,   2,   1,   1,   2,  -2,  10],
  [-10, -20,  -2,  -2,  -2,  -2, -20, -10],
  [100, -10,  10,   2,   2,  10, -10, 100],
];
