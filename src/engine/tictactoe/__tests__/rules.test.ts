import { describe, it, expect } from "vitest";
import type { TTTBoard, TTTGameState, TTTMove } from "../types";
import { checkWinner, isBoardFull, getValidMoves, applyMove, WIN_LINES } from "../rules";
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

describe("checkWinner", () => {
  it("detects X win on top row", () => {
    const board: TTTBoard = ["X", "X", "X", null, null, null, null, null, null];
    expect(checkWinner(board, "X")).toEqual([0, 1, 2]);
  });

  it("detects O win on middle row", () => {
    const board: TTTBoard = [null, null, null, "O", "O", "O", null, null, null];
    expect(checkWinner(board, "O")).toEqual([3, 4, 5]);
  });

  it("detects X win on bottom row", () => {
    const board: TTTBoard = [null, null, null, null, null, null, "X", "X", "X"];
    expect(checkWinner(board, "X")).toEqual([6, 7, 8]);
  });

  it("detects X win on left column", () => {
    const board: TTTBoard = ["X", null, null, "X", null, null, "X", null, null];
    expect(checkWinner(board, "X")).toEqual([0, 3, 6]);
  });

  it("detects O win on center column", () => {
    const board: TTTBoard = [null, "O", null, null, "O", null, null, "O", null];
    expect(checkWinner(board, "O")).toEqual([1, 4, 7]);
  });

  it("detects X win on right column", () => {
    const board: TTTBoard = [null, null, "X", null, null, "X", null, null, "X"];
    expect(checkWinner(board, "X")).toEqual([2, 5, 8]);
  });

  it("detects X win on main diagonal", () => {
    const board: TTTBoard = ["X", null, null, null, "X", null, null, null, "X"];
    expect(checkWinner(board, "X")).toEqual([0, 4, 8]);
  });

  it("detects O win on anti-diagonal", () => {
    const board: TTTBoard = [null, null, "O", null, "O", null, "O", null, null];
    expect(checkWinner(board, "O")).toEqual([2, 4, 6]);
  });

  it("returns null when no winner", () => {
    const board: TTTBoard = ["X", "O", "X", null, null, null, null, null, null];
    expect(checkWinner(board, "X")).toBeNull();
    expect(checkWinner(board, "O")).toBeNull();
  });

  it("covers all 8 win lines", () => {
    expect(WIN_LINES).toHaveLength(8);
  });
});

describe("isBoardFull", () => {
  it("returns false for empty board", () => {
    expect(isBoardFull(emptyBoard())).toBe(false);
  });

  it("returns false for partial board", () => {
    const board: TTTBoard = ["X", "O", null, null, null, null, null, null, null];
    expect(isBoardFull(board)).toBe(false);
  });

  it("returns true for full board", () => {
    const board: TTTBoard = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(isBoardFull(board)).toBe(true);
  });
});

describe("getValidMoves", () => {
  it("returns all 9 moves for empty board", () => {
    const state = makeState(emptyBoard());
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(9);
  });

  it("returns only empty cells", () => {
    const board: TTTBoard = ["X", "O", null, null, "X", null, null, null, "O"];
    const state = makeState(board);
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(5);
    const indices = moves.map((m) => m.cellIndex);
    expect(indices).toEqual([2, 3, 5, 6, 7]);
  });

  it("returns empty array when game is finished", () => {
    const board: TTTBoard = ["X", "X", "X", "O", "O", null, null, null, null];
    const state = makeState(board, { status: "finished" });
    expect(getValidMoves(state)).toHaveLength(0);
  });

  it("sets correct mark for current player", () => {
    const state = makeState(emptyBoard());
    const moves = getValidMoves(state);
    expect(moves[0].mark).toBe("X"); // red goes first
  });
});

describe("applyMove", () => {
  it("places mark on the board", () => {
    const state = makeState(emptyBoard());
    const move: TTTMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      cellIndex: 4,
      mark: "X",
    };
    const result = applyMove(state, move);
    expect(result.board[4]).toBe("X");
  });

  it("switches to next player after move", () => {
    const state = makeState(emptyBoard());
    const move: TTTMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      cellIndex: 0,
      mark: "X",
    };
    const result = applyMove(state, move);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.currentMark).toBe("O");
  });

  it("detects win", () => {
    const board: TTTBoard = ["X", "X", null, "O", "O", null, null, null, null];
    const state = makeState(board);
    const move: TTTMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      cellIndex: 2,
      mark: "X",
    };
    const result = applyMove(state, move);
    expect(result.status).toBe("finished");
    expect(result.winLine).toEqual([0, 1, 2]);
    expect(result.isDraw).toBe(false);
    expect(result.finishOrder[0]).toBe("p1");
  });

  it("detects draw", () => {
    // Board: X O X / X X O / O _ X  -> placing O at index 7 fills it, no winner
    const board: TTTBoard = ["X", "O", "X", "X", "X", "O", "O", null, "X"];
    const state = makeState(board, { currentPlayerIndex: 1, currentMark: "O" });
    const move: TTTMove = {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      cellIndex: 7,
      mark: "O",
    };
    const result = applyMove(state, move);
    expect(result.status).toBe("finished");
    expect(result.isDraw).toBe(true);
    expect(result.winLine).toBeNull();
  });

  it("throws when placing on occupied cell", () => {
    const board: TTTBoard = ["X", null, null, null, null, null, null, null, null];
    const state = makeState(board);
    const move: TTTMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      cellIndex: 0,
      mark: "X",
    };
    expect(() => applyMove(state, move)).toThrow("already occupied");
  });

  it("increments turn number", () => {
    const state = makeState(emptyBoard());
    const move: TTTMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      cellIndex: 0,
      mark: "X",
    };
    const result = applyMove(state, move);
    expect(result.turnNumber).toBe(2);
  });
});
