/**
 * Tic Tac Toe engine types.
 *
 * Board is a flat 9-cell array (row-major):
 *   [0][1][2]
 *   [3][4][5]
 *   [6][7][8]
 *
 * Red always plays X (goes first), Blue always plays O.
 */

import type { BaseGameState, BaseGameMove, PlayerColor } from "../types";

export type CellValue = "X" | "O" | null;

/** 3x3 board as flat array, row-major order */
export type TTTBoard = [
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
];

export type Mark = "X" | "O";

/** Maps player color to their mark */
export const COLOR_TO_MARK: Record<"red" | "blue", Mark> = {
  red: "X",
  blue: "O",
};

/** Maps mark back to player color */
export const MARK_TO_COLOR: Record<Mark, PlayerColor> = {
  X: "red",
  O: "blue",
};

/** Three cell indices forming a winning line */
export type WinLine = [number, number, number];

export interface TTTGameState extends BaseGameState {
  board: TTTBoard;
  currentMark: Mark;
  winLine: WinLine | null;
  isDraw: boolean;
}

export interface TTTMove extends BaseGameMove {
  cellIndex: number;
  mark: Mark;
}
