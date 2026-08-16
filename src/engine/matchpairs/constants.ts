/**
 * Match Pairs engine constants — symbol pool, grid dimensions, player limits.
 */

import type { PlayerColor } from "../types";
import type { MatchPairsDifficulty } from "./types";

/** 32 distinct readable symbols — one per hard-mode pair slot */
export const SYMBOL_POOL: readonly string[] = [
  "★", "♥", "♦", "♣", "♠", "☀", "❄", "✿",
  "⚓", "⚙", "⚛", "☘", "✦", "✧", "✪", "⚡",
  "♔", "♕", "♖", "♘", "♙", "Ω", "Δ", "Π",
  "λ", "φ", "∞", "≈", "⌘", "☢", "☂", "✈",
];

/** Grid dimensions (rows × cols) per difficulty */
export const GRID_DIMS: Record<MatchPairsDifficulty, { rows: number; cols: number }> = {
  easy: { rows: 4, cols: 4 },   // 8 pairs
  medium: { rows: 6, cols: 6 }, // 18 pairs
  hard: { rows: 8, cols: 8 },   // 32 pairs
};

/** Player colors in default turn order */
export const COLOR_ORDER: PlayerColor[] = ["red", "blue", "green", "yellow"];

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;
