/**
 * Dot Lines rules — move application, legal-move generation, and game-over
 * detection.
 *
 * Edge coordinate conventions:
 *   Horizontal edge (h, r, c): between dots (r,c) and (r,c+1).
 *     r ∈ [0, rows], c ∈ [0, cols-1].
 *   Vertical edge (v, r, c): between dots (r,c) and (r+1,c).
 *     r ∈ [0, rows-1], c ∈ [0, cols].
 *
 * Box at (boxR, boxC) is bounded by:
 *   top    = horizontal edge (h, boxR,   boxC)
 *   bottom = horizontal edge (h, boxR+1, boxC)
 *   left   = vertical edge   (v, boxR,   boxC)
 *   right  = vertical edge   (v, boxR,   boxC+1)
 *
 * If drawing one edge completes all 4 sides of one or more boxes, the current
 * player claims those boxes and takes another turn. Otherwise the turn passes.
 */

import type { DotLinesGameState, DotLinesMove } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Count the number of drawn sides around box (boxR, boxC).
 * Returns a number from 0 to 4.
 */
export function countSides(
  boxR: number,
  boxC: number,
  state: DotLinesGameState
): number {
  let drawn = 0;
  if (state.horizontalLines[boxR][boxC]) drawn++;       // top
  if (state.horizontalLines[boxR + 1][boxC]) drawn++;   // bottom
  if (state.verticalLines[boxR][boxC]) drawn++;         // left
  if (state.verticalLines[boxR][boxC + 1]) drawn++;     // right
  return drawn;
}

/** Returns true when all boxes are claimed (game over). */
export function isGameOver(state: DotLinesGameState): boolean {
  return state.status === "finished";
}

// ---------------------------------------------------------------------------
// Legal-move generation
// ---------------------------------------------------------------------------

