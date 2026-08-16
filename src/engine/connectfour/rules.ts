/**
 * Connect Four rules — move generation, application, win/draw detection.
 *
 * Gravity: a disc dropped into column c falls to the lowest empty row.
 * Win: 4-in-a-row in any of 4 directions (H / V / diag+ / diag-).
 * Draw: board completely full with no winner.
 */

import type {
  ConnectFourCell,
  ConnectFourDisc,
  ConnectFourGameState,
  ConnectFourMove,
} from "./types";
import { ROWS, COLS, WIN_LENGTH } from "./constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the lowest empty row in a column, or -1 if the column is full. */
export function lowestEmptyRow(
  board: ConnectFourCell[][],
  col: number
): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === "empty") return row;
  }
  return -1;
}

/** True if the column has at least one empty cell. */
export function isColumnPlayable(
  board: ConnectFourCell[][],
  col: number
): boolean {
  return board[0][col] === "empty";
}

// ---------------------------------------------------------------------------
// Move generation
// ---------------------------------------------------------------------------

/** Return one move per playable column. */
export function getLegalMoves(state: ConnectFourGameState): ConnectFourMove[] {
  if (state.status !== "playing") return [];

  const player = state.players[state.currentPlayerIndex];
  const moves: ConnectFourMove[] = [];

  for (let col = 0; col < COLS; col++) {
    const row = lowestEmptyRow(state.board, col);
    if (row === -1) continue;
    moves.push({
      kind: "drop",
      column: col,
      row,
      playerId: player.id,
      color: player.color,
      timestamp: Date.now(),
    });
  }
  return moves;
}

// ---------------------------------------------------------------------------
// Win detection
// ---------------------------------------------------------------------------

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],  // horizontal →
  [1, 0],  // vertical ↓
  [1, 1],  // diagonal ↘
  [1, -1], // diagonal ↙
];

/**
 * Check if placing a disc of `disc` at (lastRow, lastCol) created a 4-in-a-row.
 * Returns the 4 winning cell coords, or null if no win.
 */
export function checkWin(
  board: ConnectFourCell[][],
  lastRow: number,
  lastCol: number
): Array<[number, number]> | null {
  const disc = board[lastRow][lastCol];
  if (disc === "empty") return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line: Array<[number, number]> = [[lastRow, lastCol]];

    // Extend forward
    let r = lastRow + dr;
    let c = lastCol + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === disc) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // Extend backward
    r = lastRow - dr;
    c = lastCol - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === disc) {
      line.unshift([r, c]);
      r -= dr;
      c -= dc;
    }

    if (line.length >= WIN_LENGTH) {
      return line.slice(0, WIN_LENGTH);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Draw detection
// ---------------------------------------------------------------------------

/** True if the board is completely full (no empty cells). */
export function isBoardFull(board: ConnectFourCell[][]): boolean {
  return board[0].every((cell) => cell !== "empty");
}

/** True if the game is drawn — board full with no prior winner. */
export function isDraw(state: ConnectFourGameState): boolean {
  return state.status !== "finished" && isBoardFull(state.board);
}

// ---------------------------------------------------------------------------
// Apply move
// ---------------------------------------------------------------------------

/** Opposite disc colour. */
function oppositeDisc(disc: ConnectFourDisc): ConnectFourDisc {
  return disc === "yellow" ? "red" : "yellow";
}

/**
 * Apply a drop move and return the new state.
 * Throws if the move is illegal (column full or game not in progress).
 */
export function applyMove(
  state: ConnectFourGameState,
  move: ConnectFourMove
): ConnectFourGameState {
  if (state.status !== "playing") {
    throw new Error("Game is not in progress");
  }

  const row = lowestEmptyRow(state.board, move.column);
  if (row === -1) {
    throw new Error(`Column ${move.column} is full`);
  }

  // Copy board — shallow-copy each row; only the landing row changes.
  const board: ConnectFourCell[][] = state.board.map((r, idx) =>
    idx === row ? [...r] : r
  );
  board[row][move.column] = state.currentDisc;

  const winningCells = checkWin(board, row, move.column);

  const nextPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  const full = isBoardFull(board);

  const resolvedMove: ConnectFourMove = { ...move, row };

  if (winningCells) {
    const winner = state.players[state.currentPlayerIndex];
    const loser = state.players[nextPlayerIndex];
    return {
      ...state,
      board,
      status: "finished",
      winningCells,
      lastMove: resolvedMove,
      finishOrder: [winner.id, loser.id],
      turnNumber: state.turnNumber + 1,
    };
  }

  if (full) {
    return {
      ...state,
      board,
      status: "finished",
      winningCells: null,
      lastMove: resolvedMove,
      finishOrder: state.players.map((p) => p.id),
      turnNumber: state.turnNumber + 1,
    };
  }

  return {
    ...state,
    board,
    status: "playing",
    currentPlayerIndex: nextPlayerIndex,
    currentDisc: oppositeDisc(state.currentDisc),
    winningCells: null,
    lastMove: resolvedMove,
    turnNumber: state.turnNumber + 1,
  };
}
