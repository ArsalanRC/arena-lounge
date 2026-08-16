/**
 * Dice Royale rules — roll, hold, and score pure functions.
 *
 * All functions treat input state as immutable and return new state objects.
 * No React, no side effects.
 *
 * Turn flow:
 *   1. rollDice()    — initial roll (rollsLeft 3→2); re-rolls non-held dice.
 *   2. toggleHold()  — mark/unmark individual dice to hold between rolls.
 *   3. rollDice()    — second roll (rollsLeft 2→1).
 *   4. toggleHold()  — optional re-adjustment.
 *   5. rollDice()    — third roll (rollsLeft 1→0). No more rolls this turn.
 *   6. scoreCategory() — assign the final roll to one unfilled category;
 *                         advances to the next turn (or ends the game).
 */

import type {
  DiceFace,
  DiceRoyaleCategory,
  DiceRoyaleGameState,
  DiceRoyaleMove,
} from "./types";
import {
  CATEGORIES,
  FULL_HOUSE_VALUE,
  LARGE_STRAIGHT_VALUE,
  ROYALE_BONUS_VALUE,
  ROYALE_VALUE,
  SMALL_STRAIGHT_VALUE,
  TOTAL_TURNS,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UPPER_CATEGORIES,
} from "./constants";

// ---------------------------------------------------------------------------
// Dice-roll helpers
// ---------------------------------------------------------------------------

/**
 * Roll a single die using the provided rng (default Math.random).
 * Returns a DiceFace (1-6).
 */
function rollOneDie(rng: () => number): DiceFace {
  return (Math.floor(rng() * 6) + 1) as DiceFace;
}

// ---------------------------------------------------------------------------
// Public engine actions
// ---------------------------------------------------------------------------

/**
 * Roll non-held dice. Decrements `rollsLeft`.
 *
 * Silently returns the same state if:
 *  - The game is not in "playing" status.
 *  - There are no rolls left (rollsLeft === 0).
 */
export function rollDice(
  state: DiceRoyaleGameState,
  rng: () => number = Math.random
): DiceRoyaleGameState {
  if (state.status !== "playing") return state;
  if (state.rollsLeft <= 0) return state;

  const newDice = state.dice.map((face, i) =>
    state.held[i] ? face : rollOneDie(rng)
  ) as DiceFace[];

  return {
    ...state,
    dice: newDice,
    rollsLeft: state.rollsLeft - 1,
    hasRolledThisTurn: true,
  };
}

/**
 * Toggle the held state of a single die at `index`.
 *
 * Holding is only permitted when:
 *  - The game is in "playing" status.
 *  - At least one roll has been made this turn (hasRolledThisTurn = true).
 *  - There are rolls remaining (rollsLeft > 0) — no point holding when you
 *    can't roll again.
 */
export function toggleHold(
  state: DiceRoyaleGameState,
  index: number
): DiceRoyaleGameState {
  if (state.status !== "playing") return state;
  if (!state.hasRolledThisTurn) return state;
  if (state.rollsLeft <= 0) return state;
  if (index < 0 || index >= state.dice.length) return state;

  const newHeld = [...state.held];
  newHeld[index] = !newHeld[index];
  return { ...state, held: newHeld };
}

/**
 * Compute the score for a given dice set and category without touching state.
 *
 * Returns 0 when the roll does not satisfy the category's requirement.
 * Uses the standard Yahtzee-genre scoring rules but with Dice Royale naming.
 */
export function previewScore(
  dice: DiceFace[],
  category: DiceRoyaleCategory
): number {
  const counts = countFaces(dice);
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    case "ones":
      return counts[1] * 1;
    case "twos":
      return counts[2] * 2;
    case "threes":
      return counts[3] * 3;
    case "fours":
      return counts[4] * 4;
    case "fives":
      return counts[5] * 5;
    case "sixes":
      return counts[6] * 6;

    case "threeOfAKind":
      return hasNOfAKind(counts, 3) ? sum : 0;

    case "fourOfAKind":
      return hasNOfAKind(counts, 4) ? sum : 0;

    case "fullHouse":
      return hasFullHouse(counts) ? FULL_HOUSE_VALUE : 0;

    case "smallStraight":
      return hasSmallStraight(dice) ? SMALL_STRAIGHT_VALUE : 0;

    case "largeStraight":
      return hasLargeStraight(dice) ? LARGE_STRAIGHT_VALUE : 0;

    case "royale":
      return hasNOfAKind(counts, 5) ? ROYALE_VALUE : 0;

    case "chance":
      return sum;
  }
}

/**
 * Lock the current dice roll into the given category.
 *
 * - The category must be unfilled (null) — already-filled categories are
 *   silently ignored (returns state unchanged).
 * - Computes the score via `previewScore`, then also checks for upper-section
 *   bonus and extra Royale bonus.
 * - Advances `turn`; when all 13 categories are filled, marks the game
 *   finished and resets dice to 1s (cosmetic).
 * - Requires at least one roll to have been made this turn.
 */
