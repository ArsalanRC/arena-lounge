/**
 * Connect Four engine constants — board geometry, win length, disc colours,
 * and minimax search depths per difficulty.
 */

import type { ConnectFourDifficulty } from "./types";

/** Number of rows in the grid. */
export const ROWS = 6;
/** Number of columns in the grid. */
export const COLS = 7;
/** Number of discs in a line needed to win. */
export const WIN_LENGTH = 4;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

/** Centre column index — preferred by the bot heuristic. */
export const CENTRE_COL = Math.floor(COLS / 2); // 3

/** Minimax search depth per difficulty level. */
export const DEPTH_BY_DIFFICULTY: Record<ConnectFourDifficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
};

/** Column evaluation order — centre-first improves α-β pruning. */
export const COL_ORDER: number[] = (() => {
  // [3, 2, 4, 1, 5, 0, 6] for COLS=7
  const order: number[] = [];
  for (let delta = 0; delta <= Math.floor(COLS / 2); delta++) {
    if (delta === 0) {
      order.push(CENTRE_COL);
    } else {
      if (CENTRE_COL - delta >= 0) order.push(CENTRE_COL - delta);
      if (CENTRE_COL + delta < COLS) order.push(CENTRE_COL + delta);
    }
  }
  return order;
})();
