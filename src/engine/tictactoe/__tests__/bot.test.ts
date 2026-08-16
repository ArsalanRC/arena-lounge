import { describe, it, expect } from "vitest";
import type { TTTBoard, TTTGameState } from "../types";
import { selectBotMove, minimax } from "../bot";
import { getValidMoves, applyMove } from "../rules";
import { createInitialState } from "../state";
import type { PlayerInfo } from "../../types";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function makeState(board: TTTBoard, overrides?: Partial<TTTGameState>): TTTGameState {
  return {
    ...createInitialState(PLAYERS),
    board,
    ...overrides,
  };
}

function emptyBoard(): TTTBoard {
  return [null, null, null, null, null, null, null, null, null];
}

describe("selectBotMove", () => {
  it("returns null when no valid moves", () => {
    const state = makeState(emptyBoard());
    expect(selectBotMove(state, [], "easy")).toBeNull();
  });

  it("returns only move when one valid", () => {
    const board: TTTBoard = ["X", "O", "X", "O", "X", "O", "O", "X", null];
    const state = makeState(board);
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(1);
    const result = selectBotMove(state, moves, "hard");
    expect(result).not.toBeNull();
    expect(result!.cellIndex).toBe(8);
  });

  it("easy bot returns a valid move", () => {
    const state = makeState(emptyBoard());
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "easy");
    expect(move).not.toBeNull();
    expect(moves.some((m) => m.cellIndex === move!.cellIndex)).toBe(true);
  });

  it("hard bot picks immediate winning move", () => {
    // X has two in a row at [0,1], can win at [2]
    const board: TTTBoard = ["X", "X", null, "O", "O", null, null, null, null];
    const state = makeState(board);
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "hard");
    expect(move).not.toBeNull();
    expect(move!.cellIndex).toBe(2);
  });

  it("hard bot blocks opponent winning move", () => {
    // O at positions [3,4], needs 5 to win on middle row. X (bot) should block at 5.
    const board: TTTBoard = ["X", null, null, "O", "O", null, null, null, "X"];
    const state = makeState(board);
    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "hard");
    expect(move).not.toBeNull();
    // X should block O's winning move at cell 5 (middle row: 3,4,5)
    expect(move!.cellIndex).toBe(5);
  });
});

describe("minimax", () => {
  it("returns positive score for bot winning position", () => {
    const board: TTTBoard = ["X", "X", "X", null, "O", "O", null, null, null];
    const score = minimax(board, 0, true, "X");
    expect(score).toBeGreaterThan(0);
  });

  it("returns negative score for opponent winning position", () => {
    const board: TTTBoard = ["O", "O", "O", null, "X", "X", null, null, null];
    const score = minimax(board, 0, true, "X");
    expect(score).toBeLessThan(0);
  });

  it("returns 0 for draw position", () => {
    const board: TTTBoard = ["X", "O", "X", "X", "X", "O", "O", "X", "O"];
    const score = minimax(board, 0, true, "X");
    expect(score).toBe(0);
  });
});

describe("hard bot vs hard bot", () => {
  it("always draws when both play optimally", () => {
    // Play 10 games of hard vs hard
    for (let game = 0; game < 10; game++) {
      let state = createInitialState(PLAYERS);

      while (state.status === "playing") {
        const moves = getValidMoves(state);
        if (moves.length === 0) break;
        const move = selectBotMove(state, moves, "hard");
        if (!move) break;
        state = applyMove(state, move);
      }

      expect(state.isDraw).toBe(true);
      expect(state.winLine).toBeNull();
    }
  });
});
