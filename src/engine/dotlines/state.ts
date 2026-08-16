/**
 * Dot Lines state creation — initialises a 2-player game on an empty ROWS×COLS
 * box grid. Player 0 (red) always goes first.
 */

import type { PlayerInfo } from "../types";
import type { DotLinesGameState } from "./types";
import { MIN_PLAYERS, MAX_PLAYERS, DEFAULT_ROWS, DEFAULT_COLS } from "./constants";

export function createInitialState(
  players: PlayerInfo[],
  rows: number = DEFAULT_ROWS,
  cols: number = DEFAULT_COLS
): DotLinesGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Dot Lines requires exactly ${MIN_PLAYERS} players, got ${players.length}`
    );
  }

  // Horizontal edges: (rows+1) rows × cols columns
  const horizontalLines: boolean[][] = Array.from({ length: rows + 1 }, () =>
    Array(cols).fill(false)
  );

  // Vertical edges: rows rows × (cols+1) columns
  const verticalLines: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols + 1).fill(false)
  );

  // Boxes: rows × cols
  const boxes = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ownerIndex: null }))
  );

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
    rows,
    cols,
    horizontalLines,
    verticalLines,
    boxes,
    scores: sortedPlayers.map(() => 0),
    lastMove: null,
  };
}
