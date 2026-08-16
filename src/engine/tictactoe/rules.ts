/**
 * TTT game rules — win detection, valid moves, and move application.
 *
 * All 8 winning lines (3 rows, 3 cols, 2 diags) are checked after each move.
 * A draw occurs when the board is full with no winner.
 */

import type { TTTBoard, TTTGameState, TTTMove, WinLine, Mark } from "./types";
import { COLOR_TO_MARK } from "./types";

/** All 8 possible winning lines */
export const WIN_LINES: WinLine[] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

/** Check if the given mark has won. Returns the winning line or null. */
export function checkWinner(board: TTTBoard, mark: Mark): WinLine | null {
  for (const line of WIN_LINES) {
    if (
      board[line[0]] === mark &&
      board[line[1]] === mark &&
      board[line[2]] === mark
    ) {
      return line;
    }
  }
  return null;
}

/** Check if the board is completely filled */
export function isBoardFull(board: TTTBoard): boolean {
  return board.every((cell) => cell !== null);
}

/** Get all valid moves for the current player */
export function getValidMoves(state: TTTGameState): TTTMove[] {
  if (state.status !== "playing") return [];

  const currentPlayer = state.players[state.currentPlayerIndex];
  const mark = COLOR_TO_MARK[currentPlayer.color as "red" | "blue"];

  const moves: TTTMove[] = [];
  for (let i = 0; i < 9; i++) {
    if (state.board[i] === null) {
      moves.push({
        playerId: currentPlayer.id,
        color: currentPlayer.color,
        timestamp: Date.now(),
        cellIndex: i,
        mark,
      });
    }
  }
  return moves;
}

/** Apply a move and return the new game state */
export function applyMove(state: TTTGameState, move: TTTMove): TTTGameState {
  if (state.board[move.cellIndex] !== null) {
    throw new Error(`Cell ${move.cellIndex} is already occupied`);
  }

  const newBoard = [...state.board] as TTTBoard;
  newBoard[move.cellIndex] = move.mark;

  // Check for win
  const winLine = checkWinner(newBoard, move.mark);
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      status: "finished",
      winLine,
      isDraw: false,
      finishOrder: [move.playerId, state.players[1 - state.currentPlayerIndex].id],
    };
  }

  // Check for draw
  if (isBoardFull(newBoard)) {
    return {
      ...state,
      board: newBoard,
      status: "finished",
      winLine: null,
      isDraw: true,
      finishOrder: state.players.map((p) => p.id),
    };
  }

  // Switch to next player
  const nextIndex = 1 - state.currentPlayerIndex;
  const nextMark: Mark = move.mark === "X" ? "O" : "X";

  return {
    ...state,
    board: newBoard,
    currentPlayerIndex: nextIndex,
    currentMark: nextMark,
    turnNumber: state.turnNumber + 1,
  };
}
