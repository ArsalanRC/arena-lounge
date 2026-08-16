/**
 * Checkers rules — move generation, application, and end-of-game detection.
 *
 * American checkers conventions:
 *   - Men move one square diagonally forward (toward the opposite back rank).
 *   - Men capture by jumping over an adjacent enemy to the empty square
 *     beyond (one square in each direction).
 *   - Kings move / capture one square diagonally in any direction.
 *   - Captures are FORCED: if any jump is available, you MUST jump.
 *   - Multi-jumps: after a jump, the same piece must continue jumping while
 *     legal. `getValidMoves` returns maximal jump sequences.
 *   - A man that finishes a move on the opposite back rank is PROMOTED to
 *     king. Promotion mid-jump ends the sequence (American rule: "stop on
 *     king").
 *   - Game ends when the side to move has no legal moves (they lose) or the
 *     halfmove clock hits the 80-halfmove draw threshold.
 */

import type {
  CheckersBoard,
  CheckersGameState,
  CheckersMove,
  CheckersPiece,
  CheckersPieceColor,
} from "./types";
import { BOARD_SIZE, HALFMOVE_DRAW_LIMIT, TOTAL_SQUARES } from "./constants";

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export const fileOf = (sq: number): number => sq % BOARD_SIZE;
export const rankOf = (sq: number): number => Math.floor(sq / BOARD_SIZE);
export const frToSq = (file: number, rank: number): number =>
  rank * BOARD_SIZE + file;
export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;

export const isDarkSquare = (sq: number): boolean =>
  (fileOf(sq) + rankOf(sq)) % 2 === 1;

const opposite = (c: CheckersPieceColor): CheckersPieceColor =>
  c === "white" ? "black" : "white";

/** Offsets the piece can step in one square. Men move forward; kings go anywhere. */
function legalDirections(piece: CheckersPiece): ReadonlyArray<readonly [number, number]> {
  if (piece.type === "king") {
    return [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
  }
  return piece.color === "white"
    ? [
        [1, 1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [-1, -1],
      ];
}

/**
 * Is the move ending square on the opposite back rank for the moving colour?
 * Used to detect man → king promotion.
 */
function isPromotionSquare(color: CheckersPieceColor, sq: number): boolean {
  const r = rankOf(sq);
  return color === "white" ? r === 7 : r === 0;
}

// ---------------------------------------------------------------------------
// Move generation
// ---------------------------------------------------------------------------

/**
 * Return the legal moves for the side to move. If any jump exists, only
 * jumps are returned (forced captures). Every returned move is a maximal
 * sequence — chained jumps have `captures.length > 1`.
 */
export function getValidMoves(state: CheckersGameState): CheckersMove[] {
  if (state.status !== "playing" || state.gameResult !== "in_progress") {
    return [];
  }
  const currentPlayer = state.players[state.currentPlayerIndex];

  // 1. Try to generate all jump sequences.
  const jumpSequences: Array<Omit<CheckersMove, keyof { playerId: unknown; color: unknown; timestamp: unknown }>> = [];
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const piece = state.board[sq];
    if (!piece || piece.color !== state.turnColor) continue;
    const seqs = findJumpSequences(state.board, sq, piece, [], [sq]);
    jumpSequences.push(...seqs);
  }

  if (jumpSequences.length > 0) {
    return jumpSequences.map((m) => ({
      ...m,
      playerId: currentPlayer.id,
      color: currentPlayer.color,
      timestamp: Date.now(),
      promoted:
        state.board[m.from]?.type === "man" &&
        isPromotionSquare(state.turnColor, m.to),
    }));
  }

  // 2. No jumps → simple one-square moves.
  const simples: Array<Omit<CheckersMove, keyof { playerId: unknown; color: unknown; timestamp: unknown }>> = [];
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const piece = state.board[sq];
    if (!piece || piece.color !== state.turnColor) continue;
    const f = fileOf(sq);
    const r = rankOf(sq);
    for (const [df, dr] of legalDirections(piece)) {
      const nf = f + df;
      const nr = r + dr;
      if (!onBoard(nf, nr)) continue;
      const to = frToSq(nf, nr);
      if (state.board[to]) continue;
      simples.push({
        from: sq,
        to,
        captures: [],
        path: [sq, to],
      });
    }
  }

  return simples.map((m) => ({
    ...m,
    playerId: currentPlayer.id,
    color: currentPlayer.color,
    timestamp: Date.now(),
    promoted:
      state.board[m.from]?.type === "man" &&
      isPromotionSquare(state.turnColor, m.to),
  }));
}

/**
 * Recursively enumerate all maximal jump paths from `currentSq`. Captured
 * pieces remain on the board until the sequence ends — we track them in
 * `captures` so the search doesn't re-capture or land on one.
 */
