/**
 * Sea Strike bot AI — easy (random), medium (hunt/target), hard (probability density).
 *
 * Setup: all difficulties use random placement (autoPlaceShips).
 * Attack: difficulty determines shot selection strategy.
 */

import type { BotDifficulty } from "../types";
import type { SeaStrikeGameState, SeaStrikeShot, PlayerBoard } from "./types";
import { GRID_SIZE, TOTAL_CELLS, FLEET } from "./constants";
import { indexToRowCol, rowColToIndex } from "./rules";

// ---------------------------------------------------------------------------
// Bot memory (maintained externally via useRef in the bot controller hook)
// ---------------------------------------------------------------------------

export interface BotMemory {
  /** Unsunk hit cells (cleared when the ship they belong to sinks) */
  hits: number[];
  /** Confirmed sunk ship IDs */
  sunkShipIds: string[];
}

export function createBotMemory(): BotMemory {
  return { hits: [], sunkShipIds: [] };
}

/** Update bot memory after observing a shot result. */
export function updateBotMemory(
  memory: BotMemory,
  state: SeaStrikeGameState,
  botPlayerIndex: number
): BotMemory {
  const opponentIndex = botPlayerIndex === 0 ? 1 : 0;
  const opponentBoard = state.boards[opponentIndex];

  // Collect all unsunk hit cells
  const hits: number[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (opponentBoard.grid[i] === "hit") {
      hits.push(i);
    }
  }

  const sunkShipIds = opponentBoard.ships
    .filter((s) => s.isSunk)
    .map((s) => s.id);

  return { hits, sunkShipIds };
}

// ---------------------------------------------------------------------------
// Easy bot: random valid shot
// ---------------------------------------------------------------------------

