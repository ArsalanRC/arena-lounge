/**
 * Backgammon bot — picks one legal move per call using a position-aware
 * heuristic. The store loops over `selectBotMove` until the player
 * changes (or the game ends).
 *
 * Scoring (lower = better for the bot):
 *   + pips needed to bear off (own)                  — cost
 *   - pips needed to bear off (opponent)             — credit
 *   + blot-exposure (own singles in opponent's side) — cost
 *   - hits landed this move                          — credit
 *   - bonus for anchoring points in own inner board  — credit
 *
 * Difficulty tuning is a flat "random-move probability" on easy and a
 * pure best-score pick on medium+. Hard weights the evaluation a bit
 * more aggressively toward hitting.
 */

import type { BotDifficulty } from "../types";
import {
  applyMove,
  getLegalMoves,
  pipCount,
} from "./rules";
import { OPPOSITE, POINT_COUNT } from "./constants";
import type { BackgammonGameState, BackgammonMove } from "./types";

function blotExposure(state: BackgammonGameState, color: BackgammonColorBridge): number {
  let exposed = 0;
  for (let i = 0; i < POINT_COUNT; i++) {
    const p = state.points[i];
    if (p.count === 1 && p.owner === color) {
      // In a real engine this would weight by opposing proximity; we use a
      // simple count here.
      exposed += 1;
    }
  }
  return exposed;
}

type BackgammonColorBridge = "white" | "black";

function innerPoints(color: BackgammonColorBridge, state: BackgammonGameState): number {
  let n = 0;
  const range = color === "white" ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];
  for (const i of range) {
    const p = state.points[i];
    if (p.owner === color && p.count >= 2) n += 1;
  }
  return n;
}

function evaluateMove(
  state: BackgammonGameState,
  move: BackgammonMove,
  difficulty: BotDifficulty
): number {
  const color = state.turnColor as BackgammonColorBridge;
  const opp = OPPOSITE[color];
  const next = applyMove(state, move);

  const myPip = pipCount(next, color);
  const oppPip = pipCount(next, opp);
  const myBlots = blotExposure(next, color);
  const myPoints = innerPoints(color, next);
  const hitBonus = move.hit ? (difficulty === "hard" ? 15 : 8) : 0;

  // Lower is better: we want fewer pips to travel + fewer blots + more
  // anchored inner points. Opponent pips improve our position (credit).
  return myPip - 0.5 * oppPip + 4 * myBlots - 3 * myPoints - hitBonus;
}

/**
 * Pick one legal move for the bot. Returns `null` when no legal move
 * exists (the caller should then skip the turn).
 */
export function selectBotMove(
  state: BackgammonGameState,
  difficulty: BotDifficulty
): BackgammonMove | null {
  if (state.status !== "playing") return null;
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    // 30 % chance of any legal move; otherwise take the best-scored one.
    if (Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = moves[0];
  let bestScore = Infinity;
  for (const m of moves) {
    const score = evaluateMove(state, m, difficulty);
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
