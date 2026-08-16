/**
 * Dice Royale engine types.
 *
 * Solo, 13-turn turn-based puzzle. Each turn the player rolls 5 dice up to
 * 3 times (holding any dice between rolls), then assigns the final roll to
 * one of 13 unfilled scoring categories. Game ends after all 13 categories
 * are filled; the grand total is the player's score.
 *
 * IP safety notes:
 *   - **Name** — "Dice Royale" (not "Yahtzee").
 *   - **Special roll name** — "Royale" (five of a kind), not "Yahtzee".
 *   - The abstract idea of "roll-and-hold + scored categories" is not
 *     copyrightable; only specific expression (name, artwork, text) is.
 */

import type { BaseGameMove, BaseGameState } from "../types";

/** Value on a single die face. */
export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;

/** All 13 scoring categories. */
export type DiceRoyaleCategory =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "threeOfAKind"
  | "fourOfAKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "royale"
  | "chance";

/**
 * Score card — each entry is the locked numeric score for that category,
 * or null if still unfilled.
 */
export type DiceRoyaleScores = Record<DiceRoyaleCategory, number | null>;

export interface DiceRoyaleGameState extends BaseGameState {
  /** Current values of the 5 dice. */
  dice: DiceFace[];
  /** Whether each die is held (true = won't be re-rolled). */
  held: boolean[];
  /** Rolls remaining this turn (starts at 3; decrements each roll; 0 means must score). */
  rollsLeft: number;
  /**
   * Current turn number 1-13. After the 13th category is scored this becomes
   * 14 and `status` flips to "finished".
   */
  turn: number;
  /** The 13 category scores. Filled incrementally; null = not yet scored. */
  scores: DiceRoyaleScores;
  /**
   * Count of additional Royale bonuses earned after the first.
   * Each additional Royale (five-of-a-kind when "royale" is already filled)
   * adds ROYALE_BONUS_VALUE to the total.
   */
  royaleBonusCount: number;
  /** Whether the initial roll for this turn has happened yet. */
  hasRolledThisTurn: boolean;
}

export interface DiceRoyaleMove extends BaseGameMove {
  kind: "roll" | "hold" | "score";
  /** For "hold": the index (0-4) of the die being toggled. */
  dieIndex?: number;
  /** For "score": the category being assigned. */
  category?: DiceRoyaleCategory;
}
