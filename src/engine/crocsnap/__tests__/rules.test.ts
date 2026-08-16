import { describe, it, expect } from "vitest";
import type { CrocSnapGameState, CrocSnapMove, Tooth } from "../types";
import { getValidMoves, applyMove, getNextActivePlayerIndex, getAliveCount } from "../rules";
import { createInitialState } from "../state";
import { TEETH_COUNT } from "../constants";
import type { PlayerInfo } from "../../types";

const TWO_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

const THREE_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
  { id: "p3", color: "green", playerOrder: 2 },
];

const FOUR_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
  { id: "p3", color: "green", playerOrder: 2 },
  { id: "p4", color: "yellow", playerOrder: 3 },
];

/** Helper to create a state with a known trigger index */
function makeState(
  players: PlayerInfo[],
  triggerIndex: number,
  overrides?: Partial<CrocSnapGameState>
): CrocSnapGameState {
  const base = createInitialState(players);
  return {
    ...base,
    triggerIndex,
    ...overrides,
  };
}

function makeTeeth(count: number = TEETH_COUNT, pressedIndices: number[] = []): Tooth[] {
  return Array.from({ length: count }, (_, i) => ({
    pressed: pressedIndices.includes(i),
  }));
}

describe("getValidMoves", () => {
  it("returns all teeth for fresh state", () => {
    const state = makeState(TWO_PLAYERS, 5);
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(TEETH_COUNT);
  });

  it("excludes pressed teeth", () => {
    const state = makeState(TWO_PLAYERS, 5, {
      teeth: makeTeeth(TEETH_COUNT, [0, 1, 2]),
    });
    const moves = getValidMoves(state);
    expect(moves).toHaveLength(TEETH_COUNT - 3);
    const indices = moves.map((m) => m.toothIndex);
    expect(indices).not.toContain(0);
    expect(indices).not.toContain(1);
    expect(indices).not.toContain(2);
  });

  it("returns empty array when game is finished", () => {
    const state = makeState(TWO_PLAYERS, 5, { status: "finished" });
    expect(getValidMoves(state)).toHaveLength(0);
  });

  it("sets correct playerId and color on moves", () => {
    const state = makeState(TWO_PLAYERS, 5);
    const moves = getValidMoves(state);
    expect(moves[0].playerId).toBe("p1");
    expect(moves[0].color).toBe("red");
  });
});

describe("getNextActivePlayerIndex", () => {
  it("wraps around to first player", () => {
    const state = makeState(TWO_PLAYERS, 0);
    expect(getNextActivePlayerIndex(state, 1)).toBe(0);
  });

  it("skips eliminated players", () => {
    const state = makeState(THREE_PLAYERS, 0, {
      eliminatedPlayers: ["p2"],
    });
    // After player 0 (p1), skip p2 (eliminated), go to player 2 (p3)
    expect(getNextActivePlayerIndex(state, 0)).toBe(2);
  });

  it("wraps around skipping eliminated", () => {
    const state = makeState(THREE_PLAYERS, 0, {
      eliminatedPlayers: ["p1"],
    });
    // After player 2 (p3), skip p1 (eliminated), go to player 1 (p2)
    expect(getNextActivePlayerIndex(state, 2)).toBe(1);
  });
});

describe("getAliveCount", () => {
  it("returns all players when none eliminated", () => {
    const state = makeState(FOUR_PLAYERS, 0);
    expect(getAliveCount(state)).toBe(4);
  });

  it("subtracts eliminated players", () => {
    const state = makeState(FOUR_PLAYERS, 0, {
      eliminatedPlayers: ["p2", "p3"],
    });
    expect(getAliveCount(state)).toBe(2);
  });
});

