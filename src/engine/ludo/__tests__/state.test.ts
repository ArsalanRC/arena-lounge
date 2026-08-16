/** Tests for state initialization — createInitialState() with various player configurations. */
import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import type { PlayerInfo } from "../../types";
import { YARD_POSITION } from "../constants";

function makePlayers(count: 2 | 3 | 4 = 2): PlayerInfo[] {
  const colors = ["red", "blue", "green", "yellow"] as const;
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    color: colors[i],
    playerOrder: i,
  }));
}

describe("createInitialState", () => {
  it("should create a valid initial state for 2 players", () => {
    const state = createInitialState(makePlayers(2));

    expect(state.status).toBe("playing");
    expect(state.players.length).toBe(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(state.finishOrder).toEqual([]);
    expect(state.currentDiceValue).toBeNull();
    expect(state.hasRolled).toBe(false);
    expect(state.consecutiveSixes).toBe(0);
    expect(state.validMoves).toEqual([]);
    expect(state.turnPhase).toBe("roll");
  });

  it("should place all pieces in the yard", () => {
    const state = createInitialState(makePlayers(4));

    for (const color of ["red", "blue", "green", "yellow"] as const) {
      for (let i = 0; i < 4; i++) {
        expect(state.board.pieces[color][i]).toBe(YARD_POSITION);
      }
    }
  });

  it("should sort players by color order", () => {
    // Pass players in reverse order
    const players: PlayerInfo[] = [
      { id: "p4", color: "yellow", playerOrder: 3 },
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p3", color: "green", playerOrder: 2 },
      { id: "p2", color: "blue", playerOrder: 1 },
    ];

    const state = createInitialState(players);
    expect(state.players[0].color).toBe("red");
    expect(state.players[1].color).toBe("blue");
    expect(state.players[2].color).toBe("green");
    expect(state.players[3].color).toBe("yellow");
  });

  it("should create state for 3 players", () => {
    const state = createInitialState(makePlayers(3));
    expect(state.players.length).toBe(3);
    // Unused color (yellow) still has yard pieces
    expect(state.board.pieces.yellow.every((p) => p === YARD_POSITION)).toBe(true);
  });

  it("should throw for fewer than 2 players", () => {
    expect(() =>
      createInitialState([{ id: "p1", color: "red", playerOrder: 0 }])
    ).toThrow("Ludo requires 2-4 players");
  });

  it("should throw for more than 4 players", () => {
    const players: PlayerInfo[] = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      color: "red" as const,
      playerOrder: i,
    }));
    expect(() => createInitialState(players)).toThrow();
  });

  it("should throw for duplicate colors", () => {
    const players: PlayerInfo[] = [
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p2", color: "red", playerOrder: 1 },
    ];
    expect(() => createInitialState(players)).toThrow("Duplicate player colors");
  });
});
