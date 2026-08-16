/**
 * Croc Snap (Tooth Trap) engine types.
 *
 * A circle of 12 teeth with one hidden trigger tooth per round.
 * Players take turns pressing teeth. Press the trigger → eliminated.
 * Last player standing wins.
 *
 * 2–4 players. Red goes first, clockwise: Red → Blue → Green → Yellow.
 */

import type { BaseGameState, BaseGameMove } from "../types";

/** Individual tooth state */
export interface Tooth {
  pressed: boolean;
}

/** Croc Snap game state extending the shared base */
export interface CrocSnapGameState extends BaseGameState {
  teeth: Tooth[];
  triggerIndex: number;
  round: number;
  eliminatedPlayers: string[];
  /** Set when the last move triggered the snap (for animation) */
  lastSnap: { toothIndex: number; eliminatedPlayerId: string } | null;
}

/** A single move = pressing one tooth */
export interface CrocSnapMove extends BaseGameMove {
  toothIndex: number;
}
