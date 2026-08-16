/** Tests for move/roll validation — validateMove() and validateRoll() integrity checks. */
import { describe, it, expect } from "vitest";
import { validateMove, validateRoll, validMoveToLudoMove } from "../validation";
import { createInitialState } from "../state";
import { rollDice } from "../rules";
import type { LudoGameState, LudoMove, PiecePositions } from "../types";
import type { PlayerInfo } from "../../types";

function makePlayers(count: 2 | 3 | 4 = 2): PlayerInfo[] {
  const colors = ["red", "blue", "green", "yellow"] as const;
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    color: colors[i],
    playerOrder: i,
  }));
}

function makeState(count: 2 | 3 | 4 = 2): LudoGameState {
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

// ---------------------------------------------------------------------------
// validateRoll
// ---------------------------------------------------------------------------

describe("validateRoll", () => {
  it("should allow current player to roll", () => {
    const state = makeState();
    const result = validateRoll(state, "player-1");
    expect(result.valid).toBe(true);
  });

  it("should reject roll from wrong player", () => {
    const state = makeState();
    const result = validateRoll(state, "player-2");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Not your turn");
  });

  it("should reject roll when already rolled", () => {
    let state = makeState();
    state = { ...state, hasRolled: true };
    const result = validateRoll(state, "player-1");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Already rolled this turn");
  });

  it("should reject roll when game not playing", () => {
    let state = makeState();
    state = { ...state, status: "finished" };
    const result = validateRoll(state, "player-1");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Game is not in playing state");
  });

  it("should reject roll when not in roll phase", () => {
    let state = makeState();
    state = { ...state, turnPhase: "move" };
    const result = validateRoll(state, "player-1");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Not in roll phase");
  });
});

// ---------------------------------------------------------------------------
// validateMove
// ---------------------------------------------------------------------------

describe("validateMove", () => {
  it("should accept a valid move", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    state = rollDice(state, 4);

    const validMove = state.validMoves.find((m) => m.pieceIndex === 0)!;
    const ludoMove = validMoveToLudoMove(validMove, 4);

    const result = validateMove(state, ludoMove);
    expect(result.valid).toBe(true);
  });

  it("should reject move when game is not playing", () => {
    let state = makeState();
    state = { ...state, status: "finished" };
    const move: LudoMove = {
      playerId: "player-1",
      color: "red",
      timestamp: Date.now(),
      pieceIndex: 0,
      from: 0,
      to: 3,
      diceValue: 3,
      isCapture: false,
    };
    const result = validateMove(state, move);
    expect(result.valid).toBe(false);
  });

  it("should reject move from wrong player", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    state = rollDice(state, 4);

    const move: LudoMove = {
      playerId: "player-2", // blue, not red
      color: "blue",
      timestamp: Date.now(),
      pieceIndex: 0,
      from: 10,
      to: 14,
      diceValue: 4,
      isCapture: false,
    };
    const result = validateMove(state, move);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Not your turn");
  });

  it("should reject move with wrong dice value", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    state = rollDice(state, 4);

    const validMove = state.validMoves.find((m) => m.pieceIndex === 0)!;
    const ludoMove = validMoveToLudoMove(validMove, 5); // wrong dice

    const result = validateMove(state, ludoMove);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Dice value mismatch");
  });

  it("should reject move not in valid moves list", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    state = rollDice(state, 4);

    const move: LudoMove = {
      playerId: "player-1",
      color: "red",
      timestamp: Date.now(),
      pieceIndex: 0,
      from: 10,
      to: 20, // wrong destination
      diceValue: 4,
      isCapture: false,
    };
    const result = validateMove(state, move);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid move — not in valid moves list");
  });

  it("should reject move when dice not rolled", () => {
    const state = makeState();
    const move: LudoMove = {
      playerId: "player-1",
      color: "red",
      timestamp: Date.now(),
      pieceIndex: 0,
      from: -1,
      to: 0,
      diceValue: 6,
      isCapture: false,
    };
    const result = validateMove(state, move);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Dice has not been rolled yet");
  });
});
