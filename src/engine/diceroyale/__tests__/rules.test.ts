import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { DiceFace, DiceRoyaleGameState } from "../types";
import {
  CATEGORIES,
  FULL_HOUSE_VALUE,
  LARGE_STRAIGHT_VALUE,
  ROYALE_BONUS_VALUE,
  ROYALE_VALUE,
  SMALL_STRAIGHT_VALUE,
  TOTAL_TURNS,
  UPPER_BONUS_VALUE,
} from "../constants";
import { createEmptyScores, createInitialState } from "../state";
import {
  grandTotal,
  hasUpperBonus,
  isGameOver,
  previewScore,
  rollDice,
  scoreCategory,
  toggleHold,
  upperSectionTotal,
} from "../rules";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SOLO: PlayerInfo[] = [{ id: "p1", color: "red", playerOrder: 0 }];

/** Return a deterministic rng that cycles through the given values. */
function fixedRng(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

/**
 * Build a fresh state and override the dice array.
 * rollsLeft is set to 2 (has rolled once) and hasRolledThisTurn=true so
 * toggleHold and scoreCategory are available immediately.
 */
function stateWithDice(dice: DiceFace[]): DiceRoyaleGameState {
  const base = createInitialState(SOLO);
  return { ...base, dice, rollsLeft: 2, hasRolledThisTurn: true };
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("rejects multi-player lobbies", () => {
    expect(() =>
      createInitialState([
        ...SOLO,
        { id: "p2", color: "blue", playerOrder: 1 },
      ])
    ).toThrow();
  });

  it("creates a fresh state with correct defaults", () => {
    const s = createInitialState(SOLO);
    expect(s.status).toBe("playing");
    expect(s.dice).toHaveLength(5);
    expect(s.held).toEqual([false, false, false, false, false]);
    expect(s.rollsLeft).toBe(3);
    expect(s.turn).toBe(1);
    expect(s.royaleBonusCount).toBe(0);
    expect(s.hasRolledThisTurn).toBe(false);
    expect(CATEGORIES.every((c) => s.scores[c] === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rollDice
// ---------------------------------------------------------------------------

describe("rollDice", () => {
  it("decrements rollsLeft by 1", () => {
    const s = createInitialState(SOLO);
    const next = rollDice(s, fixedRng([0]));
    expect(next.rollsLeft).toBe(2);
  });

  it("sets hasRolledThisTurn to true", () => {
    const s = createInitialState(SOLO);
    const next = rollDice(s);
    expect(next.hasRolledThisTurn).toBe(true);
  });

  it("does not re-roll held dice", () => {
    const s = createInitialState(SOLO);
    // Force dice to known values, hold dice 0 and 2.
    const known: DiceFace[] = [3, 1, 5, 1, 1];
    const withDice: DiceRoyaleGameState = {
      ...s,
      dice: known,
      held: [true, false, true, false, false],
      rollsLeft: 2,
      hasRolledThisTurn: true,
    };
    // rng returns 0 → die = 1 for the un-held dice.
    const next = rollDice(withDice, fixedRng([0]));
    expect(next.dice[0]).toBe(3); // held — unchanged
    expect(next.dice[2]).toBe(5); // held — unchanged
    expect(next.dice[1]).toBe(1); // re-rolled → 1
    expect(next.dice[3]).toBe(1); // re-rolled → 1
  });

  it("uses the rng to determine new die values", () => {
    const s = createInitialState(SOLO);
    // rng returning 0.999 → Math.floor(0.999*6)+1 = 6
    const next = rollDice(s, fixedRng([0.999]));
    expect(next.dice.every((d) => d === 6)).toBe(true);
  });

  it("ignores the roll when rollsLeft is already 0", () => {
    const base = createInitialState(SOLO);
    const exhausted: DiceRoyaleGameState = {
      ...base,
      rollsLeft: 0,
      hasRolledThisTurn: true,
    };
    const next = rollDice(exhausted);
    expect(next).toBe(exhausted);
  });
});

// ---------------------------------------------------------------------------
// toggleHold
// ---------------------------------------------------------------------------

describe("toggleHold", () => {
  it("toggles a die from unheld to held", () => {
    const s = stateWithDice([1, 2, 3, 4, 5]);
    const next = toggleHold(s, 2);
    expect(next.held[2]).toBe(true);
    expect(next.held[0]).toBe(false);
  });

  it("toggles a die from held to unheld", () => {
    const base = stateWithDice([1, 2, 3, 4, 5]);
    const held = { ...base, held: [false, false, true, false, false] };
    const next = toggleHold(held, 2);
    expect(next.held[2]).toBe(false);
  });

  it("refuses to toggle before any roll has been made", () => {
    const s = createInitialState(SOLO); // hasRolledThisTurn = false
    const next = toggleHold(s, 0);
    expect(next).toBe(s);
  });

  it("refuses to toggle when rollsLeft is 0", () => {
    const base = stateWithDice([1, 2, 3, 4, 5]);
    const noRolls = { ...base, rollsLeft: 0 };
    const next = toggleHold(noRolls, 1);
    expect(next).toBe(noRolls);
  });
});

// ---------------------------------------------------------------------------
// previewScore — upper section
// ---------------------------------------------------------------------------

describe("previewScore — upper section", () => {
  it("scores Ones as sum of 1-face dice", () => {
    expect(previewScore([1, 1, 2, 3, 4], "ones")).toBe(2);
    expect(previewScore([2, 3, 4, 5, 6], "ones")).toBe(0);
  });

  it("scores Twos correctly", () => {
    expect(previewScore([2, 2, 2, 3, 1], "twos")).toBe(6);
  });

  it("scores Threes correctly", () => {
    expect(previewScore([3, 3, 1, 2, 6], "threes")).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// previewScore — lower section
// ---------------------------------------------------------------------------

describe("previewScore — lower section", () => {
  it("Three of a Kind: sums all dice when satisfied", () => {
    expect(previewScore([3, 3, 3, 1, 2], "threeOfAKind")).toBe(12);
    expect(previewScore([1, 2, 3, 4, 5], "threeOfAKind")).toBe(0);
  });

  it("Four of a Kind: sums all dice when satisfied", () => {
    expect(previewScore([5, 5, 5, 5, 2], "fourOfAKind")).toBe(22);
    expect(previewScore([1, 1, 1, 2, 3], "fourOfAKind")).toBe(0);
  });

  it("Full House returns 25 when satisfied, 0 otherwise", () => {
    expect(previewScore([2, 2, 3, 3, 3], "fullHouse")).toBe(FULL_HOUSE_VALUE);
    expect(previewScore([1, 1, 1, 1, 2], "fullHouse")).toBe(0); // four-of-a-kind is NOT a full house
    expect(previewScore([1, 2, 3, 4, 5], "fullHouse")).toBe(0);
  });

  it("Small Straight returns 30 for any 4-in-a-row, 0 otherwise", () => {
    expect(previewScore([1, 2, 3, 4, 1], "smallStraight")).toBe(SMALL_STRAIGHT_VALUE);
    expect(previewScore([2, 3, 4, 5, 6], "smallStraight")).toBe(SMALL_STRAIGHT_VALUE);
    expect(previewScore([1, 1, 1, 2, 3], "smallStraight")).toBe(0);
  });

  it("Large Straight returns 40 for 5-in-a-row, 0 otherwise", () => {
    expect(previewScore([1, 2, 3, 4, 5], "largeStraight")).toBe(LARGE_STRAIGHT_VALUE);
    expect(previewScore([2, 3, 4, 5, 6], "largeStraight")).toBe(LARGE_STRAIGHT_VALUE);
    expect(previewScore([1, 2, 3, 4, 1], "largeStraight")).toBe(0);
  });

  it("Royale returns 50 for five-of-a-kind, 0 otherwise", () => {
    expect(previewScore([4, 4, 4, 4, 4], "royale")).toBe(ROYALE_VALUE);
    expect(previewScore([1, 1, 1, 1, 2], "royale")).toBe(0);
  });

  it("Chance sums all dice regardless", () => {
    expect(previewScore([1, 2, 3, 4, 5], "chance")).toBe(15);
    expect(previewScore([6, 6, 6, 6, 6], "chance")).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// scoreCategory
// ---------------------------------------------------------------------------

describe("scoreCategory", () => {
  it("fills the chosen category with the computed score", () => {
    const s = stateWithDice([1, 1, 2, 3, 4]);
    const next = scoreCategory(s, "ones");
    expect(next.scores.ones).toBe(2);
  });

  it("refuses to overwrite an already-filled category", () => {
    const s = stateWithDice([1, 1, 2, 3, 4]);
    const filled = scoreCategory(s, "ones");
    const again = scoreCategory(filled, "ones");
    // Should return the same state unchanged.
    expect(again.scores.ones).toBe(2);
    expect(again.turn).toBe(filled.turn); // no turn advancement
  });

  it("resets dice, held, and rollsLeft for the next turn", () => {
    const s = stateWithDice([1, 1, 2, 3, 4]);
    const held: DiceRoyaleGameState = { ...s, held: [true, false, true, false, false] };
    const next = scoreCategory(held, "chance");
    expect(next.dice).toEqual([1, 1, 1, 1, 1]);
    expect(next.held).toEqual([false, false, false, false, false]);
    expect(next.rollsLeft).toBe(3);
    expect(next.hasRolledThisTurn).toBe(false);
  });

  it("advances the turn counter", () => {
    const s = stateWithDice([1, 2, 3, 4, 5]);
    const next = scoreCategory(s, "largeStraight");
    expect(next.turn).toBe(2);
  });

  it("awards extra Royale bonus when royale is already scored and five-of-a-kind is rolled", () => {
    let s = stateWithDice([5, 5, 5, 5, 5]);
    // First Royale.
    s = scoreCategory(s, "royale");
    expect(s.scores.royale).toBe(ROYALE_VALUE);
    expect(s.royaleBonusCount).toBe(0);

    // Roll another five-of-a-kind and assign to Chance.
    s = { ...s, dice: [5, 5, 5, 5, 5] as DiceFace[], rollsLeft: 2, hasRolledThisTurn: true };
    s = scoreCategory(s, "chance");
    expect(s.royaleBonusCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Upper-section bonus
// ---------------------------------------------------------------------------

describe("upper-section bonus", () => {
  it("triggers when upper total >= UPPER_BONUS_THRESHOLD", () => {
    const scores = createEmptyScores();
    // Manually fill upper section to exactly 63.
    // 3×1=3, 3×2=6, 3×3=9, 3×4=12, 3×5=15, 3×6=18 → total 63.
    scores.ones = 3;
    scores.twos = 6;
    scores.threes = 9;
    scores.fours = 12;
    scores.fives = 15;
    scores.sixes = 18;
    expect(upperSectionTotal(scores)).toBe(63);
    expect(hasUpperBonus(scores)).toBe(true);
  });

  it("does not trigger when upper total < threshold", () => {
    const scores = createEmptyScores();
    scores.ones = 1;
    expect(hasUpperBonus(scores)).toBe(false);
  });

  it("adds UPPER_BONUS_VALUE to the grand total when earned", () => {
    const base = createInitialState(SOLO);
    // Set upper scores to 63.
    const s: DiceRoyaleGameState = {
      ...base,
      scores: {
        ...createEmptyScores(),
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18,
        chance: 15,
        // rest null
        threeOfAKind: null,
        fourOfAKind: null,
        fullHouse: null,
        smallStraight: null,
        largeStraight: null,
        royale: null,
      },
    };
    const total = grandTotal(s);
    // 63 (upper) + 15 (chance) + 35 (bonus) = 113
    expect(total).toBe(63 + 15 + UPPER_BONUS_VALUE);
  });
});

// ---------------------------------------------------------------------------
// isGameOver
// ---------------------------------------------------------------------------

describe("isGameOver", () => {
  it("returns false for a fresh game", () => {
    expect(isGameOver(createInitialState(SOLO))).toBe(false);
  });

  it("returns true after all 13 categories are scored", () => {
    // Fill all categories by scoring them one by one.
    let s = createInitialState(SOLO);
    for (const cat of CATEGORIES) {
      s = { ...s, dice: [1, 1, 1, 1, 1] as DiceFace[], rollsLeft: 2, hasRolledThisTurn: true };
      s = scoreCategory(s, cat);
    }
    expect(isGameOver(s)).toBe(true);
    expect(s.status).toBe("finished");
    expect(s.finishOrder).toContain("p1");
    expect(s.turn).toBe(TOTAL_TURNS + 1);
  });
});

// ---------------------------------------------------------------------------
// Royale bonus accumulation
// ---------------------------------------------------------------------------

describe("Royale bonus accumulation", () => {
  it("adds ROYALE_BONUS_VALUE per extra Royale to the grand total", () => {
    let s = createInitialState(SOLO);
    // Score royale first.
    s = { ...s, dice: [6, 6, 6, 6, 6] as DiceFace[], rollsLeft: 2, hasRolledThisTurn: true };
    s = scoreCategory(s, "royale");

    // Second royale — assign to Chance.
    s = { ...s, dice: [6, 6, 6, 6, 6] as DiceFace[], rollsLeft: 2, hasRolledThisTurn: true };
    s = scoreCategory(s, "chance");

    expect(s.royaleBonusCount).toBe(1);
    const total = grandTotal(s);
    expect(total).toBeGreaterThanOrEqual(ROYALE_VALUE + 30 + ROYALE_BONUS_VALUE);
  });
});
