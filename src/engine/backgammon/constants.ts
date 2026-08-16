/**
 * Backgammon engine constants — starting layout + helpers.
 */

import type { BackgammonColor, BackgammonPoint } from "./types";

/** Total checkers each side controls. Win = bear off all 15. */
export const CHECKERS_PER_SIDE = 15;

/** Number of points on the board (excluding bar / off). */
export const POINT_COUNT = 24;

/** Which indices belong to each player's home board (for bearing off). */
export const HOME_POINTS: Record<BackgammonColor, number[]> = {
  white: [0, 1, 2, 3, 4, 5],
  black: [18, 19, 20, 21, 22, 23],
};

/** Which index a bar-bound checker enters onto for the given pip. */
export function barEntryPoint(color: BackgammonColor, pips: number): number {
  // White enters from point 24 side → point index = 24 - pips = (23..18).
  // Black enters from point -1 side → point index = pips - 1 = (0..5).
  if (color === "white") return 24 - pips;
  return pips - 1;
}

/** Direction of travel: white -1 (high → low), black +1 (low → high). */
export function moveDirection(color: BackgammonColor): number {
  return color === "white" ? -1 : 1;
}

/** The "off-board" point index equivalent for rules checks — one step beyond home. */
export function offDirectionPastIndex(color: BackgammonColor): number {
  return color === "white" ? -1 : 24;
}

/** Build a fresh standard opening position. */
export function initialPoints(): BackgammonPoint[] {
  const pts: BackgammonPoint[] = Array.from({ length: POINT_COUNT }, () => ({
    count: 0,
    owner: null,
  }));
  const place = (idx: number, color: BackgammonColor, count: number) => {
    pts[idx] = { count, owner: color };
  };
  // White (player 0) — bears off toward 0.
  place(23, "white", 2);
  place(12, "white", 5);
  place(7, "black", 3); // temp — will be overwritten by black slots; use canonical
  // Actually the canonical standard is:
  //   white  24pt=2 (our idx 23), 13pt=5 (idx 12), 8pt=3 (idx 7), 6pt=5 (idx 5)
  //   black  1pt=2  (idx 0),     12pt=5 (idx 11), 17pt=3 (idx 16), 19pt=5 (idx 18)
  // Reset and set the canonical positions cleanly:
  for (let i = 0; i < POINT_COUNT; i++) pts[i] = { count: 0, owner: null };
  place(23, "white", 2);
  place(12, "white", 5);
  place(7, "white", 3);
  place(5, "white", 5);
  place(0, "black", 2);
  place(11, "black", 5);
  place(16, "black", 3);
  place(18, "black", 5);
  return pts;
}

/** Handy inverse — the opposite player color. */
export const OPPOSITE: Record<BackgammonColor, BackgammonColor> = {
  white: "black",
  black: "white",
};
