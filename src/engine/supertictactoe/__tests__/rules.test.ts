import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { SuperTTTGameState, SuperTTTMove, SubBoard, MetaBoard } from "../types";
import {
  checkMetaWinner,
  isMetaBoardFull,
  isSubBoardPlayable,
  getValidMoves,
  applyMove,
} from "../rules";
import { createInitialState } from "../state";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
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

function makeMove(boardIndex: number, cellIndex: number, mark: "X" | "O" = "X"): SuperTTTMove {
  return {
    playerId: mark === "X" ? "p1" : "p2",
    color: mark === "X" ? "red" : "blue",
    timestamp: Date.now(),
    boardIndex,
    cellIndex,
    mark,
  };
}

// ---------------------------------------------------------------------------
// checkMetaWinner
// ---------------------------------------------------------------------------

describe("checkMetaWinner", () => {
  it("detects X winning top row", () => {
    const meta: MetaBoard = ["X", "X", "X", null, null, null, null, null, null];
    expect(checkMetaWinner(meta, "X")).toEqual([0, 1, 2]);
  });

  it("detects O winning left column", () => {
    const meta: MetaBoard = ["O", null, null, "O", null, null, "O", null, null];
    expect(checkMetaWinner(meta, "O")).toEqual([0, 3, 6]);
  });

  it("detects X winning main diagonal", () => {
    const meta: MetaBoard = ["X", null, null, null, "X", null, null, null, "X"];
    expect(checkMetaWinner(meta, "X")).toEqual([0, 4, 8]);
  });

  it("returns null when no winner", () => {
    const meta: MetaBoard = ["X", "O", null, null, null, null, null, null, null];
    expect(checkMetaWinner(meta, "X")).toBeNull();
    expect(checkMetaWinner(meta, "O")).toBeNull();
  });

  it("ignores drawn cells for win detection", () => {
    const meta: MetaBoard = ["X", "drawn", "X", null, null, null, null, null, null];
    expect(checkMetaWinner(meta, "X")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isMetaBoardFull / isSubBoardPlayable
// ---------------------------------------------------------------------------

describe("isMetaBoardFull", () => {
  it("returns false when cells are null", () => {
    const meta: MetaBoard = ["X", "O", "X", null, null, null, null, null, null];
    expect(isMetaBoardFull(meta)).toBe(false);
  });

  it("returns true when all cells decided", () => {
    const meta: MetaBoard = ["X", "O", "X", "O", "X", "drawn", "drawn", "O", "X"];
    expect(isMetaBoardFull(meta)).toBe(true);
  });
});

describe("isSubBoardPlayable", () => {
  it("returns true for null cells", () => {
    const meta: MetaBoard = [null, "X", null, null, null, null, null, null, null];
    expect(isSubBoardPlayable(meta, 0)).toBe(true);
  });

  it("returns false for won cells", () => {
    const meta: MetaBoard = [null, "X", null, null, null, null, null, null, null];
    expect(isSubBoardPlayable(meta, 1)).toBe(false);
  });

  it("returns false for drawn cells", () => {
    const meta: MetaBoard = [null, "drawn", null, null, null, null, null, null, null];
    expect(isSubBoardPlayable(meta, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getValidMoves
// ---------------------------------------------------------------------------

describe("getValidMoves", () => {
  it("returns moves from all boards when activeBoard is null (free pick)", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    // 9 boards × 9 cells = 81 possible moves
    expect(moves).toHaveLength(81);
  });

  it("restricts moves to activeBoard when set", () => {
    const state = makeState({ activeBoard: 4 });
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(9);
    expect(moves.every((m) => m.boardIndex === 4)).toBe(true);
  });

  it("gives free pick when activeBoard points to a decided board", () => {
    const meta: MetaBoard = [null, null, null, null, "X", null, null, null, null];
    const state = makeState({ activeBoard: 4, metaBoard: meta });
    const moves = getValidMoves(state);
    // Board 4 is decided, so free pick from remaining 8 boards × 9 cells = 72
    expect(moves).toHaveLength(72);
    expect(moves.every((m) => m.boardIndex !== 4)).toBe(true);
  });

  it("only offers empty cells in the active board", () => {
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    boards[2] = ["X", "O", "X", null, null, null, null, null, null];
    const state = makeState({ boards, activeBoard: 2 });
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(6);
    expect(moves.every((m) => m.boardIndex === 2)).toBe(true);
  });

  it("returns empty array when game is finished", () => {
    const state = makeState({ status: "finished" });
    expect(getValidMoves(state)).toHaveLength(0);
  });

  it("sets correct mark for current player (X for red)", () => {
    const state = makeState();
    const moves = getValidMoves(state);
    expect(moves[0].mark).toBe("X");
  });

  it("sets correct mark for second player (O for blue)", () => {
    const state = makeState({ currentPlayerIndex: 1, currentMark: "O" });
    const moves = getValidMoves(state);
    expect(moves[0].mark).toBe("O");
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("places mark on the correct sub-board cell", () => {
    const state = makeState();
    const result = applyMove(state, makeMove(0, 4, "X"));
    expect(result.boards[0][4]).toBe("X");
  });

  it("switches to next player", () => {
    const state = makeState();
    const result = applyMove(state, makeMove(0, 0, "X"));
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.currentMark).toBe("O");
  });

  it("increments turn number", () => {
    const state = makeState();
    const result = applyMove(state, makeMove(0, 0, "X"));
    expect(result.turnNumber).toBe(2);
  });

  it("sets activeBoard to the cellIndex of the move", () => {
    const state = makeState();
    // Playing in board 0, cell 5 → next must play in board 5
    const result = applyMove(state, makeMove(0, 5, "X"));
    expect(result.activeBoard).toBe(5);
  });

  it("sets activeBoard to null when cellIndex points to a decided board", () => {
    const meta: MetaBoard = [null, null, null, null, null, "X", null, null, null];
    const state = makeState({ metaBoard: meta });
    // Playing in board 0, cell 5 → board 5 is decided → free pick
    const result = applyMove(state, makeMove(0, 5, "X"));
    expect(result.activeBoard).toBeNull();
  });

  it("detects sub-board win and updates metaBoard", () => {
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    boards[0] = ["X", "X", null, null, null, null, null, null, null];
    const state = makeState({ boards });
    const result = applyMove(state, makeMove(0, 2, "X"));
    expect(result.metaBoard[0]).toBe("X");
    expect(result.subBoardWinLines[0]).toEqual([0, 1, 2]);
  });

  it("detects sub-board draw and marks metaBoard as drawn", () => {
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    // Board that will draw when cell 7 is filled (O): X O X / X X O / O _ X
    boards[3] = ["X", "O", "X", "X", "X", "O", "O", null, "X"];
    const state = makeState({ boards, currentPlayerIndex: 1, currentMark: "O" });
    const result = applyMove(state, makeMove(3, 7, "O"));
    expect(result.metaBoard[3]).toBe("drawn");
    expect(result.subBoardWinLines[3]).toBeNull();
  });

  it("detects meta-board win (game over)", () => {
    const meta: MetaBoard = ["X", "X", null, null, null, null, null, null, null];
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    // Board 2 almost won by X
    boards[2] = ["X", "X", null, null, null, null, null, null, null];
    const state = makeState({ boards, metaBoard: meta, activeBoard: 2 });
    const result = applyMove(state, makeMove(2, 2, "X"));
    expect(result.status).toBe("finished");
    expect(result.isDraw).toBe(false);
    expect(result.metaWinLine).toEqual([0, 1, 2]);
    expect(result.finishOrder[0]).toBe("p1");
  });

  it("detects meta-board draw (game over)", () => {
    // All sub-boards decided except board 8, which will draw
    const meta: MetaBoard = ["X", "O", "X", "O", "X", "O", "X", "O", null];
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    boards[8] = ["X", "O", "X", "X", "X", "O", "O", null, "X"];
    const state = makeState({ boards, metaBoard: meta, activeBoard: 8, currentPlayerIndex: 1, currentMark: "O" });
    const result = applyMove(state, makeMove(8, 7, "O"));
    expect(result.status).toBe("finished");
    expect(result.isDraw).toBe(true);
    expect(result.metaWinLine).toBeNull();
  });

  it("throws when placing on occupied cell", () => {
    const boards = Array.from({ length: 9 }, () => emptySubBoard());
    boards[0][0] = "X";
    const state = makeState({ boards });
    expect(() => applyMove(state, makeMove(0, 0, "X"))).toThrow("already occupied");
  });

  it("throws when playing in a decided board", () => {
    const meta: MetaBoard = ["X", null, null, null, null, null, null, null, null];
    const state = makeState({ metaBoard: meta });
    expect(() => applyMove(state, makeMove(0, 0, "X"))).toThrow("already decided");
  });

  it("does not modify the original state", () => {
    const state = makeState();
    const originalBoard0 = [...state.boards[0]];
    applyMove(state, makeMove(0, 4, "X"));
    expect(state.boards[0]).toEqual(originalBoard0);
  });
});
