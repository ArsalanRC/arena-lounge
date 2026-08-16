/**
 * Checkers state creation — initialises a 2-player game from the standard
 * starting position. White (red player) moves first.
 */

import type { PlayerInfo } from "../types";
import type { CheckersGameState } from "./types";
import { INITIAL_BOARD, MIN_PLAYERS, MAX_PLAYERS } from "./constants";

export function createInitialState(players: PlayerInfo[]): CheckersGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Checkers requires exactly ${MIN_PLAYERS} players, got ${players.length}`
    );
  }
  const colorOrder = ["red", "blue"];
  const sortedPlayers = [...players].sort(
    (a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)
  );

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    board: [...INITIAL_BOARD],
    turnColor: "white",
    halfmoveClock: 0,
    fullmoveNumber: 1,
    gameResult: "in_progress",
    lastMove: null,
  };
}
