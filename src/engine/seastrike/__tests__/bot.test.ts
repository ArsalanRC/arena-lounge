/**
 * Sea Strike bot tests — validates move selection for all difficulties.
 */

import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type { SeaStrikeGameState } from "../types";
import { createInitialState } from "../state";
import { autoPlaceShips, getValidMoves, applyMove } from "../rules";
import {
  selectBotMove,
  createBotMemory,
  updateBotMemory,
} from "../bot";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1, isBot: true, botDifficulty: "medium" },
];

function attackState(): SeaStrikeGameState {
  const state = createInitialState(PLAYERS);
  return {
    ...state,
    phase: "attacking",
    boards: [autoPlaceShips(state.boards[0]), autoPlaceShips(state.boards[1])],
    currentPlayerIndex: 1, // Bot's turn
  };
}

describe("selectBotMove", () => {
  it("easy: returns a valid shot", () => {
    const state = attackState();
    const moves = getValidMoves(state);
    const memory = createBotMemory();
    const move = selectBotMove(state, moves, "easy", memory);

    expect(move).not.toBeNull();
    expect(moves.some((m) => m.targetCell === move!.targetCell)).toBe(true);
  });

  it("medium: returns a valid shot", () => {
    const state = attackState();
    const moves = getValidMoves(state);
    const memory = createBotMemory();
    const move = selectBotMove(state, moves, "medium", memory);

    expect(move).not.toBeNull();
    expect(moves.some((m) => m.targetCell === move!.targetCell)).toBe(true);
  });

  it("hard: returns a valid shot", () => {
    const state = attackState();
    const moves = getValidMoves(state);
    const memory = createBotMemory();
    const move = selectBotMove(state, moves, "hard", memory);

    expect(move).not.toBeNull();
    expect(moves.some((m) => m.targetCell === move!.targetCell)).toBe(true);
  });

  it("medium: targets adjacent cells after a hit", () => {
    let state = attackState();
    // Find a ship cell on player 0's board and shoot it
    const shipCell = state.boards[0].grid.findIndex((c) => c === "ship");
    state = { ...state, currentPlayerIndex: 1 };
    state = applyMove(state, {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      type: "shot",
      targetCell: shipCell,
    });

    // Now it's player 0's turn — switch back to bot
    state = { ...state, currentPlayerIndex: 1 };
    const memory = updateBotMemory(createBotMemory(), state, 1);
    expect(memory.hits.length).toBeGreaterThan(0);

    const moves = getValidMoves(state);
    const move = selectBotMove(state, moves, "medium", memory);
    expect(move).not.toBeNull();

    // The selected cell should be adjacent to the hit
    const row = Math.floor(shipCell / 10);
    const col = shipCell % 10;
    const adjacent = [
      row > 0 ? (row - 1) * 10 + col : -1,
      row < 9 ? (row + 1) * 10 + col : -1,
      col > 0 ? row * 10 + (col - 1) : -1,
      col < 9 ? row * 10 + (col + 1) : -1,
    ].filter((c) => c >= 0);

    expect(adjacent).toContain(move!.targetCell);
  });

  it("never returns null when valid moves exist", () => {
    const state = attackState();
    const moves = getValidMoves(state);
    const memory = createBotMemory();

    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = selectBotMove(state, moves, difficulty, memory);
      expect(move).not.toBeNull();
    }
  });

  it("returns null when no valid moves", () => {
    const state = attackState();
    const memory = createBotMemory();
    const move = selectBotMove(state, [], "easy", memory);
    expect(move).toBeNull();
  });

  it("bot placement always produces valid board", () => {
    // Run multiple times to catch randomness issues
    for (let i = 0; i < 10; i++) {
      const state = createInitialState(PLAYERS);
      const board = autoPlaceShips(state.boards[1]);
      expect(board.allShipsPlaced).toBe(true);

      const shipCells = board.grid.filter((c) => c === "ship");
      expect(shipCells).toHaveLength(17);

      const allCells = board.ships.flatMap((s) => s.cells);
      const unique = new Set(allCells);
      expect(unique.size).toBe(17);
    }
  });
});

describe("updateBotMemory", () => {
  it("tracks unsunk hit cells", () => {
    let state = attackState();
    const shipCell = state.boards[0].grid.findIndex((c) => c === "ship");
    state = { ...state, currentPlayerIndex: 1 };
    state = applyMove(state, {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      type: "shot",
      targetCell: shipCell,
    });

    state = { ...state, currentPlayerIndex: 1 };
    const memory = updateBotMemory(createBotMemory(), state, 1);
    expect(memory.hits).toContain(shipCell);
  });

  it("tracks sunk ships", () => {
    let state = attackState();
    const destroyer = state.boards[0].ships.find((s) => s.id === "destroyer")!;

    // Sink the destroyer
    state = { ...state, currentPlayerIndex: 1 };
    state = applyMove(state, {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      type: "shot",
      targetCell: destroyer.cells[0],
    });
    state = { ...state, currentPlayerIndex: 1 };
    state = applyMove(state, {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      type: "shot",
      targetCell: destroyer.cells[1],
    });

    state = { ...state, currentPlayerIndex: 1 };
    const memory = updateBotMemory(createBotMemory(), state, 1);
    expect(memory.sunkShipIds).toContain("destroyer");
    // Sunk cells should NOT be in hits (they are "sunk", not "hit")
    expect(memory.hits).not.toContain(destroyer.cells[0]);
  });
});
