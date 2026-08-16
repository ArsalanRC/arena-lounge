/**
 * Ludo game rules — pure functions for move validation, captures, and win detection.
 * No side effects, no external dependencies beyond engine types/constants.
 *
 * Supports two dice modes:
 *   Single — rollDice() + applyMove() (original flow)
 *   Double — rollDoubleDice() + selectDie() + applyMove() × 2 (partial turns)
 *
 * Double dice rules:
 *   - Roll two dice, make two separate moves per turn
 *   - Any 6 exits yard; double sixes (6-6) grant extra turn
 *   - Third consecutive 6-6 = bust (turn forfeited at roll time)
 *   - Capture on either die grants bonus turn after both dice consumed
 *   - Identical dice auto-select die 0 (skip die selection step)
 */

import type { PlayerColor } from "../types";
import type { LudoGameState, ValidMove, PiecePositions, DoubleDiceState } from "./types";
import {
  YARD_POSITION,
  HOME_POSITION,
  HOME_COLUMN_START,
  PIECES_PER_PLAYER,
  SAFE_POSITIONS,
  relativeToAbsolute,
} from "./constants";

// ---------------------------------------------------------------------------
// getValidMoves — compute all legal moves for the current player
// ---------------------------------------------------------------------------

export function getValidMoves(
  state: LudoGameState,
  color: PlayerColor,
  diceValue: number
): ValidMove[] {
  const pieces = state.board.pieces[color];
  const player = state.players.find((p) => p.color === color);
  if (!player) return [];

  const moves: ValidMove[] = [];

  for (let pieceIndex = 0; pieceIndex < PIECES_PER_PLAYER; pieceIndex++) {
    const from = pieces[pieceIndex];

    // Skip pieces already HOME
    if (from === HOME_POSITION) continue;

    // --- Piece in yard: can only exit on a 6 ---
    if (from === YARD_POSITION) {
      if (diceValue === 6) {
        const to = 0; // relative start position
        const capture = checkCapture(state, color, to);
        moves.push({
          playerId: player.id,
          color,
          timestamp: Date.now(),
          pieceIndex,
          from: YARD_POSITION,
          to,
          isCapture: capture !== null,
          capturedPiece: capture ?? undefined,
          isExitYard: true,
        });
      }
      continue;
    }

    // --- Piece on shared track (0–51) ---
    if (from >= 0 && from <= 51) {
      const newPos = from + diceValue;

      // Can enter home column?
      if (newPos >= HOME_COLUMN_START && newPos <= HOME_POSITION) {
        // Moving into home column or to HOME — exact roll needed for HOME
        moves.push({
          playerId: player.id,
          color,
          timestamp: Date.now(),
          pieceIndex,
          from,
          to: newPos,
          isCapture: false,
          isExitYard: false,
        });
      } else if (newPos < HOME_COLUMN_START) {
        // Still on shared track
        const capture = checkCapture(state, color, newPos);
        moves.push({
          playerId: player.id,
          color,
          timestamp: Date.now(),
          pieceIndex,
          from,
          to: newPos,
          isCapture: capture !== null,
          capturedPiece: capture ?? undefined,
          isExitYard: false,
        });
      }
      // else newPos > HOME_POSITION → overshot, invalid move (skip)
      continue;
    }

    // --- Piece in home column (52–57) ---
    if (from >= HOME_COLUMN_START && from < HOME_POSITION) {
      const newPos = from + diceValue;
      if (newPos <= HOME_POSITION) {
        moves.push({
          playerId: player.id,
          color,
          timestamp: Date.now(),
          pieceIndex,
          from,
          to: newPos,
          isCapture: false,
          isExitYard: false,
        });
      }
      // else overshot HOME → invalid (skip)
    }
  }

  return moves;
}

// ---------------------------------------------------------------------------
// checkCapture — determine if landing on a position captures an opponent piece
// ---------------------------------------------------------------------------

