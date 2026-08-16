/**
 * Snakes & Ladders bot AI — trivial since the game is pure luck.
 *
 * The bot's only action is rolling the dice. There are no decisions to make
 * (one piece, deterministic movement). Difficulty only affects the delay
 * before rolling (handled by the bot controller hook, not here).
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type { BotDifficulty } from "../types";
import type { SnakesLaddersGameState } from "./types";

/**
 * Select the bot's action. Always returns "roll" — there's nothing else to do.
 * Parameters accepted for API consistency but unused.
 */
export function selectBotAction(
  state: SnakesLaddersGameState,
  difficulty: BotDifficulty
): "roll" {
  return "roll";
}
