import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { SuperTTTGameState, SubBoard, MetaBoard } from "../types";
import { selectBotMove } from "../bot";
import { getValidMoves, applyMove } from "../rules";
import { createInitialState } from "../state";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1, isBot: true, botDifficulty: "hard" },
];

function emptySubBoard(): SubBoard {
  return [null, null, null, null, null, null, null, null, null];
}

function makeState(overrides?: Partial<SuperTTTGameState>): SuperTTTGameState {
  return {
    ...createInitialState(PLAYERS),
    ...overrides,
  };
}

describe("selectBotMove", () => {
  it("returns null when no valid moves", () => {
    const state = makeState({ status: "finished" });
    expect(selectBotMove(state, [], "easy")).toBeNull();
  });

  it("returns the only move when there is exactly one", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    const singleMove = [moves[0]];
    expect(selectBotMove(state, singleMove, "easy")).toBe(singleMove[0]);
  });

  it("easy bot returns a valid move", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "easy");
    expect(move).not.toBeNull();
    expect(moves).toContainEqual(move);
  });

  it("medium bot returns a valid move", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "medium");
    expect(move).not.toBeNull();
    expect(moves).toContainEqual(move);
  });

  it("hard bot returns a valid move", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "hard");
    expect(move).not.toBeNull();
    expect(moves).toContainEqual(move);
  });

  it("hard bot takes an immediate meta-board win", () => {
    // X has won boards 0 and 1, board 2 is about to be won (X X _)
    const meta: MetaBoard = ["X", "X", null, null, null, null, null, null, null];
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    boards[2] = ["X", "X", null, null, null, null, null, null, null];
    const state = makeState({ boards, metaBoard: meta, activeBoard: 2 });
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "hard");
    expect(move).not.toBeNull();
    // Should play cell 2 in board 2 to complete the row
    expect(move!.boardIndex).toBe(2);
    expect(move!.cellIndex).toBe(2);
  });

  it("hard bot blocks an opponent meta-board win", () => {
    // O has won boards 3 and 6, board 0 would complete the column
    // O needs board 0 to win. X should block in board 0.
    const meta: MetaBoard = [null, null, null, "O", null, null, "O", null, null];
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    // Board 0 is almost won by O: O O _
    boards[0] = ["O", "O", null, null, null, null, null, null, null];
    // It's X's turn but activeBoard = 0
    const state = makeState({ boards, metaBoard: meta, activeBoard: 0 });
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "hard");
    expect(move).not.toBeNull();
    // X should play cell 2 in board 0 to prevent O from winning that sub-board easily
    expect(move!.boardIndex).toBe(0);
    expect(move!.cellIndex).toBe(2);
  });

  it("medium bot can complete a full game without errors", () => {
    let state = makeState();
    let turns = 0;
    while (state.status === "playing" && turns < 100) {
      const moves = getValidMoves(state);
      if (moves.length === 0) break;
      const difficulty = state.currentPlayerIndex === 0 ? "medium" : "medium";
      const move = selectBotMove(state, moves, difficulty);
      if (!move) break;
      state = applyMove(state, move);
      turns++;
    }
    // Game should end (finished or we ran out of moves)
    expect(turns).toBeGreaterThan(0);
    expect(turns).toBeLessThan(100);
  });

  it("easy bot can complete a full game without errors", () => {
    let state = makeState();
    let turns = 0;
    while (state.status === "playing" && turns < 100) {
      const moves = getValidMoves(state);
      if (moves.length === 0) break;
      const move = selectBotMove(state, moves, "easy");
      if (!move) break;
      state = applyMove(state, move);
      turns++;
    }
    expect(turns).toBeGreaterThan(0);
    expect(turns).toBeLessThan(100);
  });
});