describe("applyMove", () => {
  it("pressing a safe tooth marks it as pressed", () => {
    const state = makeState(TWO_PLAYERS, 5); // trigger at 5
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 0, // safe
    };
    const result = applyMove(state, move);
    expect(result.teeth[0].pressed).toBe(true);
    expect(result.status).toBe("playing");
    expect(result.lastSnap).toBeNull();
  });

  it("advances to next player on safe press", () => {
    const state = makeState(TWO_PLAYERS, 5);
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 0,
    };
    const result = applyMove(state, move);
    expect(result.currentPlayerIndex).toBe(1);
  });

  it("increments turn number", () => {
    const state = makeState(TWO_PLAYERS, 5);
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 0,
    };
    const result = applyMove(state, move);
    expect(result.turnNumber).toBe(2);
  });

  it("throws when pressing already pressed tooth", () => {
    const state = makeState(TWO_PLAYERS, 5, {
      teeth: makeTeeth(TEETH_COUNT, [0]),
    });
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 0,
    };
    expect(() => applyMove(state, move)).toThrow("already pressed");
  });

  it("pressing the trigger tooth eliminates the player", () => {
    const state = makeState(THREE_PLAYERS, 5); // trigger at 5
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 5, // trigger!
    };
    const result = applyMove(state, move);
    expect(result.eliminatedPlayers).toContain("p1");
    expect(result.lastSnap).toEqual({
      toothIndex: 5,
      eliminatedPlayerId: "p1",
    });
  });

  it("resets teeth for new round after snap (non-final)", () => {
    const state = makeState(THREE_PLAYERS, 5);
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 5,
    };
    const result = applyMove(state, move);
    expect(result.round).toBe(2);
    // All teeth should be fresh (unpressed)
    expect(result.teeth.every((t) => !t.pressed)).toBe(true);
    expect(result.status).toBe("playing");
  });

  it("skips to next active player after snap", () => {
    const state = makeState(THREE_PLAYERS, 5);
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 5,
    };
    const result = applyMove(state, move);
    // p1 eliminated, next should be p2 (index 1)
    expect(result.currentPlayerIndex).toBe(1);
  });

  it("ends game when second-to-last player is eliminated (2 players)", () => {
    const state = makeState(TWO_PLAYERS, 3);
    const move: CrocSnapMove = {
      playerId: "p1",
      color: "red",
      timestamp: Date.now(),
      toothIndex: 3, // trigger
    };
    const result = applyMove(state, move);
    expect(result.status).toBe("finished");
    expect(result.finishOrder[0]).toBe("p2"); // winner
    expect(result.finishOrder[1]).toBe("p1"); // loser
  });

  it("ends game when only one player remains (3 players, 2nd elimination)", () => {
    const state = makeState(THREE_PLAYERS, 7, {
      eliminatedPlayers: ["p1"],
      currentPlayerIndex: 1,
      round: 2,
    });
    const move: CrocSnapMove = {
      playerId: "p2",
      color: "blue",
      timestamp: Date.now(),
      toothIndex: 7, // trigger
    };
    const result = applyMove(state, move);
    expect(result.status).toBe("finished");
    expect(result.finishOrder[0]).toBe("p3"); // winner
    // p2 eliminated last → 2nd place, p1 eliminated first → 3rd place
    expect(result.finishOrder).toContain("p1");
    expect(result.finishOrder).toContain("p2");
  });

  it("builds correct finish order for 4 players", () => {
    // Simulate: p1 eliminated round 1, p3 eliminated round 2, p4 eliminated round 3
    // Winner: p2
    const state = makeState(FOUR_PLAYERS, 2, {
      eliminatedPlayers: ["p1", "p3"],
      currentPlayerIndex: 3, // p4's turn
      round: 3,
    });
    const move: CrocSnapMove = {
      playerId: "p4",
      color: "yellow",
      timestamp: Date.now(),
      toothIndex: 2, // trigger
    };
    const result = applyMove(state, move);
    expect(result.status).toBe("finished");
    expect(result.finishOrder[0]).toBe("p2"); // winner (only one left)
  });

  it("wraps player turns correctly in 4-player game", () => {
    const state = makeState(FOUR_PLAYERS, 11, { currentPlayerIndex: 3 });
    const move: CrocSnapMove = {
      playerId: "p4",
      color: "yellow",
      timestamp: Date.now(),
      toothIndex: 0, // safe
    };
    const result = applyMove(state, move);
    expect(result.currentPlayerIndex).toBe(0); // wraps back to p1
  });
});
