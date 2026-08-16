/**
 * Reversi bot — three difficulty levels.
 *
 *   easy   → random legal move
 *   medium → greedy: picks the move that flips the most discs
 *   hard   → minimax α-β pruning, depth 4, with positional + mobility
 *            heuristic (POSITION_WEIGHTS + frontier disc penalty +
 *            mobility advantage)
 *
 * The hard bot caps at depth 4, which is fast enough to be responsive on
 * mobile while still playing a credible mid-game strategy. When fewer than
 * 12 empty squares remain it deepens automatically to search to completion.
 */

import type { BotDifficulty } from "../types";
import type { ReversiCell, ReversiDifficulty, ReversiGameState, ReversiMove } from "./types";
import { SIZE, POSITION_WEIGHTS } from "./constants";
import { applyMove, getFlipsFor, getLegalMoves, score } from "./rules";

const WIN_SCORE = 1_000_000;

// ---------------------------------------------------------------------------
// Heuristic
// ---------------------------------------------------------------------------

/**
 * Static evaluation from black's perspective.
 * Combines positional weight, mobility (legal moves available), and disc count
 * in the endgame.
 */
function evaluate(board: ReversiCell[][]): number {
  // Count empty squares to decide whether we're in the endgame.
  let empty = 0;
  for (const row of board) for (const cell of row) if (cell === "empty") empty++;

  // In the endgame (≤12 empty) disc count is all that matters.
  if (empty <= 12) {
    const { black, white } = score(board);
    return (black - white) * 100;
  }

  let positional = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r][c];
      if (cell === "empty") continue;
      const w = POSITION_WEIGHTS[r][c];
      positional += cell === "black" ? w : -w;
    }
  }

  // Mobility: reward having more legal moves than the opponent.
  let blackMoves = 0;
  let whiteMoves = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "empty") continue;
      if (getFlipsFor(board, "black", r, c).length > 0) blackMoves++;
      if (getFlipsFor(board, "white", r, c).length > 0) whiteMoves++;
    }
  }
  const totalMoves = blackMoves + whiteMoves;
  const mobility = totalMoves > 0
    ? 20 * (blackMoves - whiteMoves) / totalMoves
    : 0;

  return positional + mobility;
}

// ---------------------------------------------------------------------------
// Minimax
// ---------------------------------------------------------------------------

interface SearchResult {
  score: number;
  move: { r: number; c: number } | null;
}

function search(
  state: ReversiGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean
): SearchResult {
  if (state.status === "finished") {
    const { black, white } = score(state.board);
    if (black > white) return { score: WIN_SCORE, move: null };
    if (white > black) return { score: -WIN_SCORE, move: null };
    return { score: 0, move: null };
  }
  if (depth === 0) {
    return { score: evaluate(state.board), move: null };
  }

  const legal = getLegalMoves(state);
  if (legal.length === 0) {
    // Must pass.
    const passMove: ReversiMove = {
      kind: "pass",
      playerId: state.players[state.currentPlayerIndex].id,
      color: state.players[state.currentPlayerIndex].color,
      timestamp: 0,
    };
    const next = applyMove(state, passMove);
    // After a pass the maximising perspective flips.
    const { score: s } = search(next, depth - 1, alpha, beta, !maximising);
    return { score: s, move: null };
  }

  // Sort: corners first (weight 100), then by descending position weight.
  const sorted = [...legal].sort(
    (a, b) => POSITION_WEIGHTS[b.r][b.c] - POSITION_WEIGHTS[a.r][a.c]
  );

  let best: SearchResult = { score: maximising ? -Infinity : Infinity, move: sorted[0] };

  for (const { r, c } of sorted) {
    const placeMove: ReversiMove = {
      kind: "place",
      row: r,
      col: c,
      playerId: state.players[state.currentPlayerIndex].id,
      color: state.players[state.currentPlayerIndex].color,
      timestamp: 0,
    };
    const next = applyMove(state, placeMove);
    const { score: s } = search(next, depth - 1, alpha, beta, !maximising);

    if (maximising) {
      if (s > best.score) best = { score: s, move: { r, c } };
      if (s > alpha) alpha = s;
    } else {
      if (s < best.score) best = { score: s, move: { r, c } };
      if (s < beta) beta = s;
    }
    if (beta <= alpha) break;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the bot's chosen move for the current state and difficulty.
 * Returns a pass move when no legal placement exists.
 */
export function getBotMove(
  state: ReversiGameState,
  difficulty: ReversiDifficulty | BotDifficulty
): ReversiMove {
  const player = state.players[state.currentPlayerIndex];
  const baseMove: Omit<ReversiMove, "kind" | "row" | "col"> = {
    playerId: player.id,
    color: player.color,
    timestamp: Date.now(),
  };

  const legal = getLegalMoves(state);

  if (legal.length === 0) {
    return { ...baseMove, kind: "pass" };
  }

  if (difficulty === "easy") {
    const pick = legal[Math.floor(Math.random() * legal.length)];
    return { ...baseMove, kind: "place", row: pick.r, col: pick.c };
  }

  if (difficulty === "medium") {
    // Greedy: maximise flips.
    let best = legal[0];
    let bestFlips = 0;
    const color = state.currentPlayerIndex === 0 ? "black" : "white";
    for (const { r, c } of legal) {
      const flips = getFlipsFor(state.board, color, r, c).length;
      if (flips > bestFlips) {
        bestFlips = flips;
        best = { r, c };
      }
    }
    return { ...baseMove, kind: "place", row: best.r, col: best.c };
  }

  // Hard: minimax α-β, adaptive depth.
  const emptyCount = state.board.flat().filter((c) => c === "empty").length;
  const depth = emptyCount <= 12 ? emptyCount : 4;
  const maximising = state.currentPlayerIndex === 0; // black = maximising
  const { move } = search(state, depth, -Infinity, Infinity, maximising);
  const chosen = move ?? legal[0];
  return { ...baseMove, kind: "place", row: chosen.r, col: chosen.c };
}
