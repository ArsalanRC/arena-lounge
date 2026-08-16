/**
 * Checkers engine constants — piece values, piece-square tables, and the
 * starting board.
 *
 * White pieces occupy dark squares on ranks 0..2; black pieces occupy dark
 * squares on ranks 5..7; ranks 3..4 are empty. Kings can reach the table
 * bonuses of the man row they're on but also get a flat king bonus.
 */

import type { CheckersBoard, CheckersPieceType } from "./types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const BOARD_SIZE = 8;
export const TOTAL_SQUARES = 64;

/** Piece values used by the bot eval (arbitrary units, kings ~60 % bonus). */
export const PIECE_VALUES: Record<CheckersPieceType, number> = {
  man: 100,
  king: 160,
};

/** Man piece-square bonus — encourage advance + central control. Indexed from
 *  white's perspective (index 0 = a1); mirror for black. Zero on unusable
 *  (light) squares so the eval doesn't reward invalid positions. */
export const MAN_PST: number[] = [
   0,  0,  0,  0,  0,  0,  0,  0,
   4,  0,  6,  0,  6,  0,  4,  0,
   0,  4,  0,  6,  0,  6,  0,  4,
   6,  0,  8,  0, 10,  0,  6,  0,
   0,  6,  0, 10,  0,  8,  0,  6,
   8,  0, 12,  0, 12,  0,  8,  0,
   0, 10,  0, 14,  0, 14,  0, 10,
  16,  0, 18,  0, 18,  0, 16,  0,
];

/** King piece-square bonus — prefer central squares. */
export const KING_PST: number[] = [
   0,  0,  0,  0,  0,  0,  0,  0,
   0,  2,  0,  4,  0,  4,  0,  2,
   2,  0,  6,  0,  6,  0,  4,  0,
   0,  6,  0, 10,  0, 10,  0,  4,
   4,  0, 10,  0, 10,  0,  6,  0,
   0,  4,  0,  6,  0,  6,  0,  2,
   2,  0,  4,  0,  4,  0,  2,  0,
   0,  2,  0,  0,  0,  0,  0,  0,
];

/** Starting position: 12 whites + 12 blacks on dark squares. */
export const INITIAL_BOARD: CheckersBoard = (() => {
  const board: CheckersBoard = Array(TOTAL_SQUARES).fill(null);
  for (let rank = 0; rank < 3; rank++) {
    for (let file = 0; file < 8; file++) {
      if ((file + rank) % 2 === 1) {
        board[rank * 8 + file] = { type: "man", color: "white" };
      }
    }
  }
  for (let rank = 5; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if ((file + rank) % 2 === 1) {
        board[rank * 8 + file] = { type: "man", color: "black" };
      }
    }
  }
  return board;
})();

/** Turn limit before 40-move-draw rule kicks in (halfmoves). */
export const HALFMOVE_DRAW_LIMIT = 80;
