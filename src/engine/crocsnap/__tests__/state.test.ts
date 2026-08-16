import { describe, it, expect } from "vitest";
import { createInitialState, createTeeth } from "../state";
import { TEETH_COUNT } from "../constants";
import type { PlayerInfo } from "../../types";

const TWO_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

const FOUR_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
  { id: "p3", color: "green", playerOrder: 2 },
  { id: "p4", color: "yellow", playerOrder: 3 },
];

describe("createTeeth", () => {
  it("creates correct number of teeth", () => {
    const { teeth } = createTeeth();
    expect(teeth).toHaveLength(TEETH_COUNT);
  });

  it("all teeth start unpressed", () => {
    const { teeth } = createTeeth();
    expect(teeth.every((t) => !t.pressed)).toBe(true);
  });

  it("trigger index is within bounds", () => {
    for (let i = 0; i < 50; i++) {
      const { triggerIndex } = createTeeth();
      expect(triggerIndex).toBeGreaterThanOrEqual(0);
      expect(triggerIndex).toBeLessThan(TEETH_COUNT);
    }
  });

  it("accepts custom count", () => {
    const { teeth } = createTeeth(8);
    expect(teeth).toHaveLength(8);
  });
});

describe("createInitialState", () => {
  it("creates state with 2 players", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.players).toHaveLength(2);
    expect(state.status).toBe("playing");
    expect(state.round).toBe(1);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.eliminatedPlayers).toHaveLength(0);
    expect(state.teeth).toHaveLength(TEETH_COUNT);
    expect(state.lastSnap).toBeNull();
  });

  it("creates state with 4 players", () => {
    const state = createInitialState(FOUR_PLAYERS);
    expect(state.players).toHaveLength(4);
  });

  it("sorts players by color order (red first)", () => {
    const reversed: PlayerInfo[] = [
      { id: "p4", color: "yellow", playerOrder: 3 },
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p3", color: "green", playerOrder: 2 },
      { id: "p2", color: "blue", playerOrder: 1 },
    ];
    const state = createInitialState(reversed);
    expect(state.players[0].color).toBe("red");
    expect(state.players[1].color).toBe("blue");
    expect(state.players[2].color).toBe("green");
    expect(state.players[3].color).toBe("yellow");
  });

  it("throws for 1 player", () => {
    expect(() =>
      createInitialState([{ id: "p1", color: "red", playerOrder: 0 }])
    ).toThrow("2–4 players");
  });

  it("throws for 5 players", () => {
    const five: PlayerInfo[] = [
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p2", color: "blue", playerOrder: 1 },
      { id: "p3", color: "green", playerOrder: 2 },
      { id: "p4", color: "yellow", playerOrder: 3 },
      { id: "p5", color: "red", playerOrder: 4 },
    ];
    expect(() => createInitialState(five)).toThrow("2–4 players");
  });

  it("initializes finishOrder as empty", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.finishOrder).toHaveLength(0);
  });

  it("sets turnNumber to 1", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.turnNumber).toBe(1);
  });
});
