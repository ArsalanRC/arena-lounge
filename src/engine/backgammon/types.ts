/**
 * Backgammon engine types.
 *
 * Two-player dice + board game — ancient (~5000 BCE origin), fully
 * public domain. White (player_order=0, red platform colour) always
 * moves first in this implementation (the traditional opening-roll
 * toss is skipped for simplicity); black plays second.
 *
 * Board representation: 24 points numbered 0..23 from WHITE'S
 * PERSPECTIVE. White moves from high numbered points DOWN toward 0 and
 * bears off from 0..5 (white's home). Black moves from low to high and
 * bears off from 18..23 (black's home).
 *
 *   Visual layout (standard):
 *     Top row:     [12][13][14][15][16][17]   [18][19][20][21][22][23]
 *     Bar:                           |       BAR       |
 *     Bottom row:  [11][10][ 9][ 8][ 7][ 6]   [ 5][ 4][ 3][ 2][ 1][ 0]
 *
 *   Starting position (standard):
 *     point 23: 2 white          point  0: 2 black
 *     point 12: 5 white          point 11: 5 black
 *     point  7: 3 black          point 16: 3 white
 *     point  5: 5 black          point 18: 5 white
 *
 * A "point" holds a stack of same-colour checkers. Two or more same
 * colour = blocked for the opponent. A single opposing checker is a
 * "blot" — a hit sends it to the bar; owner must re-enter from bar
 * before making other moves.
 */

import type { BaseGameMove, BaseGameState } from "../types";

export type BackgammonColor = "white" | "black";

export type GameResult =
  | "in_progress"
  | "white_wins"
  | "black_wins";

/** A stack on a numbered point. `count` is 0 when unoccupied. */
export interface BackgammonPoint {
  count: number;
  owner: BackgammonColor | null;
}

export interface BackgammonGameState extends BaseGameState {
  /** 24 point stacks (index 0 = white's ace point; index 23 = black's). */
  points: BackgammonPoint[];
  /** Checkers parked on the bar per player. */
  bar: { white: number; black: number };
  /** Checkers borne off per player — first to 15 wins. */
  off: { white: number; black: number };
  /** Whose turn to move. */
  turnColor: BackgammonColor;
  /**
   * The two dice for the current turn. Present once rolled; cleared
   * once both have been consumed. Doubles yield four identical pips
   * (see `remainingPips`).
   */
  dice: [number, number] | null;
  /** Which dice values are still available to play this turn. */
  remainingPips: number[];
  gameResult: GameResult;
  /** For animations + move log. Null between turns. */
  lastMove: BackgammonMove | null;
  /**
   * Monotonic counter bumped after every move (`applyMove`). Used by
   * the store / UI to key animations without relying on reference
   * identity.
   */
  moveCounter: number;
}

/**
 * A single checker movement (one die's worth of pips). Multi-pip turns
 * submit multiple moves in sequence — the store / UI decides whether
 * to do that atomically or step-by-step.
 */
export interface BackgammonMove extends BaseGameMove {
  /** Source point index (0..23) or `"bar"` if re-entering. */
  from: number | "bar";
  /** Destination point index (0..23) or `"off"` if bearing off. */
  to: number | "off";
  /** Pip count consumed by this move (one of remainingPips). */
  pips: number;
  /** True if this move captured an opposing blot. */
  hit: boolean;
}
