/**
 * Connect Four bot — alpha-beta minimax with a heuristic evaluation.
 *
 * Search depths:
 *   easy   → 2 (+ 20 % random move)
 *   medium → 4
 *   hard   → 6
 *
 * Evaluation heuristic (from the maximising player's perspective):
 *   + 3-in-a-row with one empty → large bonus
 *   + 2-in-a-row with two empties → small bonus
 *   + centre-column occupancy bonus
 *   Opponent's open threats subtracted symmetrically.
 *
 * Move ordering: centre-first column trial order to improve pruning.
 */

import type { BotDifficulty } from "../types";
import type {
  ConnectFourCell,
  ConnectFourDisc,
  ConnectFourGameState,
  ConnectFourMove,
} from "./types";
import { ROWS, COLS, WIN_LENGTH, CENTRE_COL, COL_ORDER, DEPTH_BY_DIFFICULTY } from "./constants";
import { applyMove, getLegalMoves, checkWin, lowestEmptyRow } from "./rules";

const WIN_SCORE = 100_000;

// ---------------------------------------------------------------------------
// Heuristic evaluation
// ---------------------------------------------------------------------------

/** Count how many of `disc` and `empty` cells appear in `window`. */
function scoreWindow(
  window: ConnectFourCell[],
  disc: ConnectFourDisc
): number {
  const opp: ConnectFourDisc = disc === "yellow" ? "red" : "yellow";
  const discCount = window.filter((c) => c === disc).length;
  const emptyCount = window.filter((c) => c === "empty").length;
  const oppCount = window.filter((c) => c === opp).length;

  if (oppCount > 0 && discCount > 0) return 0; // mixed window → no value

  if (discCount === WIN_LENGTH) return WIN_SCORE;
  if (discCount === WIN_LENGTH - 1 && emptyCount === 1) return 100;
  if (discCount === WIN_LENGTH - 2 && emptyCount === 2) return 10;
  if (oppCount === WIN_LENGTH - 1 && emptyCount === 1) return -110; // block urgently
  return 0;
}

/**
 * Static evaluation from `disc`'s perspective.
 * Positive = good for `disc`.
 */
function evaluate(
  board: ConnectFourCell[][],
  disc: ConnectFourDisc
): number {
  let score = 0;

  // Centre column bonus
  for (let r = 0; r < ROWS; r++) {
    if (board[r][CENTRE_COL] === disc) score += 6;
  }

  // Horizontal windows
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
      score += scoreWindow(window, disc);
    }
  }

  // Vertical windows
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c < COLS; c++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += scoreWindow(window, disc);
    }
  }

  // Diagonal ↘
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += scoreWindow(window, disc);
    }
  }

  // Diagonal ↙
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = WIN_LENGTH - 1; c < COLS; c++) {
      const window = [board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]];
      score += scoreWindow(window, disc);
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Minimax α-β
// ---------------------------------------------------------------------------

interface SearchResult {
  score: number;
  column: number | null;
}

function search(
  state: ConnectFourGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  botDisc: ConnectFourDisc
): SearchResult {
  if (state.status === "finished") {
    if (state.winningCells) {
      // Whoever just moved won. The previous player was the maximising one when
      // it's NOT our turn now, i.e. if maximising=false we just moved as bot.
      return {
        score: maximising ? -(WIN_SCORE + depth) : (WIN_SCORE + depth),
        column: null,
      };
    }
    return { score: 0, column: null }; // draw
  }

  if (depth === 0) {
    const disc = maximising ? botDisc : (botDisc === "yellow" ? "red" : "yellow");
    return { score: evaluate(state.board, disc), column: null };
  }

  const moves = getLegalMovesOrdered(state);
  if (moves.length === 0) return { score: 0, column: null };

  let best: SearchResult = {
    score: maximising ? -Infinity : Infinity,
    column: moves[0].column,
  };

  for (const move of moves) {
    const next = applyMove(state, move);
    const { score } = search(next, depth - 1, alpha, beta, !maximising, botDisc);

    if (maximising) {
      if (score > best.score) best = { score, column: move.column };
      if (score > alpha) alpha = score;
    } else {
      if (score < best.score) best = { score, column: move.column };
      if (score < beta) beta = score;
    }
    if (beta <= alpha) break;
  }

  return best;
}

/** Return legal moves sorted in centre-first column order. */
function getLegalMovesOrdered(state: ConnectFourGameState): ConnectFourMove[] {
  const player = state.players[state.currentPlayerIndex];
  const moves: ConnectFourMove[] = [];
  for (const col of COL_ORDER) {
    const row = lowestEmptyRow(state.board, col);
    if (row === -1) continue;
    moves.push({
      kind: "drop",
      column: col,
      row,
      playerId: player.id,
      color: player.color,
      timestamp: Date.now(),
    });
  }
  return moves;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the best move for the current player in `state`.
 * Returns null only if no legal moves exist (game over).
 */
export function getBotMove(
  state: ConnectFourGameState,
  difficulty: BotDifficulty
): ConnectFourMove | null {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  // Easy: 20 % chance of a random move
  if (difficulty === "easy" && Math.random() < 0.2) {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  const botDisc = state.currentDisc;

  // Quick check: is there an immediate winning move?
  for (const move of getLegalMovesOrdered(state)) {
    const row = lowestEmptyRow(state.board, move.column);
    if (row === -1) continue;
    // Temporarily check win
    const testBoard = state.board.map((r, ri) =>
      ri === row ? [...r] : r
    );
    testBoard[row][move.column] = botDisc;
    if (checkWin(testBoard, row, move.column)) {
      return legal.find((m) => m.column === move.column) ?? move;
    }
  }

  const depth = DEPTH_BY_DIFFICULTY[difficulty];
  const { column } = search(state, depth, -Infinity, Infinity, true, botDisc);

  if (column === null) return legal[0];

  return legal.find((m) => m.column === column) ?? legal[0];
}
