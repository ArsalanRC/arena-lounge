import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { ConnectFourGameState, ConnectFourCell } from "../types";
import { ROWS, COLS } from "../constants";
import { createInitialState } from "../state";
import { applyMove, getLegalMoves } from "../rules";
import { getBotMove } from "../bot";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function emptyState(): ConnectFourGameState {
  return createInitialState(PLAYERS);
}

function stateWithBoard(
  build: (board: ConnectFourCell[][]) => void,
  overrides: Partial<ConnectFourGameState> = {}
): ConnectFourGameState {
  const base = emptyState();
  const board: ConnectFourCell[][] = Array.from({ length: ROWS }, () =>
    Array<ConnectFourCell>(COLS).fill("empty")
  );
  build(board);
  return { ...base, board, ...overrides };
}

// ---------------------------------------------------------------------------

describe("getBotMove — legal move", () => {
  it("easy returns a legal move on the opening board", () => {
    const state = emptyState();
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "easy");
    expect(move).not.toBeNull();
    expect(legal.some((m) => m.column === move!.column)).toBe(true);
  });

  it("medium returns a legal move on the opening board", () => {
    const state = emptyState();
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "medium");
    expect(move).not.toBeNull();
    expect(legal.some((m) => m.column === move!.column)).toBe(true);
  });

  it("hard returns a legal move on the opening board", () => {
    const state = emptyState();
    const legal = getLegalMoves(state);
    const move = getBotMove(state, "hard");
    expect(move).not.toBeNull();
    expect(legal.some((m) => m.column === move!.column)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("getBotMove — tactical correctness", () => {
  it("medium blocks an immediate opponent 4-in-a-row", () => {
    // Red (yellow disc, player 1) has 3-in-a-row on the bottom: cols 0,1,2.
    // It is currently red's turn (player 1, yellow disc).
    // But we want to test blue (red disc, player 2) blocking.
    // Set up: yellow has 3 on bottom row cols 0,1,2; it's red-disc (player 2) turn.
    const state = stateWithBoard(
      (b) => {
        b[5][0] = "yellow";
        b[5][1] = "yellow";
        b[5][2] = "yellow";
      },
      { currentPlayerIndex: 1, currentDisc: "red" }
    );
    const move = getBotMove(state, "medium");
    expect(move).not.toBeNull();
    // Bot must block column 3 (or column -1 side if 3 is the winning slot)
    expect(move!.column).toBe(3);
  });

  it("hard takes an immediate winning move", () => {
    // Red disc (player 2) has 3-in-a-row on row 5 cols 4,5,6; winning move is col 3.
    const state = stateWithBoard(
      (b) => {
        b[5][4] = "red";
        b[5][5] = "red";
        b[5][6] = "red";
      },
      { currentPlayerIndex: 1, currentDisc: "red" }
    );
    const move = getBotMove(state, "hard");
    expect(move).not.toBeNull();
    expect(move!.column).toBe(3);
  });
});

// ---------------------------------------------------------------------------

describe("getBotMove — robustness", () => {
  it("returns null on finished game (no legal moves)", () => {
    // Fill the board completely to create a draw scenario
    const state = stateWithBoard(
      (b) => {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            b[r][c] = (r + c) % 2 === 0 ? "yellow" : "red";
          }
        }
      },
      { status: "finished" }
    );
    const move = getBotMove(state, "medium");
    expect(move).toBeNull();
  });

  it("does not crash on a nearly-full board (hard)", () => {
    // Fill all but one cell
    const state = stateWithBoard((b) => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!(r === 0 && c === 0)) {
            b[r][c] = (r + c) % 2 === 0 ? "yellow" : "red";
          }
        }
      }
    });
    expect(() => getBotMove(state, "hard")).not.toThrow();
  });

  it("plays 20 ply without crashing (medium)", () => {
    let state = emptyState();
    for (let i = 0; i < 20; i++) {
      if (state.status !== "playing") break;
      const move = getBotMove(state, "medium");
      if (!move) break;
      state = applyMove(state, move);
    }
    // Board is a valid Connect Four state
    expect(state.board.length).toBe(ROWS);
    expect(state.board[0].length).toBe(COLS);
  }, 30_000);
});
