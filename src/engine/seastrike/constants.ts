/**
 * Sea Strike engine constants — grid dimensions, fleet definitions, and ship colors.
 */

import type { PlayerColor } from "../types";
import type { ShipDef } from "./types";

/** Grid is 10x10 = 100 cells */
export const GRID_SIZE = 10;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

/** Standard Battleship fleet (5 ships, 17 total cells) */
export const FLEET: ShipDef[] = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

/** Visual colors for each ship type (used in SVG rendering) */
export const SHIP_COLORS: Record<string, string> = {
  carrier: "#6366f1",
  battleship: "#8b5cf6",
  cruiser: "#a855f7",
  submarine: "#d946ef",
  destroyer: "#ec4899",
};

/** Player colors in turn order */
export const COLOR_ORDER: PlayerColor[] = ["red", "blue"];

/** Exactly 2 players */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

/** Total number of ships per player */
export const SHIP_COUNT = FLEET.length;
