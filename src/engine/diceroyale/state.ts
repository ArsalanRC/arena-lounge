/**
 * Dice Royale initial state construction.
 *
 * Creates a fresh game: 5 dice all showing 1, none held, 3 rolls remaining,
 * turn 1, all categories null, and no Royale bonuses.
 *
 * `players` must contain exactly one entry — this is a solo game.
 */

import type { PlayerInfo } from "../types";
import type { DiceRoyaleGameState, DiceRoyaleScores } from "./types";
import { CATEGORIES } from "./constants";

/** Build an all-null score card. */
export function createEmptyScores(): DiceRoyaleScores {
  return Object.fromEntries(CATEGORIES.map((c) => [c, null])) as DiceRoyaleScores;
}

/** Create a fresh Dice Royale game state for one player. */
export function createInitialState(players: PlayerInfo[]): DiceRoyaleGameState {
  if (players.length !== 1) {
    throw new Error(
      `Dice Royale is single-player — got ${players.length} players.`
    );
  }

  return {
    status: "playing",
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    turn: 1,
    scores: createEmptyScores(),
    royaleBonusCount: 0,
    hasRolledThisTurn: false,
  };
}
