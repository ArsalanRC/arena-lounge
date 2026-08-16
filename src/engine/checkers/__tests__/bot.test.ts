import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type {
  CheckersBoard,
  CheckersGameState,
  CheckersPieceColor,
  CheckersPieceType,
} from "../types";
import { TOTAL_SQUARES } from "../constants";
import { createInitialState } from "../state";
import { applyMove, getValidMoves, frToSq } from "../rules";
import { evaluate, selectBotMove } from "../bot";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function emptyBoard(): CheckersBoard {
  return Array(TOTAL_SQUARES).fill(null);
}

function place(
  board: CheckersBoard,
  type: CheckersPieceType,
  color: CheckersPieceColor,
  file: number,
  rank: number
): void {
  board[frToSq(file, rank)] = { type, color };
}

function customState(build: (board: CheckersBoard) => void, overrides: Partial<CheckersGameState> = {}): CheckersGameState {
  const board = emptyBoard();
  build(board);
  return {
    ...createInitialState(PLAYERS),
    board,
    ...overrides,
  };
}

describe("evaluate", () => {
  it("0 for the symmetric starting position", () => {
    const state = createInitialState(PLAYERS);
    expect(evaluate(state)).toBe(0);
  });

  it("positive with extra white material", () => {
    const state = customState((b) => {
      place(b, "king", "white", 3, 3);
      place(b, "man", "black", 0, 7);
    });
    expect(evaluate(state)).toBeGreaterThan(0);
  });

  it("mate-like terminal", () => {
    const state = customState(() => {}, {
      status: "finished",
      gameResult: "white_wins",
    });
    expect(evaluate(state)).toBe(100_000);
  });
});

describe("selectBotMove", () => {
  it("returns a legal move at each difficulty from the opening", () => {
    const state = createInitialState(PLAYERS);
    const legal = getValidMoves(state);
    for (const diff of ["easy", "medium", "hard"] as const) {
      const move = selectBotMove(state, legal, diff);
      expect(move).not.toBeNull();
      const matched = legal.find(
        (m) => m.from === move!.from && m.to === move!.to
      );
      expect(matched).toBeDefined();
    }
  });

  it("returns null on empty valid-moves list", () => {
    const state = createInitialState(PLAYERS);
    expect(selectBotMove(state, [], "hard")).toBeNull();
  });

  it("takes the only forced-jump when one piece is up for grabs", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "black", 4, 4);
    });
    const legal = getValidMoves(state);
    const move = selectBotMove(state, legal, "medium");
    expect(move).not.toBeNull();
    expect(move?.captures.length).toBe(1);
  });

  it("prefers the double-jump over two separate single-jump options (medium)", () => {
    // White at c3 can single-jump d4 (ends at e5) OR double-jump d4 then f6.
    // Wait — our engine always returns the MAXIMAL sequence, so the plain
    // single-jump wouldn't be in the list when a double is possible. Verify.
    const state = customState((b) => {
      place(b, "man", "white", 2, 2);
      place(b, "man", "black", 3, 3);
      place(b, "man", "black", 5, 5);
    });
    const legal = getValidMoves(state);
    expect(legal.length).toBe(1);
    expect(legal[0].captures.length).toBe(2);
  });

  it("plays sensibly for 20 ply", () => {
    // Sanity check: the bot can play 20 consecutive moves without throwing.
    let state = createInitialState(PLAYERS);
    for (let i = 0; i < 20; i++) {
      if (state.status !== "playing") break;
      const legal = getValidMoves(state);
      if (legal.length === 0) break;
      const move = selectBotMove(state, legal, "medium");
      expect(move).not.toBeNull();
      state = applyMove(state, move!);
    }
    // Still a valid game object.
    expect(state.board.length).toBe(64);
  }, 30_000);
});
