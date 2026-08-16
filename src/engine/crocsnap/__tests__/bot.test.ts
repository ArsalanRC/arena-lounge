import { describe, it, expect } from "vitest";
import { selectBotMove } from "../bot";
import { getValidMoves } from "../rules";
import { createInitialState } from "../state";
import type { PlayerInfo } from "../../types";

const TWO_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0, isBot: true, botDifficulty: "medium" },
  { id: "p2", color: "blue", playerOrder: 1, isBot: true, botDifficulty: "medium" },
];

describe("selectBotMove", () => {
  it("returns null when no valid moves", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(selectBotMove(state, [], "easy")).toBeNull();
  });

  it("returns a valid move for easy difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    const validMoves = getValidMoves(state);
    const move = selectBotMove(state, validMoves, "easy");
    expect(move).not.toBeNull();
    expect(validMoves).toContainEqual(move);
  });

  it("returns a valid move for medium difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    const validMoves = getValidMoves(state);
    const move = selectBotMove(state, validMoves, "medium");
    expect(move).not.toBeNull();
    expect(validMoves).toContainEqual(move);
  });

  it("returns a valid move for hard difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    const validMoves = getValidMoves(state);
    const move = selectBotMove(state, validMoves, "hard");
    expect(move).not.toBeNull();
    expect(validMoves).toContainEqual(move);
  });

  it("returns the only move when one valid move left", () => {
    const state = createInitialState(TWO_PLAYERS);
    const validMoves = getValidMoves(state);
    const singleMove = [validMoves[0]];
    const move = selectBotMove(state, singleMove, "hard");
    expect(move).toEqual(singleMove[0]);
  });

  it("produces different moves over many calls (randomness)", () => {
    const state = createInitialState(TWO_PLAYERS);
    const validMoves = getValidMoves(state);
    const results = new Set<number>();

    for (let i = 0; i < 100; i++) {
      const move = selectBotMove(state, validMoves, "easy");
      if (move) results.add(move.toothIndex);
    }

    // With 12 teeth and 100 tries, should pick at least 2 different teeth
    expect(results.size).toBeGreaterThan(1);
  });
});
