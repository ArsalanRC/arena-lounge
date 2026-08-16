/**
 * Super TTT bot AI — three difficulty levels.
 *
 * Easy:   random valid move
 * Medium: 1-ply heuristic evaluation (pick best immediate move)
 * Hard:   depth-limited minimax with alpha-beta pruning (depth 4)
 *
 * Heuristic evaluates: meta-board threats (2-in-a-row), won sub-boards,
 * center/corner control on the meta-board.
 */

import type { BotDifficulty } from "../types";
import type { SuperTTTGameState, SuperTTTMove, MetaBoard } from "./types";
import type { Mark } from "../tictactoe/types";
import { WIN_LINES } from "../tictactoe/rules";
import { getValidMoves, applyMove, checkMetaWinner, isMetaBoardFull } from "./rules";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Select a move for a bot player. Returns null if no valid moves. */
export function selectBotMove(
  state: SuperTTTGameState,
  validMoves: SuperTTTMove[],
  difficulty: BotDifficulty
): SuperTTTMove | null {
  if (validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  switch (difficulty) {
    case "easy":
      return selectRandom(validMoves);
    case "medium":
      return selectHeuristic(state, validMoves);
    case "hard":
      return selectMinimax(state, validMoves);
  }
}

// ---------------------------------------------------------------------------
// Easy — random
// ---------------------------------------------------------------------------

function selectRandom(validMoves: SuperTTTMove[]): SuperTTTMove {
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

// ---------------------------------------------------------------------------
// Medium — 1-ply heuristic
// ---------------------------------------------------------------------------

function selectHeuristic(state: SuperTTTGameState, validMoves: SuperTTTMove[]): SuperTTTMove {
  const botMark = state.currentMark;
  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    const newState = applyMove(state, move);
    const score = evaluateState(newState, botMark);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// ---------------------------------------------------------------------------
// Hard — minimax with alpha-beta (depth 4)
// ---------------------------------------------------------------------------

const MAX_DEPTH = 4;

function selectMinimax(state: SuperTTTGameState, validMoves: SuperTTTMove[]): SuperTTTMove {
  const botMark = state.currentMark;
  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    const newState = applyMove(state, move);
    const score = minimaxAB(newState, MAX_DEPTH - 1, -Infinity, Infinity, false, botMark);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimaxAB(
  state: SuperTTTGameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botMark: Mark
): number {
  const opponentMark: Mark = botMark === "X" ? "O" : "X";

  // Terminal: meta-board won
  if (checkMetaWinner(state.metaBoard, botMark)) return 1000 + depth;
  if (checkMetaWinner(state.metaBoard, opponentMark)) return -1000 - depth;
  if (isMetaBoardFull(state.metaBoard)) return 0;
  if (depth <= 0) return evaluateState(state, botMark);

  const moves = getValidMoves(state);
  if (moves.length === 0) return evaluateState(state, botMark);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const score = minimaxAB(newState, depth - 1, alpha, beta, false, botMark);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const score = minimaxAB(newState, depth - 1, alpha, beta, true, botMark);
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ---------------------------------------------------------------------------
// Heuristic evaluation
// ---------------------------------------------------------------------------

/** Score the game state from the perspective of the given mark */
function evaluateState(state: SuperTTTGameState, mark: Mark): number {
  const opponent: Mark = mark === "X" ? "O" : "X";
  let score = 0;

  // Meta-board line threats
  score += countLineThreats(state.metaBoard, mark) * 10;
  score -= countLineThreats(state.metaBoard, opponent) * 10;

  // Won sub-boards
  for (const cell of state.metaBoard) {
    if (cell === mark) score += 20;
    else if (cell === opponent) score -= 20;
  }

  // Center control (meta-board index 4)
  if (state.metaBoard[4] === mark) score += 15;
  else if (state.metaBoard[4] === opponent) score -= 15;

  // Corner control (meta-board indices 0,2,6,8)
  for (const idx of [0, 2, 6, 8]) {
    if (state.metaBoard[idx] === mark) score += 5;
    else if (state.metaBoard[idx] === opponent) score -= 5;
  }

  return score;
}

/** Count 2-in-a-row threats (where the third cell is still open) */
function countLineThreats(metaBoard: MetaBoard, mark: Mark): number {
  let threats = 0;
  for (const line of WIN_LINES) {
    let markCount = 0;
    let openCount = 0;
    for (const idx of line) {
      if (metaBoard[idx] === mark) markCount++;
      else if (metaBoard[idx] === null) openCount++;
    }
    // A threat is 2 marks + 1 open cell
    if (markCount === 2 && openCount === 1) threats++;
  }
  return threats;
}