function findJumpSequences(
  board: CheckersBoard,
  currentSq: number,
  piece: CheckersPiece,
  captures: number[],
  path: number[]
): Array<Omit<CheckersMove, keyof { playerId: unknown; color: unknown; timestamp: unknown }>> {
  // American rule: a man promotes ONCE it lands on the back rank, and the
  // jump sequence ENDS (no further king-style jumps that turn).
  const pieceIsKingNow =
    piece.type === "king" ||
    (piece.color === "white" && rankOf(currentSq) === 7) ||
    (piece.color === "black" && rankOf(currentSq) === 0);
  const stopOnKingPromotion =
    piece.type === "man" && pieceIsKingNow && path.length > 1;

  const immediate = stopOnKingPromotion
    ? []
    : findImmediateJumps(board, currentSq, piece, captures);

  if (immediate.length === 0) {
    // Terminal — return the accumulated sequence if any capture happened.
    if (captures.length === 0) return [];
    return [
      {
        from: path[0],
        to: currentSq,
        captures: [...captures],
        path: [...path],
      },
    ];
  }

  const results = [];
  for (const j of immediate) {
    const sub = findJumpSequences(
      board,
      j.to,
      piece,
      [...captures, j.captureSquare],
      [...path, j.to]
    );
    if (sub.length === 0) {
      // Shouldn't happen (recursion always terminates with ≥1 sequence when
      // an immediate jump exists), but be defensive.
      results.push({
        from: path[0],
        to: j.to,
        captures: [...captures, j.captureSquare],
        path: [...path, j.to],
      });
    } else {
      results.push(...sub);
    }
  }
  return results;
}

interface ImmediateJump {
  to: number;
  captureSquare: number;
}

function findImmediateJumps(
  board: CheckersBoard,
  from: number,
  piece: CheckersPiece,
  alreadyCaptured: number[]
): ImmediateJump[] {
  const jumps: ImmediateJump[] = [];
  const f = fileOf(from);
  const r = rankOf(from);
  for (const [df, dr] of legalDirections(piece)) {
    const midFile = f + df;
    const midRank = r + dr;
    const dstFile = f + df * 2;
    const dstRank = r + dr * 2;
    if (!onBoard(dstFile, dstRank)) continue;
    const midSq = frToSq(midFile, midRank);
    const dstSq = frToSq(dstFile, dstRank);
    if (alreadyCaptured.includes(midSq)) continue;
    const midPiece = board[midSq];
    if (!midPiece || midPiece.color === piece.color) continue;
    // Destination must be empty OR the starting square of THIS multi-jump
    // (can't happen for simple jumps; defensive guard for chained paths).
    if (board[dstSq] && dstSq !== from) continue;
    jumps.push({ to: dstSq, captureSquare: midSq });
  }
  return jumps;
}

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

export function applyMove(
  state: CheckersGameState,
  move: CheckersMove
): CheckersGameState {
  if (state.status !== "playing" || state.gameResult !== "in_progress") {
    throw new Error("Game is not in progress");
  }
  const piece = state.board[move.from];
  if (!piece || piece.color !== state.turnColor) {
    throw new Error(`Invalid move: no ${state.turnColor} piece at from-square`);
  }

  const board: CheckersBoard = [...state.board];
  board[move.from] = null;

  for (const capturedSq of move.captures) {
    board[capturedSq] = null;
  }

  // Promote if the move ends on the back rank and we were a man.
  const promoting = piece.type === "man" && isPromotionSquare(piece.color, move.to);
  const arriving: CheckersPiece = promoting ? { type: "king", color: piece.color } : piece;
  board[move.to] = arriving;

  const isManMove = piece.type === "man";
  const isCapture = move.captures.length > 0;
  const nextHalfmove = isCapture || isManMove ? 0 : state.halfmoveClock + 1;

  const nextTurnColor = opposite(state.turnColor);
  const nextPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;

  const nextState: CheckersGameState = {
    ...state,
    board,
    turnColor: nextTurnColor,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: state.turnNumber + 1,
    fullmoveNumber:
      piece.color === "black" ? state.fullmoveNumber + 1 : state.fullmoveNumber,
    halfmoveClock: nextHalfmove,
    lastMove: { ...move, promoted: promoting },
    gameResult: "in_progress",
    drawReason: undefined,
  };

  return finaliseGameResult(nextState);
}

function finaliseGameResult(state: CheckersGameState): CheckersGameState {
  const legal = getValidMoves(state);

  if (legal.length === 0) {
    // Side to move has no moves — they lose.
    const winnerColor = opposite(state.turnColor);
    const winner = state.players.find(
      (p) => (winnerColor === "white" ? p.color === "red" : p.color === "blue")
    );
    const loser = state.players.find((p) => p.id !== winner?.id);
    return {
      ...state,
      status: "finished",
      gameResult: winnerColor === "white" ? "white_wins" : "black_wins",
      finishOrder: winner && loser ? [winner.id, loser.id] : state.finishOrder,
    };
  }

  if (state.halfmoveClock >= HALFMOVE_DRAW_LIMIT) {
    return {
      ...state,
      status: "finished",
      gameResult: "draw",
      drawReason: "forty_move",
      finishOrder: state.players.map((p) => p.id),
    };
  }

  return state;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Count pieces of a colour on the board — tie-break / eval helper. */
export function countPieces(
  board: CheckersBoard,
  color: CheckersPieceColor
): { men: number; kings: number } {
  let men = 0;
  let kings = 0;
  for (const p of board) {
    if (!p || p.color !== color) continue;
    if (p.type === "king") kings++;
    else men++;
  }
  return { men, kings };
}