export function checkCapture(
  state: LudoGameState,
  movingColor: PlayerColor,
  relativePosition: number
): { color: PlayerColor; pieceIndex: number } | null {
  // Can't capture in home column or HOME
  if (relativePosition >= HOME_COLUMN_START) return null;

  // Convert to absolute to check against other players
  const absolutePos = relativeToAbsolute(relativePosition, movingColor);

  // Can't capture on safe positions
  if (SAFE_POSITIONS.includes(absolutePos)) return null;

  // Check all other players' pieces
  for (const player of state.players) {
    if (player.color === movingColor) continue;

    const theirPieces = state.board.pieces[player.color];
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      const theirRelPos = theirPieces[i];

      // Skip pieces in yard, home column, or HOME
      if (theirRelPos === YARD_POSITION || theirRelPos >= HOME_COLUMN_START) continue;

      // Convert their relative position to absolute
      const theirAbsPos = relativeToAbsolute(theirRelPos, player.color);

      if (theirAbsPos === absolutePos) {
        return { color: player.color, pieceIndex: i };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// applyMove — return a new state after applying a move
// ---------------------------------------------------------------------------

export function applyMove(state: LudoGameState, move: ValidMove): LudoGameState {
  // Deep clone the state
  const newState: LudoGameState = {
    ...state,
    board: {
      pieces: {
        red: [...state.board.pieces.red] as PiecePositions,
        blue: [...state.board.pieces.blue] as PiecePositions,
        green: [...state.board.pieces.green] as PiecePositions,
        yellow: [...state.board.pieces.yellow] as PiecePositions,
      },
    },
    finishOrder: [...state.finishOrder],
    validMoves: [],
  };

  // Move the piece
  newState.board.pieces[move.color][move.pieceIndex] = move.to;

  // Handle capture — send captured piece back to yard
  if (move.isCapture && move.capturedPiece) {
    newState.board.pieces[move.capturedPiece.color][move.capturedPiece.pieceIndex] =
      YARD_POSITION;
  }

  // Check if this player has all pieces HOME
  const allHome = newState.board.pieces[move.color].every((p) => p === HOME_POSITION);
  if (allHome && !newState.finishOrder.includes(move.playerId)) {
    newState.finishOrder.push(move.playerId);
  }

  // Check if game is over (all but one player finished, or only one player remains)
  const activePlayers = newState.players.filter(
    (p) => !newState.finishOrder.includes(p.id)
  );

  if (activePlayers.length <= 1) {
    // Add the last remaining player to finish order
    if (activePlayers.length === 1 && !newState.finishOrder.includes(activePlayers[0].id)) {
      newState.finishOrder.push(activePlayers[0].id);
    }
    newState.status = "finished";
    return newState;
  }

  // --- Double dice mode: partial turn handling ---
  if (state.diceMode === "double" && state.doubleDice) {
    const dd = state.doubleDice;
    const usedIndex = move.dieIndex ?? (dd.diceUsed[0] ? 1 : 0);
    const newDiceUsed: [boolean, boolean] = [...dd.diceUsed];
    newDiceUsed[usedIndex] = true;
    const didCapture = move.isCapture && !!move.capturedPiece;
    const reachedHome = move.to === HOME_POSITION;
    // Track captures and home arrivals together — both grant bonus turns
    const capturedDuringTurn = dd.capturedDuringTurn || didCapture || reachedHome;

    // Check if both dice are now used
    const bothUsed = newDiceUsed[0] && newDiceUsed[1];

    if (!bothUsed) {
      // One die remains — recompute moves for remaining die
      const remainingIndex = newDiceUsed[0] ? 1 : 0;
      const remainingValue = dd.diceValues[remainingIndex];
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      const remainingMoves = getValidMoves(newState, currentPlayer.color, remainingValue)
        .map((m) => ({ ...m, dieIndex: remainingIndex as 0 | 1 }));

      if (remainingMoves.length > 0) {
        // Stay in move phase with remaining die auto-selected
        newState.doubleDice = {
          diceValues: dd.diceValues,
          diceUsed: newDiceUsed,
          activeDieIndex: remainingIndex as 0 | 1,
          capturedDuringTurn,
        };
        newState.currentDiceValue = remainingValue;
        newState.validMoves = remainingMoves;
        newState.turnPhase = "move";
        return newState;
      }
      // No moves for remaining die — treat as both used
    }

    // Both dice consumed (or remaining die has no moves) — evaluate turn advancement
    const bothSixes = dd.diceValues[0] === 6 && dd.diceValues[1] === 6;

    if (bothSixes) {
      const newConsecutiveSixes = state.consecutiveSixes + 1;
      if (newConsecutiveSixes >= 3) {
        newState.consecutiveSixes = 0;
        newState.currentPlayerIndex = getNextPlayerIndex(newState);
      } else {
        newState.consecutiveSixes = newConsecutiveSixes;
      }
    } else if (capturedDuringTurn) {
      newState.consecutiveSixes = 0;
    } else {
      newState.consecutiveSixes = 0;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
    }

    newState.turnNumber = state.turnNumber + 1;
    newState.currentDiceValue = null;
    newState.hasRolled = false;
    newState.turnPhase = "roll";
    newState.doubleDice = null;
    return newState;
  }

  // --- Single dice mode: existing logic ---
  const diceValue = state.currentDiceValue ?? 0;
  const rolledSix = diceValue === 6;
  const didCapture = move.isCapture && !!move.capturedPiece;
  const reachedHome = move.to === HOME_POSITION;

  if (rolledSix) {
    const newConsecutiveSixes = state.consecutiveSixes + 1;

    if (newConsecutiveSixes >= 3) {
      // Triple six bust — lose turn, advance to next player
      newState.consecutiveSixes = 0;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
    } else {
      // Extra turn for rolling 6 (stay on same player)
      newState.consecutiveSixes = newConsecutiveSixes;
    }
  } else if (didCapture || reachedHome) {
    // Extra turn for capturing an opponent's piece or reaching HOME
    newState.consecutiveSixes = 0;
  } else {
    // Normal roll — advance to next player
    newState.consecutiveSixes = 0;
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
  }

  // Reset turn state for next turn
  newState.turnNumber = state.turnNumber + 1;
  newState.currentDiceValue = null;
  newState.hasRolled = false;
  newState.turnPhase = "roll";

  return newState;
}

// ---------------------------------------------------------------------------
// getNextPlayerIndex — find the next active player (skip finished players)
// ---------------------------------------------------------------------------

export function getNextPlayerIndex(state: LudoGameState): number {
  const numPlayers = state.players.length;
  let nextIndex = (state.currentPlayerIndex + 1) % numPlayers;

  // Skip players who have finished (all pieces HOME)
  for (let i = 0; i < numPlayers; i++) {
    const player = state.players[nextIndex];
    if (!state.finishOrder.includes(player.id)) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % numPlayers;
  }

  // Shouldn't happen if game isn't over, but fallback
  return state.currentPlayerIndex;
}

// ---------------------------------------------------------------------------
// checkWinCondition — returns the winner's player ID if the game is over
// ---------------------------------------------------------------------------

export function checkWinCondition(state: LudoGameState): string | null {
  if (state.finishOrder.length > 0 && state.status === "finished") {
    return state.finishOrder[0]; // First player to finish wins
  }
  return null;
}

// ---------------------------------------------------------------------------
// handleNoValidMoves — advance to next player when no moves are possible
// ---------------------------------------------------------------------------

export function handleNoValidMoves(state: LudoGameState): LudoGameState {
  return {
    ...state,
    consecutiveSixes: 0,
    currentPlayerIndex: getNextPlayerIndex(state),
    currentDiceValue: null,
    hasRolled: false,
    turnPhase: "roll",
    turnNumber: state.turnNumber + 1,
    validMoves: [],
    doubleDice: null,
  };
}

// ---------------------------------------------------------------------------
// rollDice — apply a dice roll to the state and compute valid moves
// ---------------------------------------------------------------------------

export function rollDice(state: LudoGameState, diceValue: number): LudoGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const validMoves = getValidMoves(state, currentPlayer.color, diceValue);

  return {
    ...state,
    currentDiceValue: diceValue,
    hasRolled: true,
    turnPhase: validMoves.length > 0 ? "move" : "roll",
    validMoves,
  };
}

// ---------------------------------------------------------------------------
// rollDoubleDice — roll two dice and compute valid moves for double dice mode
// ---------------------------------------------------------------------------

/**
 * Roll two dice in double dice mode and compute valid moves.
 * Handles bust detection (third consecutive 6-6), identical dice deduplication,
 * and auto-skip when neither die has valid moves.
 */
export function rollDoubleDice(
  state: LudoGameState,
  diceValues: [number, number]
): LudoGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Bust check: third consecutive double-six
  const bothSixes = diceValues[0] === 6 && diceValues[1] === 6;
  if (bothSixes && state.consecutiveSixes >= 2) {
    // Third consecutive 6-6 — bust, skip turn entirely
    return {
      ...state,
      currentDiceValue: null,
      hasRolled: false,
      consecutiveSixes: 0,
      currentPlayerIndex: getNextPlayerIndex(state),
      turnPhase: "roll",
      turnNumber: state.turnNumber + 1,
      validMoves: [],
      doubleDice: null,
    };
  }

  // Compute moves for each die
  const moves0 = getValidMoves(state, currentPlayer.color, diceValues[0])
    .map((m) => ({ ...m, dieIndex: 0 as const }));
  const moves1 = diceValues[0] === diceValues[1]
    ? [] // identical dice — only offer moves for die 0 first (die 1 after die 0 used)
    : getValidMoves(state, currentPlayer.color, diceValues[1])
        .map((m) => ({ ...m, dieIndex: 1 as const }));

  const allMoves = [...moves0, ...moves1];

  if (allMoves.length === 0) {
    // No valid moves for either die — auto-skip
    return {
      ...state,
      currentDiceValue: null,
      hasRolled: true,
      turnPhase: "roll",
      validMoves: [],
      doubleDice: {
        diceValues,
        diceUsed: [true, true],
        activeDieIndex: null,
        capturedDuringTurn: false,
      },
    };
  }

  // If dice are identical, auto-select die 0
  const autoSelect = diceValues[0] === diceValues[1] ? 0 : null;

  const doubleDice: DoubleDiceState = {
    diceValues,
    diceUsed: [false, false],
    activeDieIndex: autoSelect as 0 | 1 | null,
    capturedDuringTurn: false,
  };

  return {
    ...state,
    currentDiceValue: autoSelect !== null ? diceValues[0] : null,
    hasRolled: true,
    turnPhase: "move",
    validMoves: autoSelect !== null ? moves0 : allMoves,
    doubleDice,
  };
}

// ---------------------------------------------------------------------------
// selectDie — player selects which die to use in double dice mode
// ---------------------------------------------------------------------------

/** Select which die to use in double dice mode. Filters validMoves to that die's value. */
export function selectDie(state: LudoGameState, dieIndex: 0 | 1): LudoGameState {
  if (!state.doubleDice) return state;

  const dd = state.doubleDice;
  if (dd.diceUsed[dieIndex]) return state; // die already used

  const currentPlayer = state.players[state.currentPlayerIndex];
  const diceValue = dd.diceValues[dieIndex];
  const filteredMoves = getValidMoves(state, currentPlayer.color, diceValue)
    .map((m) => ({ ...m, dieIndex }));

  return {
    ...state,
    currentDiceValue: diceValue,
    doubleDice: {
      ...dd,
      activeDieIndex: dieIndex,
    },
    validMoves: filteredMoves,
  };
}
