/**
 * Bot AI for Ludo — pure functions, no React or store dependencies.
 *
 * Three difficulty levels:
 *   Easy   — random move selection
 *   Medium — scored heuristic with 30% randomness among top-3
 *   Hard   — advanced scoring, always picks best
 *
 * In double dice mode, selectBotDie() chooses which die to use first:
 *   Easy   — random die
 *   Medium — picks die whose best move has higher basic heuristic score
 *   Hard   — picks die whose best move has higher advanced heuristic score
 */

import type { PlayerColor, BotDifficulty } from "../types";
import type { LudoGameState, ValidMove } from "./types";
import {
  HOME_POSITION,
  HOME_COLUMN_START,
  TRACK_LENGTH,
  SAFE_POSITIONS,
  relativeToAbsolute,
  PIECES_PER_PLAYER,
  YARD_POSITION,
} from "./constants";
import { getValidMoves } from "./rules";

export type { BotDifficulty } from "../types";

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Select a move for a bot player.
 * Returns null if validMoves is empty.
 */
export function selectBotMove(
  state: LudoGameState,
  validMoves: ValidMove[],
  difficulty: BotDifficulty
): ValidMove | null {
  if (validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  switch (difficulty) {
    case "easy":
      return selectEasy(validMoves);
    case "medium":
      return selectMedium(state, validMoves);
    case "hard":
      return selectHard(state, validMoves);
  }
}

// ---------------------------------------------------------------------------
// Easy — pure random
// ---------------------------------------------------------------------------

function selectEasy(validMoves: ValidMove[]): ValidMove {
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

// ---------------------------------------------------------------------------
// Medium — scored heuristic with randomness in top-3
// ---------------------------------------------------------------------------

function selectMedium(
  state: LudoGameState,
  validMoves: ValidMove[]
): ValidMove {
  const scored = validMoves.map((move) => ({
    move,
    score: scoreMoveBasic(move),
  }));

  scored.sort((a, b) => b.score - a.score);

  // 30% chance to pick from top 3 randomly instead of best
  const topN = Math.min(3, scored.length);
  if (Math.random() < 0.3) {
    return scored[Math.floor(Math.random() * topN)].move;
  }
  return scored[0].move;
}

function scoreMoveBasic(move: ValidMove): number {
  let score = 0;

  // Reaching HOME is best
  if (move.to === HOME_POSITION) score += 100;
  // Captures are very valuable
  else if (move.isCapture) score += 50;
  // Entering home column is good
  else if (move.to >= HOME_COLUMN_START && move.from < HOME_COLUMN_START)
    score += 40;
  // Exiting yard is good
  else if (move.isExitYard) score += 30;
  // General forward progress
  else score += 10;

  return score;
}

// ---------------------------------------------------------------------------
// Hard — advanced scoring, always picks best
// ---------------------------------------------------------------------------

function selectHard(
  state: LudoGameState,
  validMoves: ValidMove[]
): ValidMove {
  const scored = validMoves.map((move) => ({
    move,
    score: scoreMoveAdvanced(state, move),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

function scoreMoveAdvanced(state: LudoGameState, move: ValidMove): number {
  let score = 0;

  // Reaching HOME — highest priority
  if (move.to === HOME_POSITION) {
    score += 100;
    return score;
  }

  // Capture — value scaled by opponent's progress
  if (move.isCapture && move.capturedPiece) {
    const capturedPos =
      state.board.pieces[move.capturedPiece.color][move.capturedPiece.pieceIndex];
    // Further-progressed opponents are more valuable to capture
    const progressBonus = Math.min(capturedPos, 51);
    score += 50 + progressBonus * 0.5;
  }

  // Entering home column — safe and close to winning
  if (move.to >= HOME_COLUMN_START && move.from < HOME_COLUMN_START) {
    score += 40;
  }

  // Exiting yard — piece development
  if (move.isExitYard) {
    // Count how many pieces are still in yard
    const yardCount = state.board.pieces[move.color].filter(
      (p) => p === YARD_POSITION
    ).length;
    // Higher priority when most pieces are still in yard
    score += 30 + (yardCount > 2 ? 10 : 0);
  }

  // Danger assessment — prefer moves that reduce danger
  if (move.to >= 0 && move.to < HOME_COLUMN_START) {
    const dangerBefore =
      move.from >= 0 && move.from < HOME_COLUMN_START
        ? assessDanger(state, move.color, move.from)
        : 0;
    const dangerAfter = assessDanger(state, move.color, move.to);

    // Reward moving away from danger
    score += (dangerBefore - dangerAfter) * 8;

    // Bonus for landing on safe positions
    const absPos = relativeToAbsolute(move.to, move.color);
    if (SAFE_POSITIONS.includes(absPos)) {
      score += 15;
    }
  }

  // Piece in home column — prefer advancing deeper
  if (move.to >= HOME_COLUMN_START && move.to < HOME_POSITION) {
    score += 20 + (move.to - HOME_COLUMN_START) * 3;
  }

  // General forward progress on track
  if (
    move.to >= 0 &&
    move.to < HOME_COLUMN_START &&
    move.from >= 0 &&
    move.from < HOME_COLUMN_START
  ) {
    score += 5 + move.to * 0.2;
  }

  // Piece development: spread pieces rather than stacking
  const piecesOnTrack = state.board.pieces[move.color].filter(
    (p) => p >= 0 && p < HOME_COLUMN_START
  ).length;
  if (move.isExitYard && piecesOnTrack < 2) {
    score += 5;
  }

  return score;
}

// ---------------------------------------------------------------------------
// selectBotDie — choose which die to use first in double dice mode
// ---------------------------------------------------------------------------

/**
 * Select which die index (0 or 1) the bot should use first.
 * Easy: random. Medium/Hard: pick die whose best move scores higher.
 * Returns null if no die can be selected (shouldn't happen if called correctly).
 */
export function selectBotDie(
  state: LudoGameState,
  difficulty: BotDifficulty
): 0 | 1 | null {
  if (!state.doubleDice) return null;
  const dd = state.doubleDice;
  const available: (0 | 1)[] = [];
  if (!dd.diceUsed[0]) available.push(0);
  if (!dd.diceUsed[1]) available.push(1);
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];

  if (difficulty === "easy") {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Medium/Hard: evaluate which die has the better best-move
  const currentPlayer = state.players[state.currentPlayerIndex];
  let bestIndex: 0 | 1 = available[0];
  let bestScore = -Infinity;

  for (const idx of available) {
    const diceValue = dd.diceValues[idx];
    const moves = getValidMoves(state, currentPlayer.color, diceValue);
    if (moves.length === 0) continue;
    const move = selectBotMove(state, moves, difficulty);
    if (!move) continue;
    const score = difficulty === "hard"
      ? scoreMoveAdvancedForDie(state, move)
      : scoreMoveBasicForDie(move);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }

  return bestIndex;
}

function scoreMoveBasicForDie(move: ValidMove): number {
  let score = 0;
  if (move.to === HOME_POSITION) score += 100;
  else if (move.isCapture) score += 50;
  else if (move.to >= HOME_COLUMN_START && move.from < HOME_COLUMN_START) score += 40;
  else if (move.isExitYard) score += 30;
  else score += 10;
  return score;
}

function scoreMoveAdvancedForDie(state: LudoGameState, move: ValidMove): number {
  return scoreMoveAdvanced(state, move);
}

// ---------------------------------------------------------------------------
// Danger assessment — how many opponent pieces threaten a position
// ---------------------------------------------------------------------------

/**
 * Assess threat level for a piece at the given relative position.
 * Returns 0-3 based on how many opponent pieces can reach this position
 * within 6 cells (one dice roll).
 */
export function assessDanger(
  state: LudoGameState,
  color: PlayerColor,
  relativePos: number
): number {
  if (relativePos < 0 || relativePos >= HOME_COLUMN_START) return 0;

  const absPos = relativeToAbsolute(relativePos, color);

  // Safe positions have no danger
  if (SAFE_POSITIONS.includes(absPos)) return 0;

  let threats = 0;

  for (const player of state.players) {
    if (player.color === color) continue;

    const theirPieces = state.board.pieces[player.color];
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      const theirRelPos = theirPieces[i];

      // Only track-based pieces can threaten
      if (theirRelPos < 0 || theirRelPos >= HOME_COLUMN_START) continue;

      const theirAbsPos = relativeToAbsolute(theirRelPos, player.color);

      // Check if they can reach our position in 1-6 moves
      for (let dice = 1; dice <= 6; dice++) {
        const theirNewAbs = (theirAbsPos + dice) % TRACK_LENGTH;
        if (theirNewAbs === absPos) {
          threats++;
          break; // count each piece at most once
        }
      }
    }
  }

  return Math.min(threats, 3);
}
