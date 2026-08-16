/**
 * TTT state creation — initializes a 2-player game with empty board.
 * Red (X) always goes first.
 */

import type { PlayerInfo } from "../types";
import type { TTTGameState, TTTBoard } from "./types";

/**
 * Create initial state for a new Tic Tac Toe game.
 * Validates exactly 2 players; sorts so red (X) is first.
 */
export function createInitialState(players: PlayerInfo[]): TTTGameState {
  if (players.length !== 2) {
    throw new Error(`Tic Tac Toe requires exactly 2 players, got ${players.length}`);
  }

  const colors = players.map((p) => p.color);
  if (!colors.includes("red") || !colors.includes("blue")) {
    throw new Error("Tic Tac Toe requires one red player (X) and one blue player (O)");
  }

  // Sort so red is always index 0 (X goes first)
  const sortedPlayers = [...players].sort((a, b) =>
    a.color === "red" ? -1 : b.color === "red" ? 1 : 0
  );

  const emptyBoard: TTTBoard = [
    null, null, null,
    null, null, null,
    null, null, null,
  ];

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    board: emptyBoard,
    currentMark: "X",
    winLine: null,
    isDraw: false,
  };
}
