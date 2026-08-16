/**
 * Croc Snap bot AI — all difficulties play randomly (pure luck game).
 *
 * Difficulty only affects the move delay (handled by the bot controller hook),
 * not the move selection — there's no strategy in Croc Snap.
 */

import type { BotDifficulty } from "../types";
import type { CrocSnapGameState, CrocSnapMove } from "./types";

/** Select a random un-pressed tooth. Returns null if no valid moves. */
export function selectBotMove(
  _state: CrocSnapGameState,
  validMoves: CrocSnapMove[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: BotDifficulty
): CrocSnapMove | null {
  if (validMoves.length === 0) return null;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}
