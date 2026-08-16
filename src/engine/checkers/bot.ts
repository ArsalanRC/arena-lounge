/**
 * Checkers bot — alpha-beta minimax with material + piece-square evaluation.
 *
 * Checkers has a much lower branching factor than chess (~4–10 moves vs
 * 20–30), so deeper searches are feasible:
 *   easy   → depth 3 (20% random-move probability for friendliness)
 *   medium → depth 5
 *   hard   → depth 7
 *
 * Move ordering puts captures first (they'll be generated exclusively when
 * legal, but within a captures list we sort by number of pieces taken).
 */

import type { BotDifficulty } from "../types";
import type { CheckersGameState, CheckersMove } from "./types";
import { PIECE_VALUES, MAN_PST, KING_PST, TOTAL_SQUARES } from "./constants";
import { applyMove, getValidMoves } from "./rules";

const WIN_SCORE = 100_000;

const DEPTH_BY_DIFFICULTY: Record<BotDifficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 7,
};

/** Centipawn-style evaluation. Positive = good for white. */
export function evaluate(state: CheckersGameState): number {
  if (state.gameResult === "white_wins") return WIN_SCORE;
  if (state.gameResult === "black_wins") return -WIN_SCORE;
  if (state.gameResult === "draw") return 0;

  let score = 0;
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const p = state.board[sq];
    if (!p) continue;
    const material = PIECE_VALUES[p.type];
    const pst = p.type === "king" ? KING_PST : MAN_PST;
    // Mirror for black: flip rank.
    const idx = p.color === "white" ? sq : mirrorSquare(sq);
    const positional = pst[idx];
    const value = material + positional;
    score += p.color === "white" ? value : -value;
  }
  return score;
}

/** 180° rotation — preserves dark-square parity, unlike a pure rank flip. */
function mirrorSquare(sq: number): number {
  return 63 - sq;
}

interface SearchResult {
  score: number;
  move: CheckersMove | null;
}

function search(
  state: CheckersGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean
): SearchResult {
  if (state.status === "finished" || state.gameResult !== "in_progress") {
    return { score: evaluate(state), move: null };
  }
  if (depth === 0) {
    return { score: evaluate(state), move: null };
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) {
    // Side to move can't move — they lose.
    return {
      score: maximising
        ? -(WIN_SCORE - (100 - depth))
        : WIN_SCORE - (100 - depth),
      move: null,
    };
  }

  // Capture count = rough move ordering heuristic.
  const ordered = moves
    .slice()
    .sort((a, b) => b.captures.length - a.captures.length);

  let best: SearchResult = {
    score: maximising ? -Infinity : Infinity,
    move: ordered[0],
  };

  for (const move of ordered) {
    const next = applyMove(state, move);
    const { score } = search(next, depth - 1, alpha, beta, !maximising);
    if (maximising) {
      if (score > best.score) best = { score, move };
      if (score > alpha) alpha = score;
    } else {
      if (score < best.score) best = { score, move };
      if (score < beta) beta = score;
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function selectBotMove(
  state: CheckersGameState,
  validMoves: CheckersMove[],
  difficulty: BotDifficulty
): CheckersMove | null {
  if (validMoves.length === 0) return null;

  // Forced captures mean we have no choice much of the time; sometimes still
  // one of several chains to pick from.
  if (validMoves.length === 1) return validMoves[0];

  if (difficulty === "easy" && Math.random() < 0.2) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  const depth = DEPTH_BY_DIFFICULTY[difficulty];
  const maximising = state.turnColor === "white";
  const { move } = search(state, depth, -Infinity, Infinity, maximising);
  if (!move) return validMoves[0];

  // Match back to the canonical validMoves entry so we keep BaseGameMove fields.
  const canonical = validMoves.find(
    (m) =>
      m.from === move.from &&
      m.to === move.to &&
      m.captures.length === move.captures.length &&
      m.captures.every((c, i) => c === move.captures[i])
  );
  return canonical ?? move;
}
