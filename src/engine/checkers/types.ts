/**
 * Checkers (American draughts) engine types.
 *
 * 8×8 board, pieces occupy dark squares only. White (red platform
 * player, player_order=0) moves first; black (blue) plays second.
 *
 * Board indexing: flat 64-element array. Index = rank * 8 + file.
 *   - rank 0 = white's back rank (white pieces start on ranks 0..2)
 *   - rank 7 = black's back rank (black pieces start on ranks 5..7)
 *   - file 0 = a-file (queenside), file 7 = h-file
 *
 * Dark squares (where pieces live) satisfy `(file + rank) % 2 === 1`.
 */

import type { BaseGameMove, BaseGameState } from "../types";

export type CheckersPieceType = "man" | "king";
export type CheckersPieceColor = "white" | "black";

export interface CheckersPiece {
  type: CheckersPieceType;
  color: CheckersPieceColor;
}

export type CheckersBoard = (CheckersPiece | null)[];

/**
 * A checkers move — either a simple step to an adjacent diagonal square or a
 * complete jump sequence (single or chained).
 *
 * `captures` lists every captured piece's square, in the order captured.
 * `path` lists the moving piece's visited squares, starting with `from` and
 * ending with `to`. For simple (non-jump) moves, `path = [from, to]` and
 * `captures = []`. For multi-jumps, `path` is longer than 2.
 *
 * `promoted` is true if the move ends on the opposite back rank AND the
 * moving piece was a man. (Kings obviously don't re-promote.)
 */
export interface CheckersMove extends BaseGameMove {
  from: number;
  to: number;
  captures: number[];
  path: number[];
  promoted?: boolean;
}

export type DrawReason = "forty_move" | "repetition" | "stalemate";

export type GameResult =
  | "in_progress"
  | "white_wins"
  | "black_wins"
  | "draw";

export interface CheckersGameState extends BaseGameState {
  board: CheckersBoard;
  /** Whose turn it is — redundant with currentPlayerIndex. */
  turnColor: CheckersPieceColor;
  /**
   * Halfmoves since the last capture or man advance. Draw declared after 80
   * (40 full moves) — a common tournament default for American checkers when
   * neither side has recently progressed.
   */
  halfmoveClock: number;
  fullmoveNumber: number;
  gameResult: GameResult;
  drawReason?: DrawReason;
  lastMove: CheckersMove | null;
}