/** Return every undrawn edge as a DotLinesMove for the current player. */
export function getLegalMoves(state: DotLinesGameState): DotLinesMove[] {
  if (state.status !== "playing") return [];

  const player = state.players[state.currentPlayerIndex];
  const moves: DotLinesMove[] = [];
  const ts = Date.now();

  // Horizontal edges
  for (let r = 0; r <= state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (!state.horizontalLines[r][c]) {
        moves.push({
          kind: "draw",
          orientation: "h",
          row: r,
          col: c,
          playerId: player.id,
          color: player.color,
          timestamp: ts,
        });
      }
    }
  }

  // Vertical edges
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c <= state.cols; c++) {
      if (!state.verticalLines[r][c]) {
        moves.push({
          kind: "draw",
          orientation: "v",
          row: r,
          col: c,
          playerId: player.id,
          color: player.color,
          timestamp: ts,
        });
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------------------------
// Move application
// ---------------------------------------------------------------------------

/**
 * Apply a move to the state and return a new state (immutable update).
 *
 * Steps:
 * 1. Validate the move (edge must be in bounds and not already drawn).
 * 2. Draw the edge.
 * 3. Detect any newly-completed boxes adjacent to this edge.
 * 4. If boxes were completed → claim them for the current player, same turn.
 * 5. Otherwise advance to the next player.
 * 6. If all boxes are claimed → finish the game.
 */
export function applyMove(
  state: DotLinesGameState,
  move: DotLinesMove
): DotLinesGameState {
  if (state.status !== "playing") {
    throw new Error("Game is not in progress");
  }

  const { orientation, row, col } = move;

  // Validate bounds and that the edge is undrawn
  if (orientation === "h") {
    if (row < 0 || row > state.rows || col < 0 || col >= state.cols) {
      throw new Error(`Invalid horizontal edge (${row}, ${col})`);
    }
    if (state.horizontalLines[row][col]) {
      throw new Error(`Horizontal edge (${row}, ${col}) already drawn`);
    }
  } else {
    if (row < 0 || row >= state.rows || col < 0 || col > state.cols) {
      throw new Error(`Invalid vertical edge (${row}, ${col})`);
    }
    if (state.verticalLines[row][col]) {
      throw new Error(`Vertical edge (${row}, ${col}) already drawn`);
    }
  }

  // Deep-copy edges and boxes
  const horizontalLines = state.horizontalLines.map((r) => [...r]);
  const verticalLines = state.verticalLines.map((r) => [...r]);
  const boxes = state.boxes.map((r) => r.map((box) => ({ ...box })));
  const scores = [...state.scores];

  // Draw the edge
  if (orientation === "h") {
    horizontalLines[row][col] = true;
  } else {
    verticalLines[row][col] = true;
  }

  // Discover which adjacent boxes might now be complete.
  // Each edge borders at most 2 boxes.
  const adjacentBoxes = getAdjacentBoxes(orientation, row, col, state.rows, state.cols);

  const completedBoxes: Array<{ row: number; col: number }> = [];
  const currentPlayerIndex = state.currentPlayerIndex;

  const tempState: DotLinesGameState = {
    ...state,
    horizontalLines,
    verticalLines,
    boxes,
    scores,
  };

  for (const { row: br, col: bc } of adjacentBoxes) {
    // Check if this box is now complete (all 4 sides drawn)
    const top = horizontalLines[br][bc];
    const bottom = horizontalLines[br + 1][bc];
    const left = verticalLines[br][bc];
    const right = verticalLines[br][bc + 1];
    if (top && bottom && left && right && boxes[br][bc].ownerIndex === null) {
      boxes[br][bc] = { ownerIndex: currentPlayerIndex };
      scores[currentPlayerIndex]++;
      completedBoxes.push({ row: br, col: bc });
    }
  }

  // Count total claimed boxes to check for game over
  const totalClaimed = scores.reduce((a, b) => a + b, 0);
  const totalBoxes = state.rows * state.cols;
  const gameOver = totalClaimed === totalBoxes;

  // If the current player claimed at least one box they go again (unless game over)
  const claimedThisTurn = completedBoxes.length > 0;
  const nextPlayerIndex =
    claimedThisTurn || gameOver
      ? currentPlayerIndex
      : currentPlayerIndex === 0
        ? 1
        : 0;

  let finishOrder: string[] = [];
  if (gameOver) {
    // Determine finish order by score descending; ties share position
    const [s0, s1] = scores;
    if (s0 > s1) {
      finishOrder = [state.players[0].id, state.players[1].id];
    } else if (s1 > s0) {
      finishOrder = [state.players[1].id, state.players[0].id];
    } else {
      // Draw — both share first place
      finishOrder = [state.players[0].id, state.players[1].id];
    }
  }

  // Suppress TS warning — tempState is used only for helper call above
  void tempState;

  return {
    ...state,
    horizontalLines,
    verticalLines,
    boxes,
    scores,
    currentPlayerIndex: gameOver ? currentPlayerIndex : nextPlayerIndex,
    turnNumber: state.turnNumber + 1,
    status: gameOver ? "finished" : "playing",
    finishOrder,
    lastMove: {
      orientation,
      row,
      col,
      completedBoxes,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the (up to 2) box coordinates that share the given edge.
 *
 * For horizontal edge (h, r, c):
 *   - box above = (r-1, c) if r > 0
 *   - box below = (r,   c) if r < rows
 *
 * For vertical edge (v, r, c):
 *   - box left  = (r, c-1) if c > 0
 *   - box right = (r, c)   if c < cols
 */
function getAdjacentBoxes(
  orientation: "h" | "v",
  row: number,
  col: number,
  rows: number,
  cols: number
): Array<{ row: number; col: number }> {
  const result: Array<{ row: number; col: number }> = [];
  if (orientation === "h") {
    // Above: box at (row-1, col)
    if (row > 0) result.push({ row: row - 1, col });
    // Below: box at (row, col)
    if (row < rows) result.push({ row, col });
  } else {
    // Left: box at (row, col-1)
    if (col > 0) result.push({ row, col: col - 1 });
    // Right: box at (row, col)
    if (col < cols) result.push({ row, col });
  }
  return result;
}
