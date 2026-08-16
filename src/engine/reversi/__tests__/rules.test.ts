/** Reversi rules tests — placement legality, flips, pass/end-of-game, scoring. */

import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { ReversiCell, ReversiGameState } from "../types";
import { SIZE } from "../constants";
import { createInitialState } from "../state";
import { applyMove, getFlipsFor, getLegalMoves, hasLegalMove, score } from "../rules";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

/** Build a custom game state from a raw board string for readability in tests.
 *  '.' = empty, 'B' = black, 'W' = white. String must be 64 chars, row-major. */
function boardFrom(src: string): ReversiCell[][] {
  const cells = src.replace(/\s+/g, "");
  if (cells.length !== SIZE * SIZE) throw new Error("board string must be 64 chars");
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
  return {
    ...createInitialState(PLAYERS),
    board,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Initial position
// ---------------------------------------------------------------------------

describe("initial position", () => {
  it("starts with exactly 4 discs — 2 black, 2 white", () => {
    const state = createInitialState(PLAYERS);
    const { black, white } = score(state.board);
    expect(black).toBe(2);
    expect(white).toBe(2);
  });

  it("places black at (3,4) and (4,3), white at (3,3) and (4,4)", () => {
    const state = createInitialState(PLAYERS);
    expect(state.board[3][3]).toBe("white");
    expect(state.board[3][4]).toBe("black");
    expect(state.board[4][3]).toBe("black");
    expect(state.board[4][4]).toBe("white");
  });

  it("black moves first (currentPlayerIndex === 0)", () => {
    const state = createInitialState(PLAYERS);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("black has exactly 4 legal opening moves", () => {
    const state = createInitialState(PLAYERS);
    const moves = getLegalMoves(state);
    expect(moves).toHaveLength(4);
  });

  it("opening legal moves are the 4 flanking squares", () => {
    const state = createInitialState(PLAYERS);
    const moves = getLegalMoves(state);
    const keys = new Set(moves.map(({ r, c }) => `${r},${c}`));
    expect(keys.has("2,3")).toBe(true); // above d4
    expect(keys.has("3,2")).toBe(true); // left of c4
    expect(keys.has("4,5")).toBe(true); // right of e5
    expect(keys.has("5,4")).toBe(true); // below e5
  });
});

// ---------------------------------------------------------------------------
// getFlipsFor
// ---------------------------------------------------------------------------

describe("getFlipsFor", () => {
  it("returns empty for an occupied square", () => {
    const state = createInitialState(PLAYERS);
    // (3,3) is occupied by white.
    expect(getFlipsFor(state.board, "black", 3, 3)).toHaveLength(0);
  });

  it("returns empty for a square with no flanks", () => {
    const state = createInitialState(PLAYERS);
    // Corner (0,0) — nothing adjacent.
    expect(getFlipsFor(state.board, "black", 0, 0)).toHaveLength(0);
  });

  it("correctly finds flips in horizontal direction", () => {
    // Row of whites between two blacks — place black at col 5, flip cols 2,3,4.
    const board = boardFrom(
      "........" +
      "........" +
      "........" +
      "BWWW...." +
      "........" +
      "........" +
      "........" +
      "........"
    );
    // Black at (3,0) already; place black at (3,4) to flip (3,1),(3,2),(3,3).
    const flips = getFlipsFor(board, "black", 3, 4);
    const keys = new Set(flips.map(([r, c]) => `${r},${c}`));
    expect(keys.has("3,1")).toBe(true);
    expect(keys.has("3,2")).toBe(true);
    expect(keys.has("3,3")).toBe(true);
    expect(flips).toHaveLength(3);
  });

  it("correctly finds flips in vertical direction", () => {
    const board = boardFrom(
      "....B..." +
      "....W..." +
      "....W..." +
      "....W..." +
      "........" +
      "........" +
      "........" +
      "........"
    );
    const flips = getFlipsFor(board, "black", 4, 4);
    const keys = new Set(flips.map(([r, c]) => `${r},${c}`));
    expect(keys.has("1,4")).toBe(true);
    expect(keys.has("2,4")).toBe(true);
    expect(keys.has("3,4")).toBe(true);
    expect(flips).toHaveLength(3);
  });

  it("correctly finds flips in diagonal direction", () => {
    const board = boardFrom(
      "B......." +
      ".W......" +
      "..W....." +
      "........" +
      "........" +
      "........" +
      "........" +
      "........"
    );
    const flips = getFlipsFor(board, "black", 3, 3);
    const keys = new Set(flips.map(([r, c]) => `${r},${c}`));
    expect(keys.has("1,1")).toBe(true);
    expect(keys.has("2,2")).toBe(true);
    expect(flips).toHaveLength(2);
  });

  it("collects flips from multiple directions simultaneously", () => {
    // Classic opening: black places at (2,3) to flip (3,3).
    const state = createInitialState(PLAYERS);
    const flips = getFlipsFor(state.board, "black", 2, 3);
    // Should flip (3,3) which is white.
    expect(flips).toHaveLength(1);
    expect(flips[0]).toEqual([3, 3]);
  });

  it("does not flip if run ends at board edge without friendly disc", () => {
    // White run up to the edge — no black disc to anchor.
    const board = boardFrom(
      "....W..." +
      "....W..." +
      "....W..." +
      "....W..." +
      "........" +
      "........" +
      "........" +
      "........"
    );
    const flips = getFlipsFor(board, "black", 4, 4);
    // Only flips if a friendly disc is beyond the run — none here.
    expect(flips).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyMove — placement
// ---------------------------------------------------------------------------

describe("applyMove — place", () => {
  it("places a disc and flips enemies", () => {
    const state = createInitialState(PLAYERS);
    const move = {
      kind: "place" as const,
      row: 2,
      col: 3,
      playerId: "p1",
      color: "red" as const,
      timestamp: 0,
    };
    const next = applyMove(state, move);
    expect(next.board[2][3]).toBe("black");
    // (3,3) was white — it should flip.
    expect(next.board[3][3]).toBe("black");
  });

  it("advances to the opponent's turn after a placement", () => {
    const state = createInitialState(PLAYERS);
    const move = {
      kind: "place" as const,
      row: 2,
      col: 3,
      playerId: "p1",
      color: "red" as const,
      timestamp: 0,
    };
    const next = applyMove(state, move);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.passCount).toBe(0);
  });

  it("records lastMove coordinates", () => {
    const state = createInitialState(PLAYERS);
    const move = {
      kind: "place" as const,
      row: 4,
      col: 5,
      playerId: "p1",
      color: "red" as const,
      timestamp: 0,
    };
    const next = applyMove(state, move);
    expect(next.lastMove).toEqual({ r: 4, c: 5 });
  });

  it("throws on an illegal placement (no flips)", () => {
    const state = createInitialState(PLAYERS);
    expect(() =>
      applyMove(state, {
        kind: "place",
        row: 0,
        col: 0,
        playerId: "p1",
        color: "red",
        timestamp: 0,
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyMove — pass
// ---------------------------------------------------------------------------

describe("applyMove — pass", () => {
  it("increments passCount and switches player", () => {
    const state = createInitialState(PLAYERS);
    const passMove = {
      kind: "pass" as const,
      playerId: "p1",
      color: "red" as const,
      timestamp: 0,
    };
    const next = applyMove(state, passMove);
    expect(next.passCount).toBe(1);
    expect(next.currentPlayerIndex).toBe(1);
  });

  it("ends the game when both players pass consecutively", () => {
    const state = createInitialState(PLAYERS);
    const pass = (s: ReversiGameState, idx: number) =>
      applyMove(s, {
        kind: "pass",
        playerId: s.players[idx].id,
        color: s.players[idx].color,
        timestamp: 0,
      });

    const after1 = pass(state, 0);
    expect(after1.status).toBe("playing");

    const after2 = pass(after1, 1);
    expect(after2.status).toBe("finished");
  });
});

// ---------------------------------------------------------------------------
// Scoring and winner detection
// ---------------------------------------------------------------------------

describe("score + end-of-game", () => {
  it("score counts all discs correctly", () => {
    const state = createInitialState(PLAYERS);
    const { black, white } = score(state.board);
    expect(black).toBe(2);
    expect(white).toBe(2);
  });

  it("declares the disc-majority player as winner", () => {
    // Black dominates — 3 black, 1 white after double-pass.
    const board = boardFrom(
      "........" +
      "........" +
      "........" +
      "...BBB.." +
      "...B...." +
      "...W...." +
      "........" +
      "........"
    );
    const state = stateWith(board, { passCount: 1, currentPlayerIndex: 1 });
    const result = applyMove(state, {
      kind: "pass",
      playerId: "p2",
      color: "blue",
      timestamp: 0,
    });
    expect(result.status).toBe("finished");
    // Black (p1) should be first in finishOrder.
    expect(result.finishOrder[0]).toBe("p1");
  });

  it("detects a draw when both players have equal disc counts", () => {
    // Equal board — 2 black, 2 white, both pass.
    const state = stateWith(createInitialState(PLAYERS).board, { passCount: 1, currentPlayerIndex: 1 });
    const result = applyMove(state, {
      kind: "pass",
      playerId: "p2",
      color: "blue",
      timestamp: 0,
    });
    expect(result.status).toBe("finished");
    // Both players appear in finishOrder.
    expect(result.finishOrder).toContain("p1");
    expect(result.finishOrder).toContain("p2");
  });
});

// ---------------------------------------------------------------------------
// hasLegalMove
// ---------------------------------------------------------------------------

describe("hasLegalMove", () => {
  it("returns true for black at the opening position", () => {
    const state = createInitialState(PLAYERS);
    expect(hasLegalMove(state.board, "black")).toBe(true);
  });

  it("returns false when a colour is completely surrounded", () => {
    // A board where black has no legal moves.
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
    expect(hasLegalMove(board, "black")).toBe(false);
  });
});
