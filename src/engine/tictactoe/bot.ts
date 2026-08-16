/**
 * TTT bot AI — three difficulty levels with minimax for hard mode.
 *
 * Easy: random valid move
 * Medium: 50% minimax, 50% random
 * Hard: full minimax (perfect play — never loses)
 */

import type { BotDifficulty } from "../types";
import type { TTTBoard, TTTGameState, TTTMove, Mark } from "./types";
import { checkWinner, isBoardFull } from "./rules";

/** Select a move for a bot player. Returns null if no valid moves. */
export function selectBotMove(
  state: TTTGameState,
  validMoves: TTTMove[],
  difficulty: BotDifficulty
): TTTMove | null {
  if (validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  switch (difficulty) {
    case "easy":
      return selectRandom(validMoves);
    case "medium":
      return Math.random() < 0.5
        ? selectMinimax(state, validMoves)
        : selectRandom(validMoves);
    case "hard":
      return selectMinimax(state, validMoves);
  }
}

function selectRandom(validMoves: TTTMove[]): TTTMove {
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

function selectMinimax(state: TTTGameState, validMoves: TTTMove[]): TTTMove {
  const botMark = state.currentMark;
  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    const newBoard = [...state.board] as TTTBoard;
    newBoard[move.cellIndex] = move.mark;

    const score = minimax(newBoard, 0, false, botMark);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/** Minimax recursive evaluation. Returns +10/-10/0 adjusted by depth. */
export function minimax(
  board: TTTBoard,
  depth: number,
  isMaximizing: boolean,
  botMark: Mark
): number {
  const opponentMark: Mark = botMark === "X" ? "O" : "X";

  // Terminal checks
  if (checkWinner(board, botMark)) return 10 - depth;
  if (checkWinner(board, opponentMark)) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = botMark;
      best = Math.max(best, minimax(board, depth + 1, false, botMark));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = opponentMark;
      best = Math.min(best, minimax(board, depth + 1, true, botMark));
      board[i] = null;
    }
    return best;
  }
}
