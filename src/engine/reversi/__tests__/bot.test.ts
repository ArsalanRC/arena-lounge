/** Reversi bot tests — each difficulty returns legal moves; strategic sanity checks. */

import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { ReversiCell, ReversiGameState } from "../types";
import { SIZE } from "../constants";
import { createInitialState } from "../state";
import { applyMove, getLegalMoves, score } from "../rules";
import { getBotMove } from "../bot";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function boardFrom(src: string): ReversiCell[][] {
  const cells = src.replace(/\s+/g, "");
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => {
      const ch = cells[r * SIZE + c];
      if (ch === "B") return "black";
      if (ch === "W") return "white";
      return "empty";
    })
  );
}

function stateWith(
  board: ReversiCell[][],
  overrides: Partial<ReversiGameState> = {}
): ReversiGameState {
  return { ...createInitialState(PLAYERS), board, ...overrides };
}

describe("getBotMove — easy", () => {
  it("returns a legal placement from the opening position", () => {
    const state = createInitialState(PLAYERS);
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "easy");
    expect(move.kind).toBe("place");
    const isLegal = legal.some((m) => m.r === move.row && m.c === move.col);
    expect(isLegal).toBe(true);
  });

  it("returns a pass when no legal placement exists", () => {
    // Force a state where black has no moves.
    const board = boardFrom(
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWB"
    );
    const state = stateWith(board);
    const move = getBotMove(state, "easy");
    expect(move.kind).toBe("pass");
  });
});

describe("getBotMove — medium", () => {
  it("returns a legal placement from the opening position", () => {
    const state = createInitialState(PLAYERS);
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "medium");
    expect(move.kind).toBe("place");
    const isLegal = legal.some((m) => m.r === move.row && m.c === move.col);
    expect(isLegal).toBe(true);
  });

  it("passes when no legal placement exists", () => {
    const board = boardFrom(
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWB"
    );
    const state = stateWith(board);
    expect(getBotMove(state, "medium").kind).toBe("pass");
  });
});

describe("getBotMove — hard", () => {
  it("returns a legal placement from the opening position", () => {
    const state = createInitialState(PLAYERS);
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "hard");
    expect(move.kind).toBe("place");
    const isLegal = legal.some((m) => m.r === move.row && m.c === move.col);
    expect(isLegal).toBe(true);
  });

  it("grabs a corner when one is immediately available", () => {
    // Board where black can place at corner (0,0).
    // There is a white disc at (0,1) and a black disc at (0,2) —
    // so placing black at (0,0) would flip (0,1).
    // Also adding extra discs to ensure the position is legal.
    const board = boardFrom(
      ".WB....." +
      "........" +
      "........" +
      "........" +
      "........" +
      "........" +
      "........" +
      "........"
    );
    const state = stateWith(board);
    const move = getBotMove(state, "hard");
    // The hard bot should identify the corner (0,0) as the best move.
    expect(move.kind).toBe("place");
    expect(move.row).toBe(0);
    expect(move.col).toBe(0);
  });

  it("passes when no legal placement exists", () => {
    const board = boardFrom(
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWW" +
      "WWWWWWWB"
    );
    const state = stateWith(board);
    expect(getBotMove(state, "hard").kind).toBe("pass");
  });

  it("can play a full game to completion without throwing", () => {
    let state = createInitialState(PLAYERS);
    let maxTurns = 200;
    while (state.status === "playing" && maxTurns-- > 0) {
      const move = getBotMove(state, "hard");
      state = applyMove(state, move);
    }
    expect(state.status).toBe("finished");
    const { black, white } = score(state.board);
    expect(black + white).toBeGreaterThan(0);
  }, 30_000);
});
