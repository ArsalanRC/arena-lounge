/**
 * Server-side move validation for Ludo.
 * Ensures the client-submitted move is legal.
 *
 * In double dice mode, additionally validates that the selected dieIndex
 * has not already been used and that its value matches the submitted diceValue.
 */

import type { LudoGameState, ValidMove, LudoMove } from "./types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a submitted move is legal given the current game state.
 */
export function validateMove(
  state: LudoGameState,
  move: LudoMove
): ValidationResult {
  // 1. Game must be in playing state
  if (state.status !== "playing") {
    return { valid: false, error: "Game is not in playing state" };
  }

  // 2. Must be the correct player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (move.playerId !== currentPlayer.id) {
    return { valid: false, error: "Not your turn" };
  }

  if (move.color !== currentPlayer.color) {
    return { valid: false, error: "Color mismatch" };
  }

  // 3. Dice must have been rolled
  if (!state.hasRolled || state.currentDiceValue === null) {
    return { valid: false, error: "Dice has not been rolled yet" };
  }

  // 4. Dice value must match
  if (move.diceValue !== state.currentDiceValue) {
    return { valid: false, error: "Dice value mismatch" };
  }

  // 4b. Double dice: validate dieIndex
  if (state.diceMode === "double" && state.doubleDice && move.dieIndex != null) {
    if (state.doubleDice.diceUsed[move.dieIndex]) {
      return { valid: false, error: "Die already used" };
    }
    if (state.doubleDice.diceValues[move.dieIndex] !== move.diceValue) {
      return { valid: false, error: "Dice value does not match selected die" };
    }
  }

  // 5. Turn phase must be "move"
  if (state.turnPhase !== "move") {
    return { valid: false, error: "Not in move phase" };
  }

  // 6. The move must be in the valid moves list
  const isValidMove = state.validMoves.some(
    (vm) =>
      vm.pieceIndex === move.pieceIndex &&
      vm.from === move.from &&
      vm.to === move.to
  );

  if (!isValidMove) {
    return { valid: false, error: "Invalid move — not in valid moves list" };
  }

  return { valid: true };
}

/**
 * Validate a dice roll request.
 */
export function validateRoll(
  state: LudoGameState,
  playerId: string
): ValidationResult {
  if (state.status !== "playing") {
    return { valid: false, error: "Game is not in playing state" };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (playerId !== currentPlayer.id) {
    return { valid: false, error: "Not your turn" };
  }

  if (state.hasRolled) {
    return { valid: false, error: "Already rolled this turn" };
  }

  if (state.turnPhase !== "roll") {
    return { valid: false, error: "Not in roll phase" };
  }

  return { valid: true };
}

/**
 * Convert a ValidMove to a LudoMove (adding dice value).
 */
export function validMoveToLudoMove(
  validMove: ValidMove,
  diceValue: number
): LudoMove {
  return {
    playerId: validMove.playerId,
    color: validMove.color,
    timestamp: validMove.timestamp,
    pieceIndex: validMove.pieceIndex,
    from: validMove.from,
    to: validMove.to,
    diceValue,
    isCapture: validMove.isCapture,
    capturedPiece: validMove.capturedPiece,
  };
}
