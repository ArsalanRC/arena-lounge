/**
 * Sea Strike (Battleship) engine types.
 *
 * Two 10x10 grids per player — one ocean board (own ships) and one target board
 * (tracking shots on opponent). Players secretly place 5 ships, then take turns
 * calling shots. First to sink all 5 enemy ships wins.
 *
 * 2 players only. Red goes first.
 */

import type { BaseGameState, BaseGameMove } from "../types";

/** Cell state on a player's ocean grid */
export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

/** Ship orientation */
export type Orientation = "horizontal" | "vertical";

/** Ship definition (fleet member) */
export interface ShipDef {
  id: string;
  name: string;
  size: number;
}

/** Ship instance on a player's board */
export interface Ship {
  id: string;
  name: string;
  size: number;
  cells: number[];
  orientation: Orientation;
  hits: number[];
  isSunk: boolean;
}

/** One player's ocean board */
export interface PlayerBoard {
  grid: CellState[];
  ships: Ship[];
  allShipsPlaced: boolean;
}

/** Sea Strike game state extending the shared base */
export interface SeaStrikeGameState extends BaseGameState {
  phase: "setup" | "attacking";
  boards: [PlayerBoard, PlayerBoard];
  lastShotResult: {
    cell: number;
    result: "hit" | "miss" | "sunk";
    shipId?: string;
  } | null;
}

/** Ship placement move (setup phase) */
export interface SeaStrikePlacement extends BaseGameMove {
  type: "placement";
  shipId: string;
  startCell: number;
  orientation: Orientation;
}

/** Shot move (attack phase) */
export interface SeaStrikeShot extends BaseGameMove {
  type: "shot";
  targetCell: number;
}

/** Union of all Sea Strike move types */
export type SeaStrikeMove = SeaStrikePlacement | SeaStrikeShot;
