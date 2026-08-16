/**
 * Super TTT game rules — core logic for the nested board game.
 *
 * Reuses WIN_LINES and checkWinner from the regular TTT engine for sub-board
 * win detection. Adds meta-board win/draw detection, active board constraints,
 * free pick fallback, and move application with full state transitions.
 */

import type { TTTBoard, Mark } from "../tictactoe/types";
import { COLOR_TO_MARK } from "../tictactoe/types";
import { WIN_LINES, checkWinner, isBoardFull } from "../tictactoe/rules";
import type {
  SuperTTTGameState,
  SuperTTTMove,
  MetaBoard,
  MetaWinLine,
  SubBoard,
} from "./types";

// ---------------------------------------------------------------------------
// Meta-board win/draw detection
// ---------------------------------------------------------------------------

/** Check if a mark has won on the meta-board (3 sub-boards in a row) */
export function checkMetaWinner(metaBoard: MetaBoard, mark: "X" | "O"): MetaWinLine | null {
  for (const line of WIN_LINES) {
    if (
      metaBoard[line[0]] === mark &&
      metaBoard[line[1]] === mark &&
      metaBoard[line[2]] === mark
    ) {
      return line as MetaWinLine;
    }
  }
  return null;
}

/** Check if the meta-board is fully decided (all cells won or drawn) */
export function isMetaBoardFull(metaBoard: MetaBoard): boolean {
  return metaBoard.every((cell) => cell !== null);
}

/** Check if a sub-board is still playable (not yet decided) */
export function isSubBoardPlayable(metaBoard: MetaBoard, boardIndex: number): boolean {
  return metaBoard[boardIndex] === null;
}

// ---------------------------------------------------------------------------
// Valid moves
// ---------------------------------------------------------------------------

/** Get all valid moves for the current player */
export function getValidMoves(state: SuperTTTGameState): SuperTTTMove[] {
  if (state.status !== "playing") return [];

  const currentPlayer = state.players[state.currentPlayerIndex];
  const mark = COLOR_TO_MARK[currentPlayer.color as "red" | "blue"];
  const moves: SuperTTTMove[] = [];

  // Determine which boards the player can play in
  const playableBoards: number[] = [];

  if (state.activeBoard !== null && isSubBoardPlayable(state.metaBoard, state.activeBoard)) {
    // Must play in the active board
    playableBoards.push(state.activeBoard);
  } else {
    // Free pick: any open board
    for (let b = 0; b < 9; b++) {
      if (isSubBoardPlayable(state.metaBoard, b)) {
        playableBoards.push(b);
      }
    }
  }

  for (const boardIndex of playableBoards) {
    const board = state.boards[boardIndex];
    for (let c = 0; c < 9; c++) {
      if (board[c] === null) {
        moves.push({
          playerId: currentPlayer.id,
          color: currentPlayer.color,
          timestamp: Date.now(),
          boardIndex,
          cellIndex: c,
          mark,
        });
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------------------------
// Move application
// ---------------------------------------------------------------------------

/** Apply a move and return the new game state */
export function applyMove(state: SuperTTTGameState, move: SuperTTTMove): SuperTTTGameState {
  // Validate move target
  if (!isSubBoardPlayable(state.metaBoard, move.boardIndex)) {
    throw new Error(`Sub-board ${move.boardIndex} is already decided`);
  }
  if (state.boards[move.boardIndex][move.cellIndex] !== null) {
    throw new Error(`Cell ${move.cellIndex} in board ${move.boardIndex} is already occupied`);
  }

  // Place mark on sub-board
  const newBoards = state.boards.map((b) => [...b] as SubBoard);
  newBoards[move.boardIndex][move.cellIndex] = move.mark;

  // Check if sub-board is now won or drawn
  const newMetaBoard = [...state.metaBoard] as MetaBoard;
  const newSubBoardWinLines = [...state.subBoardWinLines];

  const subWinLine = checkWinner(newBoards[move.boardIndex] as TTTBoard, move.mark);
  if (subWinLine) {
    newMetaBoard[move.boardIndex] = move.mark;
    newSubBoardWinLines[move.boardIndex] = subWinLine as MetaWinLine;
  } else if (isBoardFull(newBoards[move.boardIndex] as TTTBoard)) {
    newMetaBoard[move.boardIndex] = "drawn";
  }

  // Check if meta-board is now won or drawn
  const metaWinLine = checkMetaWinner(newMetaBoard, move.mark);
  if (metaWinLine) {
    return {
      ...state,
      boards: newBoards,
      metaBoard: newMetaBoard,
      subBoardWinLines: newSubBoardWinLines,
      metaWinLine,
      status: "finished",
      isDraw: false,
      activeBoard: null,
      finishOrder: [move.playerId, state.players[1 - state.currentPlayerIndex].id],
    };
  }

  if (isMetaBoardFull(newMetaBoard)) {
    return {
      ...state,
      boards: newBoards,
      metaBoard: newMetaBoard,
      subBoardWinLines: newSubBoardWinLines,
      metaWinLine: null,
      status: "finished",
      isDraw: true,
      activeBoard: null,
      finishOrder: state.players.map((p) => p.id),
    };
  }

  // Determine next active board: the cell index of this move
  // If that board is already decided, free pick (null)
  const nextActiveBoard = isSubBoardPlayable(newMetaBoard, move.cellIndex)
    ? move.cellIndex
    : null;

  // Switch player
  const nextIndex = 1 - state.currentPlayerIndex;
  const nextMark: Mark = move.mark === "X" ? "O" : "X";

  return {
    ...state,
    boards: newBoards,
    metaBoard: newMetaBoard,
    subBoardWinLines: newSubBoardWinLines,
    currentPlayerIndex: nextIndex,
    currentMark: nextMark,
    turnNumber: state.turnNumber + 1,
    activeBoard: nextActiveBoard,
  };
}
