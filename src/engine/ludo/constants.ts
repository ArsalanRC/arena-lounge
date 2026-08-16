/**
 * Ludo board constants.
 *
 * Board is a 15×15 grid with a cross-shaped track.
 * Coordinates are [row, col] with (0,0) at top-left.
 *
 * Yard quadrants:
 *   Red   = bottom-left  (rows 9-14, cols 0-5)
 *   Blue  = top-left     (rows 0-5,  cols 0-5)
 *   Green = top-right    (rows 0-5,  cols 9-14)
 *   Yellow = bottom-right (rows 9-14, cols 9-14)
 */

import type { PlayerColor } from "../types";

// ---------------------------------------------------------------------------
// Board dimensions
// ---------------------------------------------------------------------------
export const BOARD_SIZE = 15;

// ---------------------------------------------------------------------------
// Position constants
// ---------------------------------------------------------------------------
export const YARD_POSITION = -1;
export const HOME_POSITION = 58;
export const TRACK_LENGTH = 52; // positions 0–51 on shared track
export const HOME_COLUMN_START = 52; // positions 52–57 are home column
export const HOME_COLUMN_LENGTH = 6;
export const PIECES_PER_PLAYER = 4;

// ---------------------------------------------------------------------------
// Start offsets (absolute position on the shared track)
// ---------------------------------------------------------------------------
export const START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

// ---------------------------------------------------------------------------
// Safe positions (absolute track positions where captures cannot happen)
// Includes all 4 start positions + 4 midpoints between starts
// ---------------------------------------------------------------------------
export const SAFE_POSITIONS: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

// ---------------------------------------------------------------------------
// Home entry positions (absolute)
// The last shared track cell for each color before entering home column.
// For color C with start offset S: home entry absolute = (S + 51) % 52
// ---------------------------------------------------------------------------
export const HOME_ENTRY_POSITIONS: Record<PlayerColor, number> = {
  red: 51, // (0 + 51) % 52
  blue: 12, // (13 + 51) % 52 = 64 % 52
  green: 25, // (26 + 51) % 52 = 77 % 52
  yellow: 38, // (39 + 51) % 52 = 90 % 52
};

// ---------------------------------------------------------------------------
// Shared track: 52 cells as [row, col] coordinates on the 15×15 grid
// Traced clockwise starting from Red's start position.
// ---------------------------------------------------------------------------
export const TRACK_COORDINATES: [number, number][] = [
  // Segment: Up the left col of bottom arm (Red start area)
  [13, 6], // 0  — RED START
  [12, 6], // 1
  [11, 6], // 2
  [10, 6], // 3
  [9, 6], // 4

  // Segment: Left across bottom of left arm
  [8, 5], // 5
  [8, 4], // 6
  [8, 3], // 7
  [8, 2], // 8  — SAFE
  [8, 1], // 9
  [8, 0], // 10

  // Segment: U-turn at left tip
  [7, 0], // 11
  [6, 0], // 12

  // Segment: Right across top of left arm (Blue start area)
  [6, 1], // 13 — BLUE START
  [6, 2], // 14
  [6, 3], // 15
  [6, 4], // 16
  [6, 5], // 17

  // Segment: Up the left col of top arm
  [5, 6], // 18
  [4, 6], // 19
  [3, 6], // 20
  [2, 6], // 21 — SAFE
  [1, 6], // 22
  [0, 6], // 23

  // Segment: U-turn at top tip
  [0, 7], // 24
  [0, 8], // 25

  // Segment: Down the right col of top arm (Green start area)
  [1, 8], // 26 — GREEN START
  [2, 8], // 27
  [3, 8], // 28
  [4, 8], // 29
  [5, 8], // 30

  // Segment: Right across top of right arm
  [6, 9], // 31
  [6, 10], // 32
  [6, 11], // 33
  [6, 12], // 34 — SAFE
  [6, 13], // 35
  [6, 14], // 36

  // Segment: U-turn at right tip
  [7, 14], // 37
  [8, 14], // 38

  // Segment: Left across bottom of right arm (Yellow start area)
  [8, 13], // 39 — YELLOW START
  [8, 12], // 40
  [8, 11], // 41
  [8, 10], // 42
  [8, 9], // 43

  // Segment: Down the right col of bottom arm
  [9, 8], // 44
  [10, 8], // 45
  [11, 8], // 46
  [12, 8], // 47 — SAFE
  [13, 8], // 48

  // Segment: U-turn at bottom tip
  [14, 8], // 49
  [14, 7], // 50
  [14, 6], // 51
];

// ---------------------------------------------------------------------------
// Home columns: 6 cells per player leading toward center [row, col]
// Home column index 0 = closest to track, index 5 = closest to center
// ---------------------------------------------------------------------------
export const HOME_COLUMNS: Record<PlayerColor, [number, number][]> = {
  red: [
    [13, 7], // 52
    [12, 7], // 53
    [11, 7], // 54
    [10, 7], // 55
    [9, 7], // 56
    [8, 7], // 57
  ],
  blue: [
    [7, 1], // 52
    [7, 2], // 53
    [7, 3], // 54
    [7, 4], // 55
    [7, 5], // 56
    [7, 6], // 57
  ],
  green: [
    [1, 7], // 52
    [2, 7], // 53
    [3, 7], // 54
    [4, 7], // 55
    [5, 7], // 56
    [6, 7], // 57
  ],
  yellow: [
    [7, 13], // 52
    [7, 12], // 53
    [7, 11], // 54
    [7, 10], // 55
    [7, 9], // 56
    [7, 8], // 57
  ],
};

// ---------------------------------------------------------------------------
// Center / HOME position
// ---------------------------------------------------------------------------
export const HOME_COORDINATE: [number, number] = [7, 7];

// ---------------------------------------------------------------------------
// Yard piece positions (4 pieces per player) [row, col]
// Positioned inside each quadrant's 6×6 area
// ---------------------------------------------------------------------------
export const YARD_COORDINATES: Record<PlayerColor, [number, number][]> = {
  red: [
    [11, 2],
    [11, 3],
    [12, 2],
    [12, 3],
  ],
  blue: [
    [2, 2],
    [2, 3],
    [3, 2],
    [3, 3],
  ],
  green: [
    [2, 11],
    [2, 12],
    [3, 11],
    [3, 12],
  ],
  yellow: [
    [11, 11],
    [11, 12],
    [12, 11],
    [12, 12],
  ],
};

// ---------------------------------------------------------------------------
// Player colors in turn order
// ---------------------------------------------------------------------------
export const COLOR_ORDER: PlayerColor[] = ["red", "blue", "green", "yellow"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a relative position for a given color to an absolute track position (0–51). */
export function relativeToAbsolute(relativePos: number, color: PlayerColor): number {
  if (relativePos < 0 || relativePos > 51) {
    throw new Error(`Cannot convert relative position ${relativePos} to absolute — not on shared track`);
  }
  return (relativePos + START_OFFSETS[color]) % TRACK_LENGTH;
}

/** Convert an absolute track position (0–51) to a relative position for the given color. */
export function absoluteToRelative(absolutePos: number, color: PlayerColor): number {
  return (absolutePos - START_OFFSETS[color] + TRACK_LENGTH) % TRACK_LENGTH;
}
