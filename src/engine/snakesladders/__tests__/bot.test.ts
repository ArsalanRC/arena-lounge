import { describe, it, expect } from "vitest";
import { selectBotAction } from "../bot";
import { createInitialState } from "../state";
import type { PlayerInfo } from "../../types";

const TWO_PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0, isBot: true, botDifficulty: "medium" },
  { id: "p2", color: "blue", playerOrder: 1, isBot: true, botDifficulty: "medium" },
];

describe("selectBotAction", () => {
  it("returns 'roll' for easy difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(selectBotAction(state, "easy")).toBe("roll");
  });

  it("returns 'roll' for medium difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(selectBotAction(state, "medium")).toBe("roll");
  });

  it("returns 'roll' for hard difficulty", () => {
    const state = createInitialState(TWO_PLAYERS);
    expect(selectBotAction(state, "hard")).toBe("roll");
  });

  it("returns 'roll' regardless of player position", () => {
    const state = createInitialState(TWO_PLAYERS);
    const midGame = { ...state, positions: { red: 50, blue: 30, green: 0, yellow: 0 } };
    expect(selectBotAction(midGame, "hard")).toBe("roll");
  });

  it("returns 'roll' in double dice mode", () => {
    const state = createInitialState(TWO_PLAYERS, "double");
    expect(selectBotAction(state, "easy")).toBe("roll");
  });
});
