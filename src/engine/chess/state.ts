/**
 * Chess state creation — initialises a 2-player game from the standard
 * starting position. White always moves first; by platform convention, the
 * red player_order=0 plays white and blue plays black.
 */

import type { PlayerInfo } from "../types";
import type { ChessGameState } from "./types";
import { INITIAL_BOARD, MIN_PLAYERS, MAX_PLAYERS } from "./constants";
import { hashPosition } from "./rules";

/** Create the initial state for a new chess game (standard opening position). */
export function createInitialState(players: PlayerInfo[]): ChessGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Chess requires exactly ${MIN_PLAYERS} players, got ${players.length}`
    );
  }

  // Sort so red is at index 0 (white) and blue at index 1 (black).
  const colorOrder = ["red", "blue"];
  const sortedPlayers = [...players].sort(
    (a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)
  );

  const initialCastling = {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true,
  };
  const initialBoard = [...INITIAL_BOARD];

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    board: initialBoard,
    turnColor: "white",
    castlingRights: initialCastling,
    enPassantSquare: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    check: false,
    gameResult: "in_progress",
    lastMove: null,
    positionHistory: [
      hashPosition(initialBoard, "white", initialCastling, null),
    ],
  };
}
