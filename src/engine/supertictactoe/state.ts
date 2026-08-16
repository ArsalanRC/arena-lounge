/**
 * Super TTT state creation — initializes a 2-player game with 9 empty sub-boards.
 * Red (X) always goes first.
 */

import type { PlayerInfo } from "../types";
import type { SuperTTTGameState, SubBoard, MetaBoard, MetaWinLine } from "./types";

/** Create an empty 3x3 sub-board */
function emptySubBoard(): SubBoard {
  return [null, null, null, null, null, null, null, null, null];
}

/**
 * Create initial state for a new Super Tic Tac Toe game.
 * Validates exactly 2 players (red + blue); sorts so red (X) is first.
 */
export function createInitialState(players: PlayerInfo[]): SuperTTTGameState {
  if (players.length !== 2) {
    throw new Error(`Super Tic Tac Toe requires exactly 2 players, got ${players.length}`);
  }

  const colors = players.map((p) => p.color);
  if (!colors.includes("red") || !colors.includes("blue")) {
    throw new Error("Super Tic Tac Toe requires one red player (X) and one blue player (O)");
  }

  // Sort so red is always index 0 (X goes first)
  const sortedPlayers = [...players].sort((a, b) =>
    a.color === "red" ? -1 : b.color === "red" ? 1 : 0
  );

  const emptyMeta: MetaBoard = [null, null, null, null, null, null, null, null, null];
  const emptyWinLines: (MetaWinLine | null)[] = [null, null, null, null, null, null, null, null, null];

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    boards: Array.from({ length: 9 }, () => emptySubBoard()),
    metaBoard: emptyMeta,
    activeBoard: null,
    currentMark: "X",
    metaWinLine: null,
    isDraw: false,
    subBoardWinLines: emptyWinLines,
  };
}
