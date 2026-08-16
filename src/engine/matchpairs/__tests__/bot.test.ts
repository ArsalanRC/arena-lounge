import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import { createInitialState } from "../state";
import { flip } from "../rules";
import {
  createBotMemory,
  updateBotMemory,
  selectFirstFlip,
  selectSecondFlip,
  type BotMemory,
} from "../bot";
import type { MatchPairsCard } from "../types";

const TWO_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "bot", color: "blue", playerOrder: 1, isBot: true, botDifficulty: "hard" },
];

/** Always returns a fixed value (deterministic RNG). */
function fixedRng(value: number): () => number {
  return () => value;
}

/** Seeded RNG for deterministic shuffles. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

describe("createBotMemory", () => {
  it("starts empty", () => {
    const m = createBotMemory();
    expect(m.size).toBe(0);
  });
});

describe("updateBotMemory", () => {
  it("hard bot remembers every flipped card (100% retention)", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    const memory = createBotMemory();
    // Flip card 0 to make it visible
    const afterFlip = flip(state, 0);
    updateBotMemory(memory, afterFlip.cards, "hard", fixedRng(0.99));
    const symbol = afterFlip.cards[0].symbol;
    expect(memory.has(symbol)).toBe(true);
    expect(memory.get(symbol)).toContain(0);
  });

  it("easy bot may forget a card (50% retention)", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    const memory = createBotMemory();
    const afterFlip = flip(state, 0);
    // With rng always > 0.5, card is NOT retained
    updateBotMemory(memory, afterFlip.cards, "easy", fixedRng(0.8));
    const symbol = afterFlip.cards[0].symbol;
    expect(memory.has(symbol)).toBe(false);
  });

  it("medium bot retains with 80% probability", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    // Two separate memory instances: one with rng < 0.8 (retained), one with rng >= 0.8 (forgotten)
    const m1 = createBotMemory();
    const afterFlip = flip(state, 0);
    updateBotMemory(m1, afterFlip.cards, "medium", fixedRng(0.5));
    const symbol = afterFlip.cards[0].symbol;
    expect(m1.has(symbol)).toBe(true);

    const m2 = createBotMemory();
    updateBotMemory(m2, afterFlip.cards, "medium", fixedRng(0.9));
    expect(m2.has(symbol)).toBe(false);
  });

  it("matched cards are pruned from memory", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(2));
    const memory: BotMemory = new Map();
    const sym = state.cards[0].symbol;
    // Manually populate memory with the symbol
    memory.set(sym, [0]);
    // Make cards[0] matched
    const matchedCards: MatchPairsCard[] = state.cards.map((c, i) =>
      i === 0 ? { ...c, matched: true } : c
    );
    updateBotMemory(memory, matchedCards, "hard");
    // Index 0 should be gone from memory
    const remaining = memory.get(sym) ?? [];
    expect(remaining).not.toContain(0);
  });
});

describe("selectFirstFlip", () => {
  it("hard bot picks from a known pair when one exists", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(3));
    const memory: BotMemory = new Map();
    // Manually record two indices for the same symbol
    const sym = state.cards[0].symbol;
    const partnerIdx = state.cards.findIndex((c, i) => i !== 0 && c.symbol === sym);
    memory.set(sym, [0, partnerIdx]);

    const choice = selectFirstFlip(memory, state.cards, [], makeRng(5));
    expect(choice).toBe(0);
  });

  it("returns a legal card index when no known pair", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    const memory = createBotMemory();
    const choice = selectFirstFlip(memory, state.cards, [], makeRng(1));
    expect(choice).not.toBeNull();
    if (choice !== null) {
      expect(state.cards[choice].matched).toBe(false);
      expect(state.cards[choice].flipped).toBe(false);
    }
  });

  it("returns null when all cards are matched", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    const allMatched: MatchPairsCard[] = state.cards.map((c) => ({ ...c, matched: true }));
    const choice = selectFirstFlip(createBotMemory(), allMatched, []);
    expect(choice).toBeNull();
  });
});

describe("selectSecondFlip", () => {
  it("hard bot picks the remembered partner when available", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(4));
    const sym = state.cards[0].symbol;
    const partnerIdx = state.cards.findIndex((c, i) => i !== 0 && c.symbol === sym);
    const memory: BotMemory = new Map([[sym, [partnerIdx]]]);
    const choice = selectSecondFlip(memory, state.cards, sym, 0, makeRng(1));
    expect(choice).toBe(partnerIdx);
  });

  it("falls back to random card when partner not in memory", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    const sym = state.cards[0].symbol;
    const memory = createBotMemory(); // empty
    const choice = selectSecondFlip(memory, state.cards, sym, 0, makeRng(1));
    expect(choice).not.toBeNull();
    if (choice !== null) {
      expect(choice).not.toBe(0); // must not be the first card
      expect(state.cards[choice].matched).toBe(false);
    }
  });

  it("does not pick an already-matched card", () => {
    const state = createInitialState(TWO_PLAYERS, "easy", makeRng(1));
    // Mark all cards except 0 and 1 as matched
    const cards: MatchPairsCard[] = state.cards.map((c, i) =>
      i > 1 ? { ...c, matched: true } : c
    );
    const sym = cards[0].symbol;
    const memory = createBotMemory();
    const choice = selectSecondFlip(memory, cards, sym, 0, makeRng(0));
    if (choice !== null) {
      expect(cards[choice].matched).toBe(false);
    }
  });
});
