/**
 * Croc Snap state creation — initializes a 2–4 player game with fresh teeth.
 * Red always goes first, colors sorted in turn order.
 */

import type { PlayerInfo } from "../types";
import type { CrocSnapGameState, Tooth } from "./types";
import { TEETH_COUNT, COLOR_ORDER, MIN_PLAYERS, MAX_PLAYERS } from "./constants";

/** Create a fresh set of teeth with a random trigger. */
export function createTeeth(count: number = TEETH_COUNT): { teeth: Tooth[]; triggerIndex: number } {
  const teeth: Tooth[] = Array.from({ length: count }, () => ({ pressed: false }));
  const triggerIndex = Math.floor(Math.random() * count);
  return { teeth, triggerIndex };
}

/** Create a fresh set of teeth with a specific trigger index (for testing). */
export function createTeethWithTrigger(triggerIndex: number, count: number = TEETH_COUNT): Tooth[] {
  return Array.from({ length: count }, () => ({ pressed: false }));
}

/**
 * Create initial state for a new Croc Snap game.
 * Validates 2–4 players; sorts by color order (red first).
 */
export function createInitialState(players: PlayerInfo[]): CrocSnapGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Croc Snap requires ${MIN_PLAYERS}–${MAX_PLAYERS} players, got ${players.length}`
    );
  }

  // Sort players by color order: red, blue, green, yellow
  const sortedPlayers = [...players].sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  const { teeth, triggerIndex } = createTeeth();

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    teeth,
    triggerIndex,
    round: 1,
    eliminatedPlayers: [],
    lastSnap: null,
  };
}
