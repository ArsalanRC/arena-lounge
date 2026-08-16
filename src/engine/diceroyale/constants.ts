/**
 * Dice Royale constants — category list, bonus thresholds, and values.
 *
 * All numbers are tuning parameters; tweak here without touching the engine.
 */

import type { DiceRoyaleCategory } from "./types";

/** Ordered list of all 13 scoring categories (upper section first). */
export const CATEGORIES: DiceRoyaleCategory[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "royale",
  "chance",
];

/** Upper-section categories (Ones through Sixes). */
export const UPPER_CATEGORIES: DiceRoyaleCategory[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
];

/**
 * Upper-section total must reach this threshold to receive the bonus.
 * (63 = 3-of-each-face on average.)
 */
export const UPPER_BONUS_THRESHOLD = 63;

/** Bonus added to the grand total when upper-section total >= threshold. */
export const UPPER_BONUS_VALUE = 35;

/** Fixed score for a Full House (three + two of a kind). */
export const FULL_HOUSE_VALUE = 25;

/** Fixed score for a Small Straight (four sequential faces). */
export const SMALL_STRAIGHT_VALUE = 30;

/** Fixed score for a Large Straight (five sequential faces). */
export const LARGE_STRAIGHT_VALUE = 40;

/** Fixed score for a Royale (five-of-a-kind). */
export const ROYALE_VALUE = 50;

/**
 * Bonus points added for each additional Royale after the first.
 * These stack on top of the original 50 already banked.
 */
export const ROYALE_BONUS_VALUE = 100;

/** Human-readable display labels for each category. */
export const CATEGORY_LABELS: Record<DiceRoyaleCategory, string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  threeOfAKind: "Three of a Kind",
  fourOfAKind: "Four of a Kind",
  fullHouse: "Full House",
  smallStraight: "Small Straight",
  largeStraight: "Large Straight",
  royale: "Royale",
  chance: "Chance",
};

/** Total number of turns in one game. */
export const TOTAL_TURNS = 13;
