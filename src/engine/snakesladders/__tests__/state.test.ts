import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
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

describe("createInitialState", () => {
  it("creates state with 2 players", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.players).toHaveLength(2);
    expect(state.status).toBe("playing");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnPhase).toBe("roll");
    expect(state.hasRolled).toBe(false);
    expect(state.currentDiceValue).toBeNull();
    expect(state.lastSnakeOrLadder).toBeNull();
    expect(state.isBust).toBe(false);
  });

  it("creates state with 4 players", () => {
    const state = createInitialState(FOUR_PLAYERS);
    expect(state.players).toHaveLength(4);
  });

  it("all positions start at 0 (off-board)", () => {
    const state = createInitialState(FOUR_PLAYERS);
    expect(state.positions.red).toBe(0);
    expect(state.positions.blue).toBe(0);
    expect(state.positions.green).toBe(0);
    expect(state.positions.yellow).toBe(0);
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

  it("defaults to single dice mode", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.diceMode).toBe("single");
    expect(state.doubleDice).toBeNull();
  });

  it("accepts double dice mode", () => {
    const state = createInitialState(TWO_PLAYERS, "double");
    expect(state.diceMode).toBe("double");
  });

  it("populates snakes and ladders from defaults", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.snakes.length).toBe(9);
    expect(state.ladders.length).toBe(9);
    expect(state.snakes[0].type).toBe("snake");
    expect(state.ladders[0].type).toBe("ladder");
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

  it("sets consecutiveBonuses to 0", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(state.consecutiveBonuses).toBe(0);
  });
});
