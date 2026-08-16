/**
 * Sea Strike state creation — initializes a 2-player game with empty boards.
 * Red always goes first, colors sorted in turn order.
 */

import type { PlayerInfo } from "../types";
import type { SeaStrikeGameState, PlayerBoard, Ship } from "./types";
import { TOTAL_CELLS, FLEET, COLOR_ORDER, MIN_PLAYERS, MAX_PLAYERS } from "./constants";

/** Create an empty player board with unplaced ships. */
export function createEmptyBoard(): PlayerBoard {
  const grid: ("empty")[] = Array(TOTAL_CELLS).fill("empty");
  const ships: Ship[] = FLEET.map((def) => ({
    ...def,
    cells: [],
    orientation: "horizontal" as const,
    hits: [],
    isSunk: false,
  }));

  return { grid, ships, allShipsPlaced: false };
}

/**
 * Create initial state for a new Sea Strike game.
 * Validates exactly 2 players; sorts by color order (red first).
 */
export function createInitialState(players: PlayerInfo[]): SeaStrikeGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Sea Strike requires exactly ${MIN_PLAYERS} players, got ${players.length}`
    );
  }

  const sortedPlayers = [...players].sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    phase: "setup",
    boards: [createEmptyBoard(), createEmptyBoard()],
    lastShotResult: null,
  };
}
