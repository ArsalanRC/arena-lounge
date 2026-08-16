/**
 * Croc Snap engine constants — tooth count, player limits, and color order.
 */

import type { PlayerColor } from "../types";

/** Number of teeth per round */
export const TEETH_COUNT = 12;

/** Player colors in turn order */
export const COLOR_ORDER: PlayerColor[] = ["red", "blue", "green", "yellow"];

/** Min/max players */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
