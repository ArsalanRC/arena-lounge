/**
 * Backgammon initial state construction.
 */

import type { PlayerInfo } from "../types";
import type { BackgammonGameState } from "./types";
import { initialPoints } from "./constants";

export function createInitialState(players: PlayerInfo[]): BackgammonGameState {
  if (players.length !== 2) {
    throw new Error(
      `Backgammon requires exactly 2 players, got ${players.length}`
    );
  }

  // Canonical platform mapping: player_order 0 (red) is white, plays first.
  const sorted = [...players].sort((a, b) => a.playerOrder - b.playerOrder);

  return {
    status: "playing",
    players: sorted,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    points: initialPoints(),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    turnColor: "white",
    dice: null,
    remainingPips: [],
    gameResult: "in_progress",
    lastMove: null,
    moveCounter: 0,
  };
}