function selectEasyMove(validMoves: SeaStrikeShot[]): SeaStrikeShot | null {
  if (validMoves.length === 0) return null;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

// ---------------------------------------------------------------------------
// Medium bot: hunt/target mode with checkerboard parity
// ---------------------------------------------------------------------------

function getAdjacentCells(cell: number): number[] {
  const { row, col } = indexToRowCol(cell);
  const adj: number[] = [];
  if (row > 0) adj.push(rowColToIndex(row - 1, col));
  if (row < GRID_SIZE - 1) adj.push(rowColToIndex(row + 1, col));
  if (col > 0) adj.push(rowColToIndex(row, col - 1));
  if (col < GRID_SIZE - 1) adj.push(rowColToIndex(row, col + 1));
  return adj;
}

function selectMediumMove(
  validMoves: SeaStrikeShot[],
  memory: BotMemory
): SeaStrikeShot | null {
  if (validMoves.length === 0) return null;

  const validCells = new Set(validMoves.map((m) => m.targetCell));

  // Target mode: if we have unsunk hits, target adjacent cells
  if (memory.hits.length > 0) {
    // If 2+ hits exist, try to continue in the same line direction
    if (memory.hits.length >= 2) {
      const sorted = [...memory.hits].sort((a, b) => a - b);
      const first = indexToRowCol(sorted[0]);
      const second = indexToRowCol(sorted[1]);

      if (first.row === second.row) {
        // Horizontal line — extend left and right
        const minCol = Math.min(...sorted.map((c) => indexToRowCol(c).col));
        const maxCol = Math.max(...sorted.map((c) => indexToRowCol(c).col));
        const leftCell = rowColToIndex(first.row, minCol - 1);
        const rightCell = rowColToIndex(first.row, maxCol + 1);

        if (minCol > 0 && validCells.has(leftCell)) {
          return validMoves.find((m) => m.targetCell === leftCell)!;
        }
        if (maxCol < GRID_SIZE - 1 && validCells.has(rightCell)) {
          return validMoves.find((m) => m.targetCell === rightCell)!;
        }
      }

      if (first.col === second.col) {
        // Vertical line — extend up and down
        const minRow = Math.min(...sorted.map((c) => indexToRowCol(c).row));
        const maxRow = Math.max(...sorted.map((c) => indexToRowCol(c).row));
        const upCell = rowColToIndex(minRow - 1, first.col);
        const downCell = rowColToIndex(maxRow + 1, first.col);

        if (minRow > 0 && validCells.has(upCell)) {
          return validMoves.find((m) => m.targetCell === upCell)!;
        }
        if (maxRow < GRID_SIZE - 1 && validCells.has(downCell)) {
          return validMoves.find((m) => m.targetCell === downCell)!;
        }
      }
    }

    // Target adjacent to any unsunk hit
    for (const hit of memory.hits) {
      const adj = getAdjacentCells(hit);
      for (const cell of adj) {
        if (validCells.has(cell)) {
          return validMoves.find((m) => m.targetCell === cell)!;
        }
      }
    }
  }

  // Hunt mode: checkerboard parity (skip every other cell)
  const parityMoves = validMoves.filter((m) => {
    const { row, col } = indexToRowCol(m.targetCell);
    return (row + col) % 2 === 0;
  });

  const huntPool = parityMoves.length > 0 ? parityMoves : validMoves;
  return huntPool[Math.floor(Math.random() * huntPool.length)];
}

// ---------------------------------------------------------------------------
// Hard bot: probability density function
// ---------------------------------------------------------------------------

function selectHardMove(
  validMoves: SeaStrikeShot[],
  memory: BotMemory,
  opponentBoard: PlayerBoard
): SeaStrikeShot | null {
  if (validMoves.length === 0) return null;

  const validCells = new Set(validMoves.map((m) => m.targetCell));

  // Build probability density map
  const density = new Array(TOTAL_CELLS).fill(0);

  // Determine which ships haven't been sunk yet
  const remainingShips = FLEET.filter((def) => !memory.sunkShipIds.includes(def.id));

  for (const shipDef of remainingShips) {
    // Try every possible placement for this ship
    for (let startCell = 0; startCell < TOTAL_CELLS; startCell++) {
      for (const orientation of ["horizontal", "vertical"] as const) {
        const { row, col } = indexToRowCol(startCell);

        // Bounds check
        if (orientation === "horizontal" && col + shipDef.size > GRID_SIZE) continue;
        if (orientation === "vertical" && row + shipDef.size > GRID_SIZE) continue;

        // Get cells for this placement
        const cells: number[] = [];
        let valid = true;
        let coversHit = false;

        for (let i = 0; i < shipDef.size; i++) {
          const cell = orientation === "horizontal"
            ? rowColToIndex(row, col + i)
            : rowColToIndex(row + i, col);

          const state = opponentBoard.grid[cell];
          if (state === "miss" || state === "sunk") {
            valid = false;
            break;
          }
          if (state === "hit") {
            coversHit = true;
          }
          cells.push(cell);
        }

        if (!valid) continue;

        // In target mode, prefer placements that cover known hits
        const weight = (memory.hits.length > 0 && coversHit) ? 10 : 1;

        for (const cell of cells) {
          if (validCells.has(cell)) {
            density[cell] += weight;
          }
        }
      }
    }
  }

  // Pick the cell with the highest density
  let bestCell = -1;
  let bestDensity = -1;

  for (const move of validMoves) {
    if (density[move.targetCell] > bestDensity) {
      bestDensity = density[move.targetCell];
      bestCell = move.targetCell;
    }
  }

  if (bestCell === -1) return selectEasyMove(validMoves);
  return validMoves.find((m) => m.targetCell === bestCell)!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Select a bot move based on difficulty. */
export function selectBotMove(
  state: SeaStrikeGameState,
  validMoves: SeaStrikeShot[],
  difficulty: BotDifficulty,
  memory: BotMemory
): SeaStrikeShot | null {
  if (validMoves.length === 0) return null;

  const botIndex = state.currentPlayerIndex;
  const opponentIndex = botIndex === 0 ? 1 : 0;
  const opponentBoard = state.boards[opponentIndex];

  switch (difficulty) {
    case "easy":
      return selectEasyMove(validMoves);
    case "medium":
      return selectMediumMove(validMoves, memory);
    case "hard":
      return selectHardMove(validMoves, memory, opponentBoard);
    default:
      return selectEasyMove(validMoves);
  }
}
