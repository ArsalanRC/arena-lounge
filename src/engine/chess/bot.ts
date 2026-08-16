/**
 * Chess bot — minimax search with alpha-beta pruning.
 *
 * Difficulty maps to the target search depth:
 *   easy   → depth 2
 *   medium → depth 3
 *   hard   → depth 4
 *
 * Arena Lounge addition: iterative deepening under a time budget. The bot
 * runs on the phone of the human sharing the table, inside a single frame,
 * so the search deepens 1, 2, 3, ... and stops at the last depth that
 * finished within BOT_TIME_BUDGET_MS (depth 1 always completes). A fast
 * desktop reaches the target depth; a slow phone answers a little shallower
 * instead of freezing for seconds. Behaviour is otherwise the same as the
 * Game Arena engine.
 *
 * Evaluation is material + piece-square tables (centipawn units), positive
 * for white. Move ordering puts captures first to help α-β cutoffs; hard
 * difficulty also adds a small random tiebreak at the root so identical
 * scores don't always produce the same opening.
 */

import type { BotDifficulty } from "../types";
import type { ChessGameState, ChessMove, ChessPieceColor } from "./types";
import { PIECE_VALUES, PIECE_SQUARE_TABLES, TOTAL_SQUARES } from "./constants";
import { applyMove, getValidMoves, fileOf, rankOf } from "./rules";

const MATE_SCORE = 100_000;

const DEPTH_BY_DIFFICULTY: Record<BotDifficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

/** Wall-clock budget for one bot move; the deeper iterations are skipped when it runs out. */
export const BOT_TIME_BUDGET_MS = 350;

/** Per-search bookkeeping for the time budget. */
interface SearchClock {
  deadline: number;
  nodes: number;
  aborted: boolean;
}

/**
 * Positive centipawn score = good for white. Mirrors piece-square tables
 * for black so each side reads its own table from rank 1.
 */
export function evaluate(state: ChessGameState): number {
  if (state.gameResult === "white_wins") return MATE_SCORE;
  if (state.gameResult === "black_wins") return -MATE_SCORE;
  if (state.gameResult === "draw") return 0;

  let score = 0;
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const p = state.board[sq];
    if (!p) continue;
    const material = PIECE_VALUES[p.type];
    const pst = PIECE_SQUARE_TABLES[p.type];
    // For black, mirror vertically so black's "own" row-2 lands on rank 7.
    const idx = p.color === "white" ? sq : mirrorSquare(sq);
    const positional = pst[idx];
    const value = material + positional;
    score += p.color === "white" ? value : -value;
  }
  return score;
}

function mirrorSquare(sq: number): number {
  const f = fileOf(sq);
  const r = rankOf(sq);
  return (7 - r) * 8 + f;
}

interface SearchResult {
  score: number;
  move: ChessMove | null;
}

/** Alpha-beta minimax. `maximising` is true when the side to move is white. */
function search(
  state: ChessGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  clock: SearchClock
): SearchResult {
  if (state.status === "finished" || state.gameResult !== "in_progress") {
    return { score: evaluate(state), move: null };
  }
  if (depth === 0) {
    return { score: evaluate(state), move: null };
  }
  // Check the clock every 64 nodes; once over budget, unwind fast (the
  // caller discards this iteration's result).
  if ((++clock.nodes & 63) === 0 && Date.now() > clock.deadline) clock.aborted = true;
  if (clock.aborted) return { score: evaluate(state), move: null };

  const moves = getValidMoves(state);
  if (moves.length === 0) {
    // Checkmate or stalemate — evaluate terminal position from the side-to-move
    // perspective. Checkmate scores include a depth penalty so earlier mates
    // beat later mates.
    if (state.check) {
      return {
        score: maximising ? -(MATE_SCORE - (100 - depth)) : MATE_SCORE - (100 - depth),
        move: null,
      };
    }
    return { score: 0, move: null };
  }

  // Move ordering — captures first (MVV-LVA-ish: value of captured piece).
  const ordered = moves.slice().sort((a, b) => captureValue(state, b) - captureValue(state, a));

  let best: SearchResult = { score: maximising ? -Infinity : Infinity, move: ordered[0] };

  for (const move of ordered) {
    const next = applyMove(state, move);
    const { score } = search(next, depth - 1, alpha, beta, !maximising, clock);
    if (clock.aborted) break;

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

function captureValue(state: ChessGameState, move: ChessMove): number {
  const target = state.board[move.to];
  if (target) return PIECE_VALUES[target.type];
  if (move.isEnPassant) return PIECE_VALUES.P;
  if (move.promotion) return PIECE_VALUES[move.promotion];
  return 0;
}

/** Select a bot move. Returns null if no legal moves exist. */
export function selectBotMove(
  state: ChessGameState,
  validMoves: ChessMove[],
  difficulty: BotDifficulty,
  budgetMs: number = BOT_TIME_BUDGET_MS
): ChessMove | null {
  if (validMoves.length === 0) return null;

  const targetDepth = DEPTH_BY_DIFFICULTY[difficulty];
  const maximising = state.turnColor === "white";
  const deadline = Date.now() + budgetMs;
  let move: ChessMove | null = null;
  for (let depth = 1; depth <= targetDepth; depth++) {
    // depth 1 never aborts, so there is always an answer
    const clock: SearchClock = { deadline: depth === 1 ? Infinity : deadline, nodes: 0, aborted: false };
    const result = search(state, depth, -Infinity, Infinity, maximising, clock);
    if (clock.aborted) break;
    move = result.move;
    // a forced mate found: deeper search cannot improve on it
    if (Math.abs(result.score) >= MATE_SCORE - 100) break;
  }

  // If search somehow returned null (shouldn't happen when validMoves has
  // entries), fall back to the first legal move.
  if (!move) return validMoves[0];

  // Hard difficulty: occasionally pick among equally-scored roots to add
  // variety. Easy difficulty: add a small chance of a random move to feel less
  // brutal.
  if (difficulty === "easy" && Math.random() < 0.2) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Match the selected move back against validMoves so we return a move with
  // canonical BaseGameMove fields (playerId, color, timestamp) populated by
  // getValidMoves.
  const canonical = validMoves.find(
    (m) =>
      m.from === move.from &&
      m.to === move.to &&
      (m.promotion ?? null) === (move.promotion ?? null) &&
      (m.isCastling ?? null) === (move.isCastling ?? null) &&
      (m.isEnPassant ?? false) === (move.isEnPassant ?? false)
  );
  return canonical ?? move;
}

/** Color-to-player helper mirrors state.ts convention (red=white, blue=black). */
export function playerColorForSide(side: ChessPieceColor): "red" | "blue" {
  return side === "white" ? "red" : "blue";
}
