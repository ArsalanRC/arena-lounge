/**
 * Snakes & Ladders engine types.
 *
 * 10×10 board numbered 1–100 in boustrophedon (zigzag) order.
 * Each player has a single piece starting off-board at position 0.
 * Roll dice → move forward → land on snake head = slide down,
 * land on ladder bottom = climb up. First to exactly 100 wins.
 *
 * 2–4 players. Red goes first, clockwise: Red → Blue → Green → Yellow.
 *
 * Dice modes:
 *   "single" — 1d6, rolling 6 = bonus turn
 *   "double" — 2d6 summed, rolling double 6s (6-6) = bonus turn
 *   Three consecutive bonus rolls = bust (turn forfeited)
 */

import type { BaseGameState, BaseGameMove, PlayerColor } from "../types";

/** Whether the game uses one die or two dice per turn. */
export type DiceMode = "single" | "double";

/** A snake (head → tail) or ladder (bottom → top) on the board. */
export interface SnakeOrLadder {
  from: number; // snake head or ladder bottom (square 1–100)
  to: number; // snake tail or ladder top (square 1–100)
  type: "snake" | "ladder";
}

/** Tracks double-dice values for the current roll (null in single mode). */
export interface DoubleDiceState {
  diceValues: [number, number];
  isDoubles: boolean;
}

export interface SnakesLaddersGameState extends BaseGameState {
  /** Position of each player's piece (0 = off-board, 1–100 = on board). */
  positions: Record<PlayerColor, number>;
  currentDiceValue: number | null;
  hasRolled: boolean;
  /** Count of consecutive bonus rolls (6 in single / doubles in double mode). */
  consecutiveBonuses: number;
  /** "roll" = waiting for dice roll, "animating" = move in progress. */
  turnPhase: "roll" | "animating";
  diceMode: DiceMode;
  doubleDice: DoubleDiceState | null;
  snakes: SnakeOrLadder[];
  ladders: SnakeOrLadder[];
  /** Set when the last move triggered a snake or ladder (for animation). */
  lastSnakeOrLadder: SnakeOrLadder | null;
  /** True if the current turn was busted (3 consecutive bonuses). */
  isBust: boolean;
}

export interface SnakesLaddersMove extends BaseGameMove {
  from: number; // position before this move
  to: number; // position after dice movement (before snake/ladder)
  finalTo: number; // position after snake/ladder resolution
  diceValue: number; // total dice value (single die or sum of both)
  triggeredSnakeOrLadder: SnakeOrLadder | null;
  isBounce: boolean; // true if piece bounced back from overshooting 100
}
