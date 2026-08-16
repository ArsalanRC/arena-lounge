/**
 * Connect Four state creation — builds the initial empty 7×6 board.
 * Yellow always moves first (player at index 0); red is player at index 1.
 */

import type { PlayerInfo } from "../types";
import type { ConnectFourGameState } from "./types";
import { ROWS, COLS, MIN_PLAYERS, MAX_PLAYERS } from "./constants";

export function createInitialState(players: PlayerInfo[]): ConnectFourGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Connect Four requires exactly ${MIN_PLAYERS} players, got ${players.length}`
    );
  }

  // Sort so "red" player is index 0 → yellow disc, "blue" player is index 1 → red disc.
  // (Platform player colours: player 1 = "red" platform colour → yellow disc;
  //  player 2 = "blue" platform colour → red disc.)
  const colorOrder = ["red", "blue"];
  const sortedPlayers = [...players].sort(
    (a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)
  );

  const board = Array.from({ length: ROWS }, () =>
    Array<"empty">(COLS).fill("empty")
  );

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    board,
    currentDisc: "yellow",
    winningCells: null,
    lastMove: null,
  };
}
