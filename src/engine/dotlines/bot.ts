/**
 * Dot Lines bot — three difficulty levels:
 *
 *   easy   → random legal move.
 *   medium → prefer moves that complete a box; avoid moves that give
 *            the opponent a "third side" gift (a box with 3 sides drawn).
 *            Falls back to random when all remaining options are "safe".
 *   hard   → extends medium with a rudimentary chain-control heuristic:
 *            when forced to give a gift, sacrifice the smallest available
 *            chain of boxes to limit the opponent's haul (double-cross
 *            strategy approximation). Also always takes free boxes first.
 */

import type { BotDifficulty } from "../types";
import type { DotLinesGameState, DotLinesMove } from "./types";
import { getLegalMoves, applyMove, countSides } from "./rules";

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return the number of boxes that would be completed by drawing the given
 * edge — 0, 1, or 2.
 */
function boxesCompletedBy(move: DotLinesMove, state: DotLinesGameState): number {
  const { orientation, row, col } = move;
  let count = 0;

  // Determine adjacent boxes (mirrors rules.ts internal helper)
  const adjacent: Array<{ row: number; col: number }> = [];
  if (orientation === "h") {
    if (row > 0) adjacent.push({ row: row - 1, col });
    if (row < state.rows) adjacent.push({ row, col });
  } else {
    if (col > 0) adjacent.push({ row, col: col - 1 });
    if (col < state.cols) adjacent.push({ row, col });
  }

  for (const { row: br, col: bc } of adjacent) {
    if (state.boxes[br][bc].ownerIndex !== null) continue;
    const sides = countSides(br, bc, state);
    if (sides === 3) count++; // this move completes it
  }
  return count;
}

/**
 * True if this move gives the opponent at least one box with 3 sides drawn
 * after the edge is placed (i.e., opens a "free gift").
 */
function givesOpponentBox(move: DotLinesMove, state: DotLinesGameState): boolean {
  const { orientation, row, col } = move;
  // Adjacent boxes to this edge
  const adjacent: Array<{ row: number; col: number }> = [];
  if (orientation === "h") {
    if (row > 0) adjacent.push({ row: row - 1, col });
    if (row < state.rows) adjacent.push({ row, col });
  } else {
    if (col > 0) adjacent.push({ row, col: col - 1 });
    if (col < state.cols) adjacent.push({ row, col });
  }

  // After drawing the edge, check whether any OTHER unclaimed box will have 3 sides
  // (making it a gift on the opponent's next turn).
  // We simulate one step ahead and scan all boxes.
  const next = applyMove(state, { ...move, timestamp: Date.now() });
  // If the move completed boxes the bot goes again — not a "give" situation
  if (next.currentPlayerIndex === state.currentPlayerIndex) return false;

  // Check every unclaimed box in the new state for 3-side count
  for (let r = 0; r < next.rows; r++) {
    for (let c = 0; c < next.cols; c++) {
      if (next.boxes[r][c].ownerIndex !== null) continue;
      if (countSides(r, c, next) === 3) return true;
    }
  }
  return false;

  // suppress unused-variable warning
  void adjacent;
}

// ---------------------------------------------------------------------------
// Difficulty strategies
// ---------------------------------------------------------------------------

function easyMove(state: DotLinesGameState, moves: DotLinesMove[]): DotLinesMove {
  return pick(moves);
}

function mediumMove(state: DotLinesGameState, moves: DotLinesMove[]): DotLinesMove {
  // 1. Take a free box if available
  const freeBoxMoves = moves.filter((m) => boxesCompletedBy(m, state) > 0);
  if (freeBoxMoves.length > 0) return pick(freeBoxMoves);

  // 2. Avoid giving opponent a gift
  const safeMoves = moves.filter((m) => !givesOpponentBox(m, state));
  if (safeMoves.length > 0) return pick(safeMoves);

  // 3. Forced — all moves give a gift, pick at random
  return pick(moves);
}

function hardMove(state: DotLinesGameState, moves: DotLinesMove[]): DotLinesMove {
  // 1. Take a free box (greedily claim the most boxes)
  const freeBoxMoves = moves.filter((m) => boxesCompletedBy(m, state) > 0);
  if (freeBoxMoves.length > 0) {
    // Sort descending by boxes completed
    freeBoxMoves.sort(
      (a, b) => boxesCompletedBy(b, state) - boxesCompletedBy(a, state)
    );
    return freeBoxMoves[0];
  }

  // 2. Safe moves that don't open a box for the opponent
  const safeMoves = moves.filter((m) => !givesOpponentBox(m, state));
  if (safeMoves.length > 0) return pick(safeMoves);

  // 3. Double-cross heuristic: if forced to give a chain, pick the move that
  //    leaves the opponent the smallest chain (fewest adjacent 3-side boxes).
  //    Count how many 3-side boxes a move exposes after placement.
  function chainsExposed(move: DotLinesMove): number {
    const next = applyMove(state, { ...move, timestamp: Date.now() });
    let count = 0;
    for (let r = 0; r < next.rows; r++) {
      for (let c = 0; c < next.cols; c++) {
        if (next.boxes[r][c].ownerIndex !== null) continue;
        if (countSides(r, c, next) === 3) count++;
      }
    }
    return count;
  }

  const ranked = [...moves].sort((a, b) => chainsExposed(a) - chainsExposed(b));
  return ranked[0];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getBotMove(
  state: DotLinesGameState,
  difficulty: BotDifficulty
): DotLinesMove | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  switch (difficulty) {
    case "easy":
      return easyMove(state, moves);
    case "medium":
      return mediumMove(state, moves);
    case "hard":
      return hardMove(state, moves);
  }
}
