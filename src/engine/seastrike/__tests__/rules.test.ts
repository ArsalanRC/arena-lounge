/**
 * Sea Strike engine rules tests.
 *
 * Covers: initial state, ship placement (valid/invalid), auto-place,
 * setup confirmation, shot mechanics (hit/miss/sunk), win detection,
 * turn alternation, and valid moves.
 */

import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { SeaStrikeGameState, PlayerBoard } from "../types";
import { createInitialState, createEmptyBoard } from "../state";
import {
  isValidPlacement,
  placeShip,
  removeShip,
  autoPlaceShips,
  confirmPlacement,
  getValidMoves,
  applyMove,
  getShipAt,
  isAllSunk,
  indexToRowCol,
  rowColToIndex,
} from "../rules";
import { TOTAL_CELLS } from "../constants";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function makeState(): SeaStrikeGameState {
  return createInitialState(PLAYERS);
}

function placedBoard(): PlayerBoard {
  return autoPlaceShips(createEmptyBoard());
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("creates state with 2 players in setup phase", () => {
    const state = makeState();
    expect(state.status).toBe("playing");
    expect(state.phase).toBe("setup");
    expect(state.players).toHaveLength(2);
    expect(state.players[0].color).toBe("red");
    expect(state.players[1].color).toBe("blue");
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("initializes two empty boards", () => {
    const state = makeState();
    expect(state.boards).toHaveLength(2);
    for (const board of state.boards) {
      expect(board.grid).toHaveLength(TOTAL_CELLS);
      expect(board.grid.every((c) => c === "empty")).toBe(true);
      expect(board.ships).toHaveLength(5);
      expect(board.allShipsPlaced).toBe(false);
    }
  });

  it("throws for wrong player count", () => {
    expect(() => createInitialState([PLAYERS[0]])).toThrow();
    expect(() => createInitialState([...PLAYERS, { id: "p3", color: "green", playerOrder: 2 }])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

describe("grid helpers", () => {
  it("converts index to row/col and back", () => {
    expect(indexToRowCol(0)).toEqual({ row: 0, col: 0 });
    expect(indexToRowCol(15)).toEqual({ row: 1, col: 5 });
    expect(indexToRowCol(99)).toEqual({ row: 9, col: 9 });
    expect(rowColToIndex(3, 7)).toBe(37);
  });
});

// ---------------------------------------------------------------------------
// Ship placement
// ---------------------------------------------------------------------------

describe("isValidPlacement", () => {
  it("allows valid horizontal placement", () => {
    const board = createEmptyBoard();
    expect(isValidPlacement(board, 5, 0, "horizontal")).toBe(true);
    expect(isValidPlacement(board, 3, 47, "horizontal")).toBe(true);
  });

  it("allows valid vertical placement", () => {
    const board = createEmptyBoard();
    expect(isValidPlacement(board, 5, 0, "vertical")).toBe(true);
    expect(isValidPlacement(board, 3, 70, "vertical")).toBe(true);
  });

  it("rejects out of bounds horizontal", () => {
    const board = createEmptyBoard();
    // Column 8, size 5 → extends to col 12, out of bounds
    expect(isValidPlacement(board, 5, 8, "horizontal")).toBe(false);
    // Column 9, size 2 → extends to col 10, out of bounds
    expect(isValidPlacement(board, 2, 9, "horizontal")).toBe(false);
  });

  it("rejects out of bounds vertical", () => {
    const board = createEmptyBoard();
    // Row 8, size 5 → extends to row 12, out of bounds
    expect(isValidPlacement(board, 5, 80, "vertical")).toBe(false);
  });

  it("rejects overlap with existing ship", () => {
    let board = createEmptyBoard();
    board = placeShip(board, { shipId: "carrier", startCell: 0, orientation: "horizontal" });
    // Try to place battleship overlapping at cell 2
    expect(isValidPlacement(board, 4, 2, "horizontal")).toBe(false);
  });

  it("allows adjacent ships (touching is OK)", () => {
    let board = createEmptyBoard();
    board = placeShip(board, { shipId: "carrier", startCell: 0, orientation: "horizontal" });
    // Place directly below — adjacent but no overlap
    expect(isValidPlacement(board, 4, 10, "horizontal")).toBe(true);
  });
});

describe("placeShip", () => {
  it("places a ship horizontally", () => {
    const board = placeShip(createEmptyBoard(), {
      shipId: "destroyer",
      startCell: 33,
      orientation: "horizontal",
    });
    const ship = board.ships.find((s) => s.id === "destroyer")!;
    expect(ship.cells).toEqual([33, 34]);
    expect(ship.orientation).toBe("horizontal");
    expect(board.grid[33]).toBe("ship");
    expect(board.grid[34]).toBe("ship");
  });

  it("places a ship vertically", () => {
    const board = placeShip(createEmptyBoard(), {
      shipId: "cruiser",
      startCell: 5,
      orientation: "vertical",
    });
    const ship = board.ships.find((s) => s.id === "cruiser")!;
    expect(ship.cells).toEqual([5, 15, 25]);
    expect(ship.orientation).toBe("vertical");
  });

  it("throws for invalid placement", () => {
    expect(() =>
      placeShip(createEmptyBoard(), { shipId: "carrier", startCell: 8, orientation: "horizontal" })
    ).toThrow();
  });
});

describe("removeShip", () => {
  it("clears ship cells and resets placement", () => {
    let board = placeShip(createEmptyBoard(), {
      shipId: "destroyer",
      startCell: 0,
      orientation: "horizontal",
    });
    expect(board.grid[0]).toBe("ship");
    expect(board.grid[1]).toBe("ship");

    board = removeShip(board, "destroyer");
    expect(board.grid[0]).toBe("empty");
    expect(board.grid[1]).toBe("empty");
    expect(board.ships.find((s) => s.id === "destroyer")!.cells).toEqual([]);
    expect(board.allShipsPlaced).toBe(false);
  });
});

describe("autoPlaceShips", () => {
  it("places all 5 ships with no overlaps", () => {
    const board = autoPlaceShips(createEmptyBoard());
    expect(board.allShipsPlaced).toBe(true);

    // All 17 cells should be "ship"
    const shipCells = board.grid.filter((c) => c === "ship");
    expect(shipCells).toHaveLength(17);

    // No duplicate cell indices across ships
    const allCells = board.ships.flatMap((s) => s.cells);
    const unique = new Set(allCells);
    expect(unique.size).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// Setup phase confirmation
// ---------------------------------------------------------------------------

describe("confirmPlacement", () => {
  it("switches to other player when one confirms", () => {
    let state = makeState();
    // Place all ships for player 0
    state = {
      ...state,
      boards: [placedBoard(), state.boards[1]],
    };

    const next = confirmPlacement(state, 0);
    expect(next.phase).toBe("setup");
    expect(next.currentPlayerIndex).toBe(1);
  });

  it("transitions to attacking when both confirm", () => {
    let state = makeState();
    // Place only player 0's ships first
    state = {
      ...state,
      boards: [placedBoard(), state.boards[1]],
    };

    // Player 0 confirms → switches to player 1
    let next = confirmPlacement(state, 0);
    expect(next.phase).toBe("setup");
    expect(next.currentPlayerIndex).toBe(1);

    // Now place player 1's ships
    next = { ...next, boards: [next.boards[0], placedBoard()] };

    // Player 1 confirms → both ready → transitions to attacking
    next = confirmPlacement(next, 1);
    expect(next.phase).toBe("attacking");
    expect(next.currentPlayerIndex).toBe(0);
  });

  it("throws if ships not all placed", () => {
    const state = makeState();
    expect(() => confirmPlacement(state, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Attack phase
// ---------------------------------------------------------------------------

describe("getValidMoves", () => {
  it("returns all cells on opponent board during attacking", () => {
    let state = makeState();
    state = {
      ...state,
      phase: "attacking",
      boards: [placedBoard(), placedBoard()],
    };

    const moves = getValidMoves(state);
    expect(moves).toHaveLength(TOTAL_CELLS);
    expect(moves[0].type).toBe("shot");
    expect(moves[0].playerId).toBe("p1");
  });

  it("returns empty during setup", () => {
    const state = makeState();
    expect(getValidMoves(state)).toEqual([]);
  });

  it("returns empty when game is finished", () => {
    let state = makeState();
    state = { ...state, phase: "attacking", status: "finished" };
    expect(getValidMoves(state)).toEqual([]);
  });
});

describe("applyMove", () => {
  function attackState(): SeaStrikeGameState {
    const state = makeState();
    return {
      ...state,
      phase: "attacking",
      boards: [placedBoard(), placedBoard()],
    };
  }

  it("records a miss on empty cell", () => {
    const state = attackState();
    // Find an empty cell on opponent's board
    const emptyCell = state.boards[1].grid.findIndex((c) => c === "empty");

    const next = applyMove(state, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: emptyCell,
    });

    expect(next.boards[1].grid[emptyCell]).toBe("miss");
    expect(next.lastShotResult?.result).toBe("miss");
    expect(next.currentPlayerIndex).toBe(1); // Turn switches
  });

  it("records a hit on ship cell", () => {
    const state = attackState();
    // Find a ship cell on opponent's board
    const shipCell = state.boards[1].grid.findIndex((c) => c === "ship");

    const next = applyMove(state, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: shipCell,
    });

    expect(next.boards[1].grid[shipCell]).toBe("hit");
    expect(next.lastShotResult?.result).toBe("hit");
    expect(next.currentPlayerIndex).toBe(1);
  });

  it("sinks a ship when all cells are hit", () => {
    const state = attackState();
    const destroyer = state.boards[1].ships.find((s) => s.id === "destroyer")!;
    expect(destroyer.cells).toHaveLength(2);

    // Hit first cell
    let next = applyMove(state, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: destroyer.cells[0],
    });

    // Turn switched to player 2, switch back for testing
    next = { ...next, currentPlayerIndex: 0 };

    // Hit second cell
    next = applyMove(next, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: destroyer.cells[1],
    });

    const sunkDestroyer = next.boards[1].ships.find((s) => s.id === "destroyer")!;
    expect(sunkDestroyer.isSunk).toBe(true);
    expect(next.lastShotResult?.result).toBe("sunk");
    expect(next.boards[1].grid[destroyer.cells[0]]).toBe("sunk");
    expect(next.boards[1].grid[destroyer.cells[1]]).toBe("sunk");
  });

  it("finishes game when all ships are sunk", () => {
    const state = attackState();
    let current = state;

    // Sink all opponent's ships
    for (const ship of state.boards[1].ships) {
      for (const cell of ship.cells) {
        if (current.boards[1].grid[cell] === "ship" || current.boards[1].grid[cell] === "hit") {
          if (current.boards[1].grid[cell] === "ship") {
            current = { ...current, currentPlayerIndex: 0 };
            current = applyMove(current, {
              playerId: "p1",
              color: "red",
              timestamp: Date.now(),
              type: "shot",
              targetCell: cell,
            });
          }
        }
      }
    }

    expect(current.status).toBe("finished");
    expect(current.finishOrder[0]).toBe("p1");
    expect(current.finishOrder[1]).toBe("p2");
  });

  it("throws when shooting already-shot cell", () => {
    const state = attackState();
    const emptyCell = state.boards[1].grid.findIndex((c) => c === "empty");

    const next = applyMove(state, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: emptyCell,
    });

    // Switch back and try to shoot same cell
    const retried = { ...next, currentPlayerIndex: 0 };
    expect(() =>
      applyMove(retried, {
        playerId: "p1",
        color: "red",
        timestamp: Date.now(),
        type: "shot",
        targetCell: emptyCell,
      })
    ).toThrow();
  });

  it("alternates turns after each shot", () => {
    const state = attackState();
    expect(state.currentPlayerIndex).toBe(0);

    const emptyCell = state.boards[1].grid.findIndex((c) => c === "empty");
    const next = applyMove(state, {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      type: "shot",
      targetCell: emptyCell,
    });

    expect(next.currentPlayerIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("getShipAt", () => {
  it("returns the ship occupying a cell", () => {
    const board = placedBoard();
    const carrier = board.ships.find((s) => s.id === "carrier")!;
    const found = getShipAt(board, carrier.cells[0]);
    expect(found?.id).toBe("carrier");
  });

  it("returns undefined for empty cell", () => {
    const board = placedBoard();
    const emptyCell = board.grid.findIndex((c) => c === "empty");
    expect(getShipAt(board, emptyCell)).toBeUndefined();
  });
});

describe("isAllSunk", () => {
  it("returns false when ships are alive", () => {
    expect(isAllSunk(placedBoard())).toBe(false);
  });

  it("returns true when all ships are sunk", () => {
    const board = placedBoard();
    for (const ship of board.ships) {
      ship.isSunk = true;
    }
    expect(isAllSunk(board)).toBe(true);
  });
});
