/** Tests for game rules — movement, captures, safe positions, home entry, bonus turns, win detection, and double dice mode. */
import { describe, it, expect } from "vitest";
import { getValidMoves, applyMove, checkCapture, rollDice, handleNoValidMoves, rollDoubleDice, selectDie } from "../rules";
import { createInitialState } from "../state";
import type { LudoGameState, PiecePositions } from "../types";
import type { PlayerInfo } from "../../types";
import {
  YARD_POSITION,
  HOME_POSITION,
} from "../constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Place a specific piece at a relative position for a color */
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
// Leaving the yard
// ---------------------------------------------------------------------------

describe("Leaving the yard", () => {
  it("should allow moving a piece out of yard on a 6", () => {
    const state = makeState();
    const moves = getValidMoves(state, "red", 6);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.isExitYard)).toBe(true);
    expect(moves[0].from).toBe(YARD_POSITION);
    expect(moves[0].to).toBe(0);
  });

  it("should NOT allow leaving yard on non-6 roll", () => {
    const state = makeState();
    for (const dice of [1, 2, 3, 4, 5]) {
      const moves = getValidMoves(state, "red", dice);
      expect(moves.length).toBe(0);
    }
  });

  it("should generate 4 exit moves when all pieces are in yard and dice is 6", () => {
    const state = makeState();
    const moves = getValidMoves(state, "red", 6);
    // All 4 pieces can exit, but they all go to position 0
    // So we should have 4 moves (one per piece)
    expect(moves.length).toBe(4);
    expect(moves.every((m) => m.to === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Basic movement on track
// ---------------------------------------------------------------------------

describe("Basic movement on track", () => {
  it("should move a piece forward by dice value", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 0);
    const moves = getValidMoves(state, "red", 3);
    const trackMove = moves.find((m) => m.pieceIndex === 0);
    expect(trackMove).toBeDefined();
    expect(trackMove!.from).toBe(0);
    expect(trackMove!.to).toBe(3);
  });

  it("should generate moves for pieces on track AND exit moves on a 6", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    const moves = getValidMoves(state, "red", 6);
    // Piece 0 can move from 10 to 16
    const trackMove = moves.find((m) => m.pieceIndex === 0 && m.from === 10);
    expect(trackMove).toBeDefined();
    expect(trackMove!.to).toBe(16);
    // Pieces 1-3 can exit yard
    const exitMoves = moves.filter((m) => m.isExitYard);
    expect(exitMoves.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

describe("Captures", () => {
  it("should capture an opponent piece on a non-safe cell", () => {
    let state = makeState();
    // Red piece at position 5, Blue piece at absolute position...
    // Red pos 10 (relative) = absolute 10
    // Blue at relative X such that absolute = 10
    // Blue absolute = (X + 13) % 52 = 10 => X = -3 + 52 = 49
    state = setPiece(state, "red", 0, 5);
    state = setPiece(state, "blue", 0, 49); // Blue at absolute (49+13)%52 = 10
    // Red moves from 5 to 10 (dice = 5)
    // Absolute position 10 = (10 + 0) % 52 = 10
    // Blue absolute = (49 + 13) % 52 = 62 % 52 = 10
    const moves = getValidMoves(state, "red", 5);
    const captureMove = moves.find((m) => m.pieceIndex === 0 && m.isCapture);
    expect(captureMove).toBeDefined();
    expect(captureMove!.capturedPiece).toEqual({ color: "blue", pieceIndex: 0 });
  });

  it("should NOT capture on safe positions", () => {
    let state = makeState();
    // Safe position 8 (absolute). Red relative 8 = absolute 8.
    state = setPiece(state, "red", 0, 3);
    // Place blue at absolute 8. Blue relative = (8 - 13 + 52) % 52 = 47
    state = setPiece(state, "blue", 0, 47);
    const moves = getValidMoves(state, "red", 5);
    const moveToSafe = moves.find((m) => m.pieceIndex === 0 && m.to === 8);
    expect(moveToSafe).toBeDefined();
    expect(moveToSafe!.isCapture).toBe(false);
  });

  it("should NOT capture on start positions (safe)", () => {
    let state = makeState();
    // Blue start = absolute 13. Red relative 13 = absolute 13.
    state = setPiece(state, "red", 0, 8);
    // Blue at relative 0 = absolute 13 (Blue's start)
    state = setPiece(state, "blue", 0, 0);
    const moves = getValidMoves(state, "red", 5);
    const moveToStart = moves.find((m) => m.pieceIndex === 0 && m.to === 13);
    expect(moveToStart).toBeDefined();
    expect(moveToStart!.isCapture).toBe(false);
  });

  it("should send captured piece back to yard when move is applied", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 5);
    state = setPiece(state, "blue", 0, 49); // Blue abs = 10

    const moves = getValidMoves(state, "red", 5);
    const captureMove = moves.find((m) => m.pieceIndex === 0 && m.isCapture)!;

    // Apply dice roll first
    state = { ...state, currentDiceValue: 5, hasRolled: true, turnPhase: "move", validMoves: moves };
    const newState = applyMove(state, captureMove);

    expect(newState.board.pieces.red[0]).toBe(10);
    expect(newState.board.pieces.blue[0]).toBe(YARD_POSITION);
  });
});

// ---------------------------------------------------------------------------
// Home column and HOME
// ---------------------------------------------------------------------------

describe("Home column movement", () => {
  it("should allow moving into home column", () => {
    let state = makeState();
    // Red at relative 49, dice 3 → position 52 (first home column cell)
    state = setPiece(state, "red", 0, 49);
    const moves = getValidMoves(state, "red", 3);
    const homeMove = moves.find((m) => m.pieceIndex === 0);
    expect(homeMove).toBeDefined();
    expect(homeMove!.to).toBe(52);
  });

  it("should allow moving within home column", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 53);
    const moves = getValidMoves(state, "red", 2);
    const homeMove = moves.find((m) => m.pieceIndex === 0);
    expect(homeMove).toBeDefined();
    expect(homeMove!.to).toBe(55);
  });

  it("should allow exact roll to reach HOME (58)", () => {
    let state = makeState();
    // Red at position 54 (in home column), needs exactly 4 to reach 58
    state = setPiece(state, "red", 0, 54);
    const moves = getValidMoves(state, "red", 4);
    const homeMove = moves.find((m) => m.pieceIndex === 0);
    expect(homeMove).toBeDefined();
    expect(homeMove!.to).toBe(HOME_POSITION);
  });

  it("should NOT allow overshooting HOME", () => {
    let state = makeState();
    // Red at position 56 (in home column), needs exactly 2 to reach 58
    state = setPiece(state, "red", 0, 56);
    // Dice = 3 would overshoot (56 + 3 = 59 > 58)
    const moves = getValidMoves(state, "red", 3);
    const homeMove = moves.find((m) => m.pieceIndex === 0);
    expect(homeMove).toBeUndefined();
  });

  it("should NOT allow captures in home column", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 53);
    const captureResult = checkCapture(state, "red", 53);
    expect(captureResult).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rolling 6 rules
// ---------------------------------------------------------------------------

describe("Rolling 6 — extra turn", () => {
  it("should grant extra turn on rolling 6", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 0);

    // Roll 6, move piece
    state = { ...state, currentDiceValue: 6, hasRolled: true, consecutiveSixes: 0 };
    const moves = getValidMoves(state, "red", 6);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const move = moves.find((m) => m.pieceIndex === 0 && m.from === 0)!;
    const newState = applyMove(state, move);

    // Same player should still be current (extra turn for rolling 6)
    expect(newState.currentPlayerIndex).toBe(0); // red is still current
    expect(newState.consecutiveSixes).toBe(1);
  });

  it("should bust on triple 6 and advance to next player", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 0);

    // Simulate 2 consecutive sixes already
    state = {
      ...state,
      consecutiveSixes: 2,
      currentDiceValue: 6,
      hasRolled: true,
    };
    const moves = getValidMoves(state, "red", 6);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const move = moves.find((m) => m.pieceIndex === 0)!;
    const newState = applyMove(state, move);

    // Should advance to next player (blue) due to triple-6 bust
    expect(newState.currentPlayerIndex).toBe(1); // blue's turn
    expect(newState.consecutiveSixes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Capture grants extra turn
// ---------------------------------------------------------------------------

describe("Capture — extra turn", () => {
  it("should grant extra turn when capturing an opponent piece", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 5);
    state = setPiece(state, "blue", 0, 49); // Blue abs = (49+13)%52 = 10 = Red abs 10

    state = {
      ...state,
      currentDiceValue: 5,
      hasRolled: true,
      consecutiveSixes: 0,
      currentPlayerIndex: 0,
    };

    const moves = getValidMoves(state, "red", 5);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const captureMove = moves.find((m) => m.pieceIndex === 0 && m.isCapture)!;
    expect(captureMove).toBeDefined();

    const newState = applyMove(state, captureMove);

    // Red should keep the turn (extra turn for capture)
    expect(newState.currentPlayerIndex).toBe(0);
    expect(newState.consecutiveSixes).toBe(0);
    // Blue piece should be back in yard
    expect(newState.board.pieces.blue[0]).toBe(YARD_POSITION);
  });

  it("should NOT grant extra turn for a non-capture move on non-6", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 5);

    state = {
      ...state,
      currentDiceValue: 3,
      hasRolled: true,
      consecutiveSixes: 0,
      currentPlayerIndex: 0,
    };

    const moves = getValidMoves(state, "red", 3);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const move = moves.find((m) => m.pieceIndex === 0)!;
    const newState = applyMove(state, move);

    // Should advance to blue
    expect(newState.currentPlayerIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Win detection
// ---------------------------------------------------------------------------

describe("Win detection", () => {
  it("should detect when all pieces reach HOME", () => {
    let state = makeState();
    // Put 3 red pieces at HOME, 1 nearly there
    state = setPiece(state, "red", 0, HOME_POSITION);
    state = setPiece(state, "red", 1, HOME_POSITION);
    state = setPiece(state, "red", 2, HOME_POSITION);
    state = setPiece(state, "red", 3, 56); // 2 away from HOME

    state = {
      ...state,
      currentDiceValue: 2,
      hasRolled: true,
      currentPlayerIndex: 0,
    };

    const moves = getValidMoves(state, "red", 2);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const lastMove = moves.find((m) => m.pieceIndex === 3)!;
    expect(lastMove.to).toBe(HOME_POSITION);

    const newState = applyMove(state, lastMove);
    expect(newState.finishOrder).toContain("player-1");
  });

  it("should end the game when all but one player finishes", () => {
    let state = makeState(); // 2 players: red and blue

    // All red pieces at HOME
    state = setPiece(state, "red", 0, HOME_POSITION);
    state = setPiece(state, "red", 1, HOME_POSITION);
    state = setPiece(state, "red", 2, HOME_POSITION);
    state = setPiece(state, "red", 3, 56);
    state = { ...state, currentDiceValue: 2, hasRolled: true, currentPlayerIndex: 0 };

    const moves = getValidMoves(state, "red", 2);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const finalMove = moves.find((m) => m.pieceIndex === 3)!;
    const newState = applyMove(state, finalMove);

    expect(newState.status).toBe("finished");
    expect(newState.finishOrder[0]).toBe("player-1"); // red won
  });
});

// ---------------------------------------------------------------------------
// No valid moves
// ---------------------------------------------------------------------------

describe("No valid moves", () => {
  it("should have no moves when all pieces in yard and dice is not 6", () => {
    const state = makeState();
    const moves = getValidMoves(state, "red", 3);
    expect(moves.length).toBe(0);
  });

  it("should advance to next player via handleNoValidMoves", () => {
    const state = makeState();
    const rolled = rollDice(state, 3);
    expect(rolled.validMoves.length).toBe(0);

    const newState = handleNoValidMoves(rolled);
    expect(newState.currentPlayerIndex).toBe(1); // blue's turn
    expect(newState.hasRolled).toBe(false);
    expect(newState.turnPhase).toBe("roll");
  });
});

// ---------------------------------------------------------------------------
// rollDice
// ---------------------------------------------------------------------------

describe("rollDice", () => {
  it("should set dice value and compute valid moves", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    const rolled = rollDice(state, 4);

    expect(rolled.currentDiceValue).toBe(4);
    expect(rolled.hasRolled).toBe(true);
    expect(rolled.turnPhase).toBe("move");
    expect(rolled.validMoves.length).toBeGreaterThan(0);
  });

  it("should set turnPhase to roll when no moves available", () => {
    const state = makeState(); // all in yard
    const rolled = rollDice(state, 3); // can't exit yard
    expect(rolled.turnPhase).toBe("roll"); // no moves, stays in roll phase
    expect(rolled.validMoves.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("should skip finished players when determining next player", () => {
    let state = makeState(3); // red, blue, green

    // Red finished
    state = setPiece(state, "red", 0, HOME_POSITION);
    state = setPiece(state, "red", 1, HOME_POSITION);
    state = setPiece(state, "red", 2, HOME_POSITION);
    state = setPiece(state, "red", 3, HOME_POSITION);
    state = { ...state, finishOrder: ["player-1"], currentPlayerIndex: 0 };

    // Blue has a piece on track
    state = setPiece(state, "blue", 0, 10);
    state = {
      ...state,
      currentDiceValue: 3,
      hasRolled: true,
      currentPlayerIndex: 1, // Blue's turn
    };

    const moves = getValidMoves(state, "blue", 3);
    state = { ...state, turnPhase: "move", validMoves: moves };

    const move = moves.find((m) => m.pieceIndex === 0)!;
    const newState = applyMove(state, move);

    // Should skip red (finished) and go to green
    expect(newState.currentPlayerIndex).toBe(2); // green
  });

  it("should handle 4 players correctly", () => {
    const state = makeState(4);
    expect(state.players.length).toBe(4);
    expect(state.players[0].color).toBe("red");
    expect(state.players[1].color).toBe("blue");
    expect(state.players[2].color).toBe("green");
    expect(state.players[3].color).toBe("yellow");
  });

  it("pieces at HOME should not generate moves", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, HOME_POSITION);
    const moves = getValidMoves(state, "red", 6);
    const homeMoves = moves.filter((m) => m.pieceIndex === 0);
    expect(homeMoves.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Double Dice Mode
// ---------------------------------------------------------------------------

function makeDoubleState(count: 2 | 3 | 4 = 2): LudoGameState {
  return createInitialState(makePlayers(count), { diceMode: "double" });
}

describe("rollDoubleDice", () => {
  it("should compute moves for both dice with dieIndex tags", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    const rolled = rollDoubleDice(state, [3, 4]);
    expect(rolled.hasRolled).toBe(true);
    expect(rolled.turnPhase).toBe("move");
    expect(rolled.doubleDice).not.toBeNull();
    // Should have moves tagged with dieIndex 0 (dice=3) and 1 (dice=4)
    const die0Moves = rolled.validMoves.filter((m) => m.dieIndex === 0);
    const die1Moves = rolled.validMoves.filter((m) => m.dieIndex === 1);
    expect(die0Moves.length).toBeGreaterThan(0);
    expect(die1Moves.length).toBeGreaterThan(0);
  });

  it("should deduplicate identical dice — only offer die 0 moves initially", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    const rolled = rollDoubleDice(state, [4, 4]);
    // Only die 0 moves (identical dice)
    const die0Moves = rolled.validMoves.filter((m) => m.dieIndex === 0);
    const die1Moves = rolled.validMoves.filter((m) => m.dieIndex === 1);
    expect(die0Moves.length).toBeGreaterThan(0);
    expect(die1Moves.length).toBe(0);
    // Auto-selected die 0
    expect(rolled.doubleDice!.activeDieIndex).toBe(0);
    expect(rolled.currentDiceValue).toBe(4);
  });

  it("should bust on third consecutive double-six", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 0);
    state = { ...state, consecutiveSixes: 2 };
    const rolled = rollDoubleDice(state, [6, 6]);
    // Should advance to next player, no moves
    expect(rolled.currentPlayerIndex).toBe(1); // blue
    expect(rolled.consecutiveSixes).toBe(0);
    expect(rolled.validMoves.length).toBe(0);
    expect(rolled.doubleDice).toBeNull();
  });

  it("should auto-skip when no valid moves for either die", () => {
    const state = makeDoubleState(); // all pieces in yard
    const rolled = rollDoubleDice(state, [3, 4]); // can't exit yard with 3 or 4
    expect(rolled.validMoves.length).toBe(0);
    expect(rolled.turnPhase).toBe("roll");
  });

  it("should allow yard exit with a 6 on one die", () => {
    const state = makeDoubleState(); // all in yard
    const rolled = rollDoubleDice(state, [6, 3]);
    // Die 0 (value=6) should have yard exit moves, die 1 (value=3) should have none from yard
    const die0Moves = rolled.validMoves.filter((m) => m.dieIndex === 0);
    const die1Moves = rolled.validMoves.filter((m) => m.dieIndex === 1);
    expect(die0Moves.length).toBeGreaterThan(0);
    expect(die0Moves.every((m) => m.isExitYard)).toBe(true);
    expect(die1Moves.length).toBe(0);
  });
});

describe("selectDie", () => {
  it("should filter moves to selected die and set currentDiceValue", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    state = rollDoubleDice(state, [3, 5]);
    // Before selecting, activeDieIndex is null (dice are different)
    expect(state.doubleDice!.activeDieIndex).toBeNull();

    const selected = selectDie(state, 1); // select die with value 5
    expect(selected.doubleDice!.activeDieIndex).toBe(1);
    expect(selected.currentDiceValue).toBe(5);
    expect(selected.validMoves.every((m) => m.dieIndex === 1)).toBe(true);
  });

  it("should reject selecting an already-used die", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    state = rollDoubleDice(state, [3, 5]);
    // Mark die 0 as used
    state = {
      ...state,
      doubleDice: { ...state.doubleDice!, diceUsed: [true, false] },
    };
    const selected = selectDie(state, 0);
    // Should be unchanged (die 0 already used)
    expect(selected.doubleDice!.activeDieIndex).toBe(state.doubleDice!.activeDieIndex);
  });
});

describe("applyMove — double dice, partial turn", () => {
  it("should stay in move phase after first die used with moves remaining", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    state = setPiece(state, "red", 1, 20);
    state = rollDoubleDice(state, [3, 5]);
    state = selectDie(state, 0); // select die 0 (value 3)

    const move = state.validMoves.find((m) => m.pieceIndex === 0)!;
    const newState = applyMove(state, move);

    // Should still be red's turn, in move phase
    expect(newState.currentPlayerIndex).toBe(0);
    expect(newState.turnPhase).toBe("move");
    // Die 1 should be auto-selected
    expect(newState.doubleDice!.activeDieIndex).toBe(1);
    expect(newState.doubleDice!.diceUsed).toEqual([true, false]);
    expect(newState.currentDiceValue).toBe(5);
  });

  it("should auto-skip remaining die if no valid moves after first move", () => {
    let state = makeDoubleState();
    // Only one piece on track — after moving it into home column, second die may have no moves
    state = setPiece(state, "red", 0, 50); // close to home
    state = rollDoubleDice(state, [2, 5]); // die0=2 → pos 52, die1=5 → pos 55
    state = selectDie(state, 0);

    const move = state.validMoves.find((m) => m.pieceIndex === 0)!;
    expect(move.to).toBe(52);
    const newState = applyMove(state, move);

    // Piece is now at 52 (home column). Die 1 (value 5) → 52+5=57 which is valid
    expect(newState.turnPhase).toBe("move");
    expect(newState.doubleDice!.activeDieIndex).toBe(1);
  });
});

describe("applyMove — double dice, both used", () => {
  it("should grant extra turn on double sixes (6-6)", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 0);
    state = setPiece(state, "red", 1, 10);
    state = { ...state, consecutiveSixes: 0 };
    state = rollDoubleDice(state, [6, 6]);
    // Identical dice → auto-select die 0
    expect(state.doubleDice!.activeDieIndex).toBe(0);

    // Make first move (die 0)
    const move1 = state.validMoves.find((m) => m.pieceIndex === 0)!;
    state = applyMove(state, move1);
    expect(state.turnPhase).toBe("move");

    // Make second move (die 1)
    const move2 = state.validMoves.find((m) => m.pieceIndex === 1)!;
    state = applyMove(state, move2);

    // Should stay on red (extra turn for 6-6)
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.consecutiveSixes).toBe(1);
    expect(state.turnPhase).toBe("roll");
    expect(state.doubleDice).toBeNull();
  });

  it("should grant bonus turn on capture during double dice turn", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 5);
    state = setPiece(state, "red", 1, 20);
    state = setPiece(state, "blue", 0, 49); // Blue abs = (49+13)%52 = 10 = Red abs 10
    state = rollDoubleDice(state, [5, 3]); // die0=5 captures at red pos 10
    state = selectDie(state, 0);

    const captureMove = state.validMoves.find((m) => m.pieceIndex === 0 && m.isCapture)!;
    expect(captureMove).toBeDefined();
    state = applyMove(state, captureMove);

    // First die used, captured — now use second die
    expect(state.doubleDice!.capturedDuringTurn).toBe(true);
    const move2 = state.validMoves.find((m) => m.pieceIndex === 1)!;
    state = applyMove(state, move2);

    // Should stay on red (bonus turn for capture)
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnPhase).toBe("roll");
  });

  it("should advance to next player when no captures and no double sixes", () => {
    let state = makeDoubleState();
    state = setPiece(state, "red", 0, 10);
    state = setPiece(state, "red", 1, 20);
    state = rollDoubleDice(state, [3, 4]);
    state = selectDie(state, 0);

    const move1 = state.validMoves.find((m) => m.pieceIndex === 0)!;
    state = applyMove(state, move1);

    const move2 = state.validMoves[0]!;
    state = applyMove(state, move2);

    // Should advance to blue
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnPhase).toBe("roll");
  });
});

describe("handleNoValidMoves — double dice", () => {
  it("should reset doubleDice to null", () => {
    let state = makeDoubleState();
    state = {
      ...state,
      doubleDice: {
        diceValues: [3, 4],
        diceUsed: [false, false],
        activeDieIndex: null,
        capturedDuringTurn: false,
      },
    };
    const newState = handleNoValidMoves(state);
    expect(newState.doubleDice).toBeNull();
    expect(newState.currentPlayerIndex).toBe(1);
  });
});

describe("backward compatibility — single mode", () => {
  it("should default to single dice mode", () => {
    const state = makeState();
    expect(state.diceMode).toBe("single");
    expect(state.doubleDice).toBeNull();
  });

  it("all existing single mode logic is unchanged via rollDice", () => {
    let state = makeState();
    state = setPiece(state, "red", 0, 10);
    const rolled = rollDice(state, 4);
    expect(rolled.currentDiceValue).toBe(4);
    expect(rolled.turnPhase).toBe("move");
    expect(rolled.doubleDice).toBeNull();
  });
});
