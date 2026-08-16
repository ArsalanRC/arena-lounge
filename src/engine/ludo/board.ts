/**
 * Board coordinate system for SVG rendering.
 * Maps abstract positions to (x, y) coordinates on the 15×15 grid.
 */

import type { PlayerColor } from "../types";
import {
  YARD_POSITION,
  HOME_POSITION,
  HOME_COLUMN_START,
  TRACK_COORDINATES,
  HOME_COLUMNS,
  HOME_COORDINATE,
  YARD_COORDINATES,
  SAFE_POSITIONS,
  relativeToAbsolute,
} from "./constants";

export interface BoardCoordinate {
  row: number;
  col: number;
}

/**
 * Convert a relative position (for a given color) to board coordinates.
 * Returns { row, col } for SVG rendering.
 */
export function positionToXY(
  relativePosition: number,
  color: PlayerColor,
  pieceIndex: number = 0
): BoardCoordinate {
  // Yard — return yard-specific coordinates
  if (relativePosition === YARD_POSITION) {
    const yardCoords = YARD_COORDINATES[color];
    const idx = Math.min(pieceIndex, yardCoords.length - 1);
    const [row, col] = yardCoords[idx];
    return { row, col };
  }

  // HOME — center of the board
  if (relativePosition === HOME_POSITION) {
    const [row, col] = HOME_COORDINATE;
    return { row, col };
  }

  // Home column (positions 52–57)
  if (relativePosition >= HOME_COLUMN_START && relativePosition < HOME_POSITION) {
    const homeIndex = relativePosition - HOME_COLUMN_START;
    const [row, col] = HOME_COLUMNS[color][homeIndex];
    return { row, col };
  }

  // Shared track (positions 0–51)
  if (relativePosition >= 0 && relativePosition <= 51) {
    const absolutePos = relativeToAbsolute(relativePosition, color);
    const [row, col] = TRACK_COORDINATES[absolutePos];
    return { row, col };
  }

  throw new Error(`Invalid position: ${relativePosition}`);
}

/**
 * Get all track cell coordinates (for rendering the board path).
 */
export function getTrackCells(): BoardCoordinate[] {
  return TRACK_COORDINATES.map(([row, col]) => ({ row, col }));
}

/**
 * Get home column cell coordinates for a player color.
 */
export function getHomeColumnCells(color: PlayerColor): BoardCoordinate[] {
  return HOME_COLUMNS[color].map(([row, col]) => ({ row, col }));
}

/**
 * Get yard cell coordinates for a player color.
 */
export function getYardCells(color: PlayerColor): BoardCoordinate[] {
  return YARD_COORDINATES[color].map(([row, col]) => ({ row, col }));
}

/**
 * Check if a track cell is a safe zone.
 */
export function isSafeCell(absoluteTrackPosition: number): boolean {
  return SAFE_POSITIONS.includes(absoluteTrackPosition);
}
