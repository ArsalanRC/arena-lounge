/** Tests for bot AI — selectBotMove() and assessDanger() across all difficulty levels. */
import { describe, it, expect } from "vitest";
import { selectBotMove, assessDanger } from "../bot";
import { createInitialState } from "../state";
import type { LudoGameState, ValidMove, PiecePositions } from "../types";
import type { PlayerInfo } from "../../types";
import { HOME_POSITION, YARD_POSITION } from "../constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayers(count: 2 | 3 | 4 = 4): PlayerInfo[] {
  const colors = ["red", "blue", "green", "yellow"] as const;
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    color: colors[i],
    playerOrder: i,
  }));
}

function makeState(count: 2 | 3 | 4 = 4): LudoGameState {
  return createInitialState(makePlayers(count));
}

function setPiece(
  state: LudoGameState,
  color: "red" | "blue" | "green" | "yellow",
  pieceIndex: number,
  relativePos: number
): LudoGameState {
  const newPieces = { ...state.board.pieces };
  newPieces[color] = [...newPieces[color]] as PiecePositions;
  newPieces[color][pieceIndex] = relativePos;
  return { ...state, board: { pieces: newPieces } };
}

function makeMove(
  overrides: Partial<ValidMove> & Pick<ValidMove, "pieceIndex" | "from" | "to">
): ValidMove {
  return {
    playerId: "player-1",
    color: "red",
    timestamp: Date.now(),
    isCapture: false,
    isExitYard: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("selectBotMove", () => {
  it("returns null when validMoves is empty", () => {
    const state = makeState();
    expect(selectBotMove(state, [], "easy")).toBeNull();
    expect(selectBotMove(state, [], "medium")).toBeNull();
    expect(selectBotMove(state, [], "hard")).toBeNull();
  });

  it("returns the only move when there is exactly one", () => {
    const state = makeState();
    const move = makeMove({ pieceIndex: 0, from: 10, to: 14 });
    expect(selectBotMove(state, [move], "easy")).toBe(move);
    expect(selectBotMove(state, [move], "medium")).toBe(move);
    expect(selectBotMove(state, [move], "hard")).toBe(move);
  });

  it("easy always returns a valid move from the list", () => {
    const state = makeState();
    const moves = [
      makeMove({ pieceIndex: 0, from: 5, to: 10 }),
      makeMove({ pieceIndex: 1, from: 20, to: 25 }),
      makeMove({ pieceIndex: 2, from: YARD_POSITION, to: 0, isExitYard: true }),
    ];
    for (let i = 0; i < 20; i++) {
      const result = selectBotMove(state, moves, "easy");
      expect(moves).toContain(result);
    }
  });

  it("hard prefers captures over regular moves", () => {
    let state = makeState();
    // Place a blue piece where red can capture it
    state = setPiece(state, "blue", 0, 10);

    const regularMove = makeMove({ pieceIndex: 0, from: 5, to: 10 });
    const captureMove = makeMove({
      pieceIndex: 1,
      from: 3,
      to: 8,
      isCapture: true,
      capturedPiece: { color: "blue", pieceIndex: 0 },
    });

    const result = selectBotMove(state, [regularMove, captureMove], "hard");
    expect(result).toBe(captureMove);
  });

  it("hard prefers HOME over other moves", () => {
    const state = makeState();
    const regularMove = makeMove({ pieceIndex: 0, from: 5, to: 10 });
    const homeMove = makeMove({
      pieceIndex: 1,
      from: 56,
      to: HOME_POSITION,
    });

    const result = selectBotMove(state, [regularMove, homeMove], "hard");
    expect(result).toBe(homeMove);
  });

  it("all difficulties handle the same input without errors", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    state = setPiece(state, "red", 1, 25);
    state = setPiece(state, "blue", 0, 5);

    const moves = [
      makeMove({ pieceIndex: 0, from: 10, to: 15 }),
      makeMove({ pieceIndex: 1, from: 25, to: 30 }),
      makeMove({
        pieceIndex: 2,
        from: YARD_POSITION,
        to: 0,
        isExitYard: true,
      }),
    ];

    expect(() => selectBotMove(state, moves, "easy")).not.toThrow();
    expect(() => selectBotMove(state, moves, "medium")).not.toThrow();
    expect(() => selectBotMove(state, moves, "hard")).not.toThrow();
  });
});

describe("assessDanger", () => {
  it("returns 0 for pieces in yard or home column", () => {
    const state = makeState();
    expect(assessDanger(state, "red", YARD_POSITION)).toBe(0);
    expect(assessDanger(state, "red", 55)).toBe(0);
  });

  it("returns 0 on safe positions", () => {
    let state = makeState();
    // Place an opponent piece 3 cells behind safe pos abs=8 (red relative=8)
    state = setPiece(state, "blue", 0, 5); // blue abs = 5+13=18, not threatening abs=8
    expect(assessDanger(state, "red", 8)).toBe(0);
  });

  it("detects threats from opponent pieces within 6 cells", () => {
    let state = makeState();
    // Red piece at relative 10 → absolute 10
    // Place blue piece so it can reach absolute 10 in 1-6 moves
    // Blue relative 49 → absolute (49+13)%52 = 10. So dice=0 is not valid.
    // Blue relative 46 → absolute (46+13)%52 = 7. Dice 3 → abs 10. Threat!
    state = setPiece(state, "blue", 0, 46);
    const danger = assessDanger(state, "red", 10);
    expect(danger).toBeGreaterThanOrEqual(1);
  });
});
