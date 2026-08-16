/**
 * Reversi state creation — initialises a 2-player game from the standard
 * starting position. Black (player index 0) moves first.
 */

import type { PlayerInfo } from "../types";
import type { ReversiGameState } from "./types";
import { INITIAL_BOARD } from "./constants";

/**
 * Build the starting ReversiGameState for the provided players.
 * The first player in the list is assigned black; the second is white.
 * Requires exactly 2 players.
 */
export function createInitialState(players: PlayerInfo[]): ReversiGameState {
  if (players.length !== 2) {
    throw new Error(`Reversi requires exactly 2 players, got ${players.length}`);
  }

  // Deep-copy the starting board so mutations don't touch the constant.
  const board = INITIAL_BOARD.map((row) => [...row]);

  return {
    status: "playing",
    players: [...players],
    currentPlayerIndex: 0, // black moves first
    turnNumber: 1,
    finishOrder: [],
    board,
    passCount: 0,
    lastMove: null,
  };
}
