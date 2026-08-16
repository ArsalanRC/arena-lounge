/**
 * Match Pairs engine types.
 *
 * Classic memory card-flip game. 1–4 players take turns flipping 2 cards
 * per turn. Matching pairs are claimed by the flipper, who then earns another
 * turn. Mismatched pairs are flipped back after a brief reveal; the turn passes
 * to the next player. Game ends when all pairs are claimed — most pairs wins.
 *
 * Difficulties: Easy 4×4 (8 pairs), Medium 6×6 (18 pairs), Hard 8×8 (32 pairs).
 * Solo mode tracks moves count and elapsed time rather than player scores.
 */

import type { BaseGameState, BaseGameMove } from "../types";

/** Single card on the board */
export interface MatchPairsCard {
  id: number;
  symbol: string;
  /** Whether the card is currently face-up (flipped this turn or previously matched) */
  flipped: boolean;
  /** Whether the pair has been permanently claimed */
  matched: boolean;
  /** ID of the player who claimed this card's pair, or null */
  matchedBy: string | null;
}

export type MatchPairsDifficulty = "easy" | "medium" | "hard";

/** Full Match Pairs game state */
export interface MatchPairsGameState extends BaseGameState {
  cards: MatchPairsCard[];
  rows: number;
  cols: number;
  /** Indices of the 1 or 2 cards currently face-up (un-matched) for this turn */
  flippedIndices: number[];
  /** Cumulative pair counts per player ID */
  scores: Record<string, number>;
  difficulty: MatchPairsDifficulty;
  /** Total flips the current player has made this turn (max 2 before resolve) */
  turnFlips: number;
  /** Elapsed time in ms (solo only — updated by the store) */
  elapsedMs: number;
  /** Total moves made (solo: flip pairs attempted; multiplayer: per-player turns) */
  moveCount: number;
}

/** Flip a specific card (human- or bot-initiated) */
export interface MatchPairsFlipMove extends BaseGameMove {
  kind: "flip";
  index: number;
}

/**
 * Resolve move — engine-emitted internally after a mismatch to flip both
 * cards back and advance the turn. The store calls `resolveMismatch` after
 * the reveal delay rather than placing this move through applyMove directly.
 */
export interface MatchPairsResolveMove extends BaseGameMove {
  kind: "resolve";
}

export type MatchPairsMove = MatchPairsFlipMove | MatchPairsResolveMove;
