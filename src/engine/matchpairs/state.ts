/**
 * Match Pairs state creation — builds and shuffles a paired deck.
 *
 * 1–4 players are accepted; players are sorted by COLOR_ORDER.
 * `rng` is an optional seeded random function (0 ≤ r < 1) used for
 * deterministic shuffle in tests. If omitted, Math.random() is used.
 */

import type { PlayerInfo } from "../types";
import type { MatchPairsCard, MatchPairsGameState } from "./types";
import { GRID_DIMS, COLOR_ORDER, MIN_PLAYERS, MAX_PLAYERS, SYMBOL_POOL } from "./constants";
import type { MatchPairsDifficulty } from "./types";

/** Fisher-Yates shuffle using the provided rng (defaults to Math.random). */
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a shuffled deck of `pairCount * 2` cards using the first `pairCount`
 * symbols from SYMBOL_POOL.
 */
export function buildDeck(pairCount: number, rng?: () => number): MatchPairsCard[] {
  const symbols = SYMBOL_POOL.slice(0, pairCount);
  const pairs = symbols.flatMap((symbol) => [symbol, symbol]);
  const shuffled = shuffle(pairs, rng);
  return shuffled.map((symbol, id) => ({
    id,
    symbol,
    flipped: false,
    matched: false,
    matchedBy: null,
  }));
}

/**
 * Create the initial state for a new Match Pairs game.
 * Validates 1–4 players; sorts by COLOR_ORDER.
 */
export function createInitialState(
  players: PlayerInfo[],
  difficulty: MatchPairsDifficulty,
  rng?: () => number
): MatchPairsGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Match Pairs requires ${MIN_PLAYERS}–${MAX_PLAYERS} players, got ${players.length}`
    );
  }

  const sortedPlayers = [...players].sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  const { rows, cols } = GRID_DIMS[difficulty];
  const pairCount = (rows * cols) / 2;
  const cards = buildDeck(pairCount, rng);

  const scores: Record<string, number> = {};
  for (const p of sortedPlayers) scores[p.id] = 0;

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    cards,
    rows,
    cols,
    flippedIndices: [],
    scores,
    difficulty,
    turnFlips: 0,
    elapsedMs: 0,
    moveCount: 0,
  };
}
