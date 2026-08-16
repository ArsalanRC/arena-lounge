/**
 * Reversi rules — move validation, application, and end-of-game detection.
 *
 * Core rules:
 *   - A placement is legal if it flanks ≥1 enemy disc in any of the 8
 *     directions between the new square and an existing friendly disc
 *     (the flanked run must be non-empty).
 *   - All flanked runs flip on placement.
 *   - If the player to move has no legal placement they must pass.
 *   - When both players pass consecutively the game ends.
 *   - Highest disc count wins; equal counts are a draw.
 */

import type { ReversiCell, ReversiGameState, ReversiMove } from "./types";
import { SIZE, DIRECTIONS } from "./constants";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function opposite(color: "black" | "white"): "black" | "white" {
  return color === "black" ? "white" : "black";
}

function currentColor(state: ReversiGameState): "black" | "white" {
  // Player 0 is always black; player 1 is always white.
  return state.currentPlayerIndex === 0 ? "black" : "white";
}

/** Deep-clone a board row array. */
function cloneBoard(board: ReversiCell[][]): ReversiCell[][] {
  return board.map((row) => [...row]);
}

// ---------------------------------------------------------------------------
// Core rule functions
// ---------------------------------------------------------------------------

/**
 * Return the list of [row, col] coordinates that would be flipped if `color`
 * places a disc at (r, c). An empty return means the move is illegal.
 *
 * A flip run in direction [dr, dc] starts one step from (r,c), must consist
 * entirely of enemy discs, and must end with a friendly disc (not the edge).
 */
export function getFlipsFor(
  board: ReversiCell[][],
  color: "black" | "white",
  r: number,
  c: number
): Array<[number, number]> {
  if (board[r][c] !== "empty") return [];

  const enemy = opposite(color);
  const flips: Array<[number, number]> = [];

  for (const [dr, dc] of DIRECTIONS) {
    const run: Array<[number, number]> = [];
    let nr = r + dr;
    let nc = c + dc;

    // Accumulate consecutive enemy discs in this direction.
    while (inBounds(nr, nc) && board[nr][nc] === enemy) {
      run.push([nr, nc]);
      nr += dr;
      nc += dc;
    }

    // A non-empty run is valid only if it terminates with a friendly disc.
    if (run.length > 0 && inBounds(nr, nc) && board[nr][nc] === color) {
      flips.push(...run);
    }
  }

  return flips;
}

/**
 * Return all squares where the current player may legally place a disc.
 * Returns an empty array when no placement is possible (player must pass).
 */
export function getLegalMoves(
  state: ReversiGameState
): Array<{ r: number; c: number }> {
  if (state.status !== "playing") return [];
  const color = currentColor(state);
  const moves: Array<{ r: number; c: number }> = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (getFlipsFor(state.board, color, r, c).length > 0) {
        moves.push({ r, c });
      }
    }
  }

  return moves;
}

/**
 * Return true if `color` has at least one legal placement on the board.
 * Used to check whether the *opponent* can move after a pass.
 */
export function hasLegalMove(
  board: ReversiCell[][],
  color: "black" | "white"
): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (getFlipsFor(board, color, r, c).length > 0) return true;
    }
  }
  return false;
}

/** Count discs of each colour on the board. */
export function score(board: ReversiCell[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") black++;
      else if (cell === "white") white++;
    }
  }
  return { black, white };
}

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

/**
 * Apply a move to the game state and return the new state (pure — no mutation).
 *
 * For a "place" move: the disc is added and all flanked runs are flipped;
 * passCount resets to 0. For a "pass" move: passCount increments; when it
 * reaches 2 the game is over.
 */
export function applyMove(
  state: ReversiGameState,
  move: ReversiMove
): ReversiGameState {
  if (state.status !== "playing") {
    throw new Error("Game is not in progress");
  }

  const color = currentColor(state);
  const nextPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;

  if (move.kind === "pass") {
    const newPassCount = state.passCount + 1;
    const gameOver = newPassCount >= 2;

    if (!gameOver) {
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        turnNumber: state.turnNumber + 1,
        passCount: newPassCount,
        lastMove: null,
      };
    }

    // Both sides passed — determine the winner.
    return finalise({ ...state, passCount: newPassCount, lastMove: null });
  }

  // "place" move
  const { row, col } = move as { row: number; col: number };
  const flips = getFlipsFor(state.board, color, row, col);

  if (flips.length === 0) {
    throw new Error(`Illegal placement at (${row},${col}) for ${color}`);
  }

  const board = cloneBoard(state.board);
  board[row][col] = color;
  for (const [fr, fc] of flips) {
    board[fr][fc] = color;
  }

  const nextColor: "black" | "white" = color === "black" ? "white" : "black";
  // If the opponent cannot move, the current player gets another turn
  // (or the game ends if neither can move).
  const opponentCanMove = hasLegalMove(board, nextColor);
  const nextIdx = opponentCanMove ? nextPlayerIndex : state.currentPlayerIndex;

  // Check if the current player also cannot move after the opponent's pass.
  const currentCanMove = opponentCanMove || hasLegalMove(board, color);
  if (!currentCanMove) {
    // Neither side can move — game over.
    return finalise({
      ...state,
      board,
      currentPlayerIndex: nextIdx,
      turnNumber: state.turnNumber + 1,
      passCount: 0,
      lastMove: { r: row, c: col },
    });
  }

  return {
    ...state,
    board,
    currentPlayerIndex: nextIdx,
    turnNumber: state.turnNumber + 1,
    passCount: 0,
    lastMove: { r: row, c: col },
  };
}

/** Compute final standings and mark the game finished. */
function finalise(state: ReversiGameState): ReversiGameState {
  const { black, white } = score(state.board);
  const [p0, p1] = state.players; // p0 = black, p1 = white

  let finishOrder: string[];
  if (black > white) {
    finishOrder = [p0.id, p1.id];
  } else if (white > black) {
    finishOrder = [p1.id, p0.id];
  } else {
    // Draw — both players share first place.
    finishOrder = [p0.id, p1.id];
  }

  return {
    ...state,
    status: "finished",
    finishOrder,
  };
}