export function scoreCategory(
  state: DiceRoyaleGameState,
  category: DiceRoyaleCategory
): DiceRoyaleGameState {
  if (state.status !== "playing") return state;
  if (!state.hasRolledThisTurn) return state;
  if (state.scores[category] !== null) return state;

  const earned = previewScore(state.dice, category);

  // Check for additional Royale bonus (five-of-a-kind when royale is already filled).
  const isExtraRoyale =
    category !== "royale" &&
    state.scores.royale !== null &&
    previewScore(state.dice, "royale") > 0;

  const newScores: typeof state.scores = {
    ...state.scores,
    [category]: earned,
  };

  const newRoyaleBonusCount = state.royaleBonusCount + (isExtraRoyale ? 1 : 0);
  const newTurn = state.turn + 1;
  const allFilled = CATEGORIES.every((c) => newScores[c] !== null);

  // Compute the player id for finishOrder.
  const playerId = state.players[0].id;

  if (allFilled) {
    return {
      ...state,
      scores: newScores,
      royaleBonusCount: newRoyaleBonusCount,
      turn: newTurn,
      turnNumber: state.turnNumber + 1,
      status: "finished",
      finishOrder: [playerId],
      dice: [1, 1, 1, 1, 1],
      held: [false, false, false, false, false],
      rollsLeft: 0,
      hasRolledThisTurn: false,
    };
  }

  return {
    ...state,
    scores: newScores,
    royaleBonusCount: newRoyaleBonusCount,
    turn: newTurn,
    turnNumber: state.turnNumber + 1,
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    hasRolledThisTurn: false,
  };
}

/** True if the game has ended (all 13 categories are filled). */
export function isGameOver(state: DiceRoyaleGameState): boolean {
  return state.status === "finished" || state.turn > TOTAL_TURNS;
}

// ---------------------------------------------------------------------------
// Score derivation helpers (exported for the store / UI)
// ---------------------------------------------------------------------------

/** Sum of the upper-section (Ones–Sixes) filled scores. */
export function upperSectionTotal(
  scores: DiceRoyaleGameState["scores"]
): number {
  return UPPER_CATEGORIES.reduce((sum, c) => sum + (scores[c] ?? 0), 0);
}

/** True if the upper-section bonus has been earned. */
export function hasUpperBonus(
  scores: DiceRoyaleGameState["scores"]
): boolean {
  return upperSectionTotal(scores) >= UPPER_BONUS_THRESHOLD;
}

/**
 * Grand total = sum of all locked scores + upper bonus (if earned)
 * + extra Royale bonuses.
 */
export function grandTotal(state: DiceRoyaleGameState): number {
  const base = CATEGORIES.reduce((sum, c) => sum + (state.scores[c] ?? 0), 0);
  const upperBonus = hasUpperBonus(state.scores) ? UPPER_BONUS_VALUE : 0;
  const royaleBonus = state.royaleBonusCount * ROYALE_BONUS_VALUE;
  return base + upperBonus + royaleBonus;
}

/** Build the move record for store bookkeeping. */
export function buildMove(
  state: DiceRoyaleGameState,
  kind: DiceRoyaleMove["kind"],
  opts: { dieIndex?: number; category?: DiceRoyaleCategory } = {}
): DiceRoyaleMove {
  return {
    playerId: state.players[0].id,
    color: state.players[0].color,
    timestamp: Date.now(),
    kind,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns a face→count map for the 5 dice. */
function countFaces(dice: DiceFace[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) counts[d]++;
  return counts;
}

/** True if any face appears at least `n` times. */
function hasNOfAKind(counts: Record<number, number>, n: number): boolean {
  return Object.values(counts).some((c) => c >= n);
}

/** True if the counts show exactly a 3+2 distribution. */
function hasFullHouse(counts: Record<number, number>): boolean {
  const vals = Object.values(counts).filter((c) => c > 0);
  return vals.length === 2 && vals.some((c) => c === 3) && vals.some((c) => c === 2);
}

/** True if the dice contain at least 4 sequential distinct faces. */
function hasSmallStraight(dice: DiceFace[]): boolean {
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  // Check for any 4 consecutive integers.
  const straights = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return straights.some((seq) => seq.every((n) => unique.includes(n as DiceFace)));
}

/** True if the dice contain all 5 sequential faces. */
function hasLargeStraight(dice: DiceFace[]): boolean {
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  if (unique.length < 5) return false;
  return (
    JSON.stringify(unique.slice(0, 5)) === JSON.stringify([1, 2, 3, 4, 5]) ||
    JSON.stringify(unique.slice(0, 5)) === JSON.stringify([2, 3, 4, 5, 6])
  );
}
