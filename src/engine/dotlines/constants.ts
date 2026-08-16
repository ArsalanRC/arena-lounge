/**
 * Dot Lines engine constants.
 *
 * Default grid: 5×5 boxes → 6×6 dot grid → 60 edges (30 horizontal + 30 vertical).
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

/** Default number of box rows (and columns). */
export const DEFAULT_ROWS = 5;
export const DEFAULT_COLS = 5;

/** Total number of boxes in the default grid. */
export const DEFAULT_BOX_COUNT = DEFAULT_ROWS * DEFAULT_COLS; // 25

/**
 * Total edges in the default grid:
 *   horizontal = (ROWS+1) * COLS = 6 * 5 = 30
 *   vertical   = ROWS * (COLS+1) = 5 * 6 = 30
 */
export const DEFAULT_TOTAL_EDGES =
  (DEFAULT_ROWS + 1) * DEFAULT_COLS + DEFAULT_ROWS * (DEFAULT_COLS + 1); // 60

/** Visual size of a dot in SVG units. */
export const DOT_RADIUS = 0.18;

/** Thickness of drawn edge lines in SVG units. */
export const LINE_WIDTH = 0.18;

/** Width of the transparent hit-area for undrawn edges, in SVG units. */
export const HIT_AREA_WIDTH = 0.7;

/** Gap between dots in SVG units (= 1 unit per cell). */
export const CELL_SIZE = 1;
