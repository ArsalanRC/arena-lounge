/**
 * Ludo-specific game types.
 *
 * Position system (relative to each player):
 *   -1     = piece is in the yard (home base)
 *   0      = player's starting cell on the shared track
 *   1–51   = next 51 cells clockwise on the shared track
 *   52–57  = home column (6 cells leading to center)
 *   58     = HOME (finished, center of the board)
 *
 * To convert relative → absolute track position:
 *   absolutePos = (relativePos + START_OFFSETS[color]) % 52
 *   (only valid for positions 0–51)
 *
 * Dice modes:
 *   "single" — one die per turn (default)
 *   "double" — two dice per turn, two separate moves, with bust on triple 6-6
 */

import type { BaseGameState, BaseGameMove, PlayerColor, PlayerInfo } from "../types";

/** Whether the game uses one die or two dice per turn. */
export type DiceMode = "single" | "double";

/** Tracks double-dice state within a turn (null in single mode). */
export interface DoubleDiceState {
  diceValues: [number, number];
  diceUsed: [boolean, boolean];
  activeDieIndex: 0 | 1 | null;
  capturedDuringTurn: boolean;
}

/** Positions of all 4 pieces for one player (relative coordinates) */
export type PiecePositions = [number, number, number, number];

export interface LudoGameState extends BaseGameState {
  board: {
    /** Each player's 4 piece positions in relative coordinates */
    pieces: Record<PlayerColor, PiecePositions>;
  };
  currentDiceValue: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  validMoves: ValidMove[];
  turnPhase: "roll" | "move" | "animating";
  finishOrder: string[]; // player IDs in order they finished
  diceMode: DiceMode;
  doubleDice: DoubleDiceState | null;
}

export interface ValidMove extends BaseGameMove {
  pieceIndex: number;
  from: number; // relative position before move
  to: number; // relative position after move
  isCapture: boolean;
  capturedPiece?: { color: PlayerColor; pieceIndex: number };
  isExitYard: boolean; // piece leaving the yard onto start position
  dieIndex?: 0 | 1; // which die this move uses (double mode only)
}

export interface LudoMove extends BaseGameMove {
  pieceIndex: number;
  from: number;
  to: number;
  diceValue: number;
  isCapture: boolean;
  capturedPiece?: { color: PlayerColor; pieceIndex: number };
  dieIndex?: 0 | 1;
}

/** Info passed to create a ludo game */
export type LudoPlayerSetup = PlayerInfo;
