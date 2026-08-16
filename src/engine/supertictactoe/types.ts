/**
 * Super Tic Tac Toe engine types.
 *
 * A 3x3 meta-grid of 3x3 TTT boards. Each sub-board is a flat 9-cell array (row-major).
 * The meta-board tracks which sub-boards are won, drawn, or still open.
 *
 * Red always plays X (goes first), Blue always plays O.
 */

import type { BaseGameState, BaseGameMove } from "../types";
import type { CellValue } from "../tictactoe/types";

// Re-export TTT primitives used by this engine
export type { CellValue, Mark, WinLine } from "../tictactoe/types";
export { COLOR_TO_MARK, MARK_TO_COLOR } from "../tictactoe/types";

/** A single 3x3 sub-board: flat 9-cell array */
export type SubBoard = [
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
];

/** Status of a meta-cell: won by X/O, drawn, or still in play */
export type MetaCellValue = "X" | "O" | "drawn" | null;

/** 3x3 meta-board tracking sub-board outcomes */
export type MetaBoard = [
  MetaCellValue, MetaCellValue, MetaCellValue,
  MetaCellValue, MetaCellValue, MetaCellValue,
  MetaCellValue, MetaCellValue, MetaCellValue,
];

/** Three cell indices forming a winning line on the meta-board */
export type MetaWinLine = [number, number, number];

export interface SuperTTTGameState extends BaseGameState {
  /** 9 sub-boards, each a flat 9-cell array */
  boards: SubBoard[];
  /** Meta-board tracking outcomes of each sub-board */
  metaBoard: MetaBoard;
  /** Which sub-board the current player must play in (null = free pick) */
  activeBoard: number | null;
  /** Current mark to place */
  currentMark: "X" | "O";
  /** Winning line on the meta-board (if game is won) */
  metaWinLine: MetaWinLine | null;
  /** Whether the game ended in a draw */
  isDraw: boolean;
  /** Winning lines within each sub-board (indexed by board index) */
  subBoardWinLines: (MetaWinLine | null)[];
}

export interface SuperTTTMove extends BaseGameMove {
  /** Which sub-board (0-8) the move is in */
  boardIndex: number;
  /** Which cell (0-8) within the sub-board */
  cellIndex: number;
  /** The mark being placed */
  mark: "X" | "O";
}
