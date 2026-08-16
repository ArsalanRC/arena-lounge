/**
 * Sea Strike game rules — ship placement, shot mechanics, and win detection.
 *
 * Setup phase: players place 5 ships on their 10x10 ocean grid.
 * Attack phase: players take turns firing shots at the opponent's grid.
 * First to sink all 5 enemy ships wins.
 */

import type {
  SeaStrikeGameState,
  SeaStrikePlacement,
  SeaStrikeShot,
  PlayerBoard,
  Ship,
  CellState,
  Orientation,
} from "./types";
import { GRID_SIZE, TOTAL_CELLS, FLEET } from "./constants";

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

/** Convert flat index to row/col. */
export function indexToRowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

/** Convert row/col to flat index. */
export function rowColToIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

/** Get the cells a ship would occupy given start cell and orientation. */
export function getShipCells(
  startCell: number,
  size: number,
  orientation: Orientation
): number[] {
  const { row, col } = indexToRowCol(startCell);
  const cells: number[] = [];

  for (let i = 0; i < size; i++) {
    if (orientation === "horizontal") {
      cells.push(rowColToIndex(row, col + i));
    } else {
      cells.push(rowColToIndex(row + i, col));
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

/** Check if a ship placement is valid (within bounds, no overlap). */
export function isValidPlacement(
  board: PlayerBoard,
  shipSize: number,
  startCell: number,
  orientation: Orientation,
  excludeShipId?: string
): boolean {
  const { row, col } = indexToRowCol(startCell);

  // Bounds check
  if (orientation === "horizontal" && col + shipSize > GRID_SIZE) return false;
  if (orientation === "vertical" && row + shipSize > GRID_SIZE) return false;

  const cells = getShipCells(startCell, shipSize, orientation);

  // Overlap check: ensure no cell is occupied by another ship
  for (const cell of cells) {
    if (board.grid[cell] === "ship") {
      // Check if it's a different ship (allow self-overlap when repositioning)
      if (excludeShipId) {
        const occupyingShip = board.ships.find(
          (s) => s.id !== excludeShipId && s.cells.includes(cell)
        );
        if (occupyingShip) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

/** Get all valid start cells for a ship with the given orientation. */
export function getValidPlacements(
  board: PlayerBoard,
  shipId: string,
  orientation: Orientation
): number[] {
  const ship = board.ships.find((s) => s.id === shipId);
  if (!ship) return [];

  const validStarts: number[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (isValidPlacement(board, ship.size, i, orientation, shipId)) {
      validStarts.push(i);
    }
  }
  return validStarts;
}

// ---------------------------------------------------------------------------
// Ship placement
// ---------------------------------------------------------------------------

/** Place a ship on the player's board. Returns updated board. */
export function placeShip(
  board: PlayerBoard,
  placement: { shipId: string; startCell: number; orientation: Orientation }
): PlayerBoard {
  const { shipId, startCell, orientation } = placement;
  const shipIndex = board.ships.findIndex((s) => s.id === shipId);
  if (shipIndex === -1) throw new Error(`Unknown ship: ${shipId}`);

  const ship = board.ships[shipIndex];

  // Remove ship from current position if already placed
  const grid = [...board.grid] as CellState[];
  for (const cell of ship.cells) {
    grid[cell] = "empty";
  }

  // Validate new placement
  const tempBoard = { ...board, grid };
  if (!isValidPlacement(tempBoard, ship.size, startCell, orientation)) {
    throw new Error(`Invalid placement for ${shipId} at ${startCell} ${orientation}`);
  }

  // Place ship at new position
  const newCells = getShipCells(startCell, ship.size, orientation);
  for (const cell of newCells) {
    grid[cell] = "ship";
  }

  const newShips = [...board.ships];
  newShips[shipIndex] = { ...ship, cells: newCells, orientation };

  const allPlaced = newShips.every((s) => s.cells.length > 0);

  return { grid, ships: newShips, allShipsPlaced: allPlaced };
}

/** Remove a ship from the board (for repositioning). Returns updated board. */
export function removeShip(board: PlayerBoard, shipId: string): PlayerBoard {
  const shipIndex = board.ships.findIndex((s) => s.id === shipId);
  if (shipIndex === -1) throw new Error(`Unknown ship: ${shipId}`);

  const ship = board.ships[shipIndex];
  const grid = [...board.grid] as CellState[];

  for (const cell of ship.cells) {
    grid[cell] = "empty";
  }

  const newShips = [...board.ships];
  newShips[shipIndex] = { ...ship, cells: [], orientation: "horizontal" };

  return { grid, ships: newShips, allShipsPlaced: false };
}

/** Randomly place all unplaced ships on the board. Returns updated board. */
export function autoPlaceShips(board: PlayerBoard): PlayerBoard {
  let currentBoard = { ...board, grid: [...board.grid] as CellState[], ships: [...board.ships] };

  // Clear all existing placements first
  for (const ship of currentBoard.ships) {
    if (ship.cells.length > 0) {
      currentBoard = removeShip(currentBoard, ship.id);
    }
  }

  // Place each ship randomly
  for (const shipDef of FLEET) {
    const orientations: Orientation[] = ["horizontal", "vertical"];
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      const orientation = orientations[Math.floor(Math.random() * 2)];
      const startCell = Math.floor(Math.random() * TOTAL_CELLS);

      if (isValidPlacement(currentBoard, shipDef.size, startCell, orientation)) {
        currentBoard = placeShip(currentBoard, {
          shipId: shipDef.id,
          startCell,
          orientation,
        });
        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      throw new Error(`Failed to auto-place ${shipDef.id} after 200 attempts`);
    }
  }

  return currentBoard;
}

// ---------------------------------------------------------------------------
// Setup phase state management
// ---------------------------------------------------------------------------

/** Apply a ship placement to the game state. */
export function applyPlacement(
  state: SeaStrikeGameState,
  placement: SeaStrikePlacement
): SeaStrikeGameState {
  if (state.phase !== "setup") {
    throw new Error("Can only place ships during setup phase");
  }

  const playerIndex = state.currentPlayerIndex;
  const newBoards: [PlayerBoard, PlayerBoard] = [...state.boards];
  newBoards[playerIndex] = placeShip(newBoards[playerIndex], placement);

  return { ...state, boards: newBoards };
}

/** Confirm a player's ship placement. Transitions to attack phase when both are ready. */
export function confirmPlacement(
  state: SeaStrikeGameState,
  playerIndex: number
): SeaStrikeGameState {
  if (state.phase !== "setup") {
    throw new Error("Can only confirm placement during setup phase");
  }

  if (!state.boards[playerIndex].allShipsPlaced) {
    throw new Error("Must place all ships before confirming");
  }

  // Check if the other player has also confirmed
  const otherIndex = playerIndex === 0 ? 1 : 0;
  const otherReady = state.boards[otherIndex].allShipsPlaced;

  if (otherReady) {
    // Both players ready — transition to attack phase
    return {
      ...state,
      phase: "attacking",
      currentPlayerIndex: 0, // Red always attacks first
    };
  }

  // Switch to other player for their setup
  return {
    ...state,
    currentPlayerIndex: otherIndex,
  };
}

// ---------------------------------------------------------------------------
// Attack phase
// ---------------------------------------------------------------------------

/** Get all valid shot targets on the opponent's board. */
export function getValidMoves(state: SeaStrikeGameState): SeaStrikeShot[] {
  if (state.status !== "playing" || state.phase !== "attacking") return [];

  const currentPlayer = state.players[state.currentPlayerIndex];
  const opponentIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  const opponentBoard = state.boards[opponentIndex];

  const validShots: SeaStrikeShot[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = opponentBoard.grid[i];
    if (cell === "empty" || cell === "ship") {
      validShots.push({
        playerId: currentPlayer.id,
        color: currentPlayer.color,
        timestamp: Date.now(),
        type: "shot",
        targetCell: i,
      });
    }
  }

  return validShots;
}

/** Get the ship at a given cell on a board, if any. */
export function getShipAt(board: PlayerBoard, cellIndex: number): Ship | undefined {
  return board.ships.find((s) => s.cells.includes(cellIndex));
}

/** Check if all ships on a board are sunk. */
export function isAllSunk(board: PlayerBoard): boolean {
  return board.ships.every((s) => s.isSunk);
}

/** Apply a shot move and return the new game state. */
export function applyMove(
  state: SeaStrikeGameState,
  move: SeaStrikeShot
): SeaStrikeGameState {
  if (state.phase !== "attacking") {
    throw new Error("Can only fire shots during attack phase");
  }

  const { targetCell } = move;
  const opponentIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  const opponentBoard = state.boards[opponentIndex];

  // Validate: can't shoot a cell that's already been shot
  const cellState = opponentBoard.grid[targetCell];
  if (cellState === "hit" || cellState === "miss" || cellState === "sunk") {
    throw new Error(`Cell ${targetCell} has already been shot`);
  }

  const newGrid = [...opponentBoard.grid] as CellState[];
  const newShips = opponentBoard.ships.map((s) => ({ ...s, hits: [...s.hits] }));
  let shotResult: SeaStrikeGameState["lastShotResult"];

  if (cellState === "ship") {
    // Hit!
    newGrid[targetCell] = "hit";

    // Find which ship was hit and record the hit
    const shipIndex = newShips.findIndex((s) => s.cells.includes(targetCell));
    const ship = newShips[shipIndex];
    ship.hits.push(targetCell);

    // Check if ship is sunk
    if (ship.hits.length === ship.size) {
      ship.isSunk = true;
      // Mark all ship cells as "sunk"
      for (const cell of ship.cells) {
        newGrid[cell] = "sunk";
      }
      shotResult = { cell: targetCell, result: "sunk", shipId: ship.id };
    } else {
      shotResult = { cell: targetCell, result: "hit", shipId: ship.id };
    }
  } else {
    // Miss
    newGrid[targetCell] = "miss";
    shotResult = { cell: targetCell, result: "miss" };
  }

  const newOpponentBoard: PlayerBoard = {
    ...opponentBoard,
    grid: newGrid,
    ships: newShips,
  };

  const newBoards: [PlayerBoard, PlayerBoard] = [...state.boards];
  newBoards[opponentIndex] = newOpponentBoard;

  // Check win condition
  if (isAllSunk(newOpponentBoard)) {
    const winnerId = state.players[state.currentPlayerIndex].id;
    const loserId = state.players[opponentIndex].id;

    return {
      ...state,
      boards: newBoards,
      status: "finished",
      finishOrder: [winnerId, loserId],
      lastShotResult: shotResult,
      turnNumber: state.turnNumber + 1,
    };
  }

  // Advance to next player
  return {
    ...state,
    boards: newBoards,
    currentPlayerIndex: opponentIndex,
    lastShotResult: shotResult,
    turnNumber: state.turnNumber + 1,
  };
}
