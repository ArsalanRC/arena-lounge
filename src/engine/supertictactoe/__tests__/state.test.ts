import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import type { PlayerInfo } from "../../types";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

describe("createInitialState", () => {
  it("creates state with 9 empty sub-boards", () => {
    const state = createInitialState(PLAYERS);
    expect(state.boards).toHaveLength(9);
    for (const board of state.boards) {
      expect(board).toHaveLength(9);
      expect(board.every((c) => c === null)).toBe(true);
    }
  });

  it("creates empty meta-board", () => {
    const state = createInitialState(PLAYERS);
    expect(state.metaBoard).toHaveLength(9);
    expect(state.metaBoard.every((c) => c === null)).toBe(true);
  });

  it("sets activeBoard to null (free pick on first move)", () => {
    const state = createInitialState(PLAYERS);
    expect(state.activeBoard).toBeNull();
  });

  it("red (X) goes first", () => {
    const state = createInitialState(PLAYERS);
    expect(state.currentMark).toBe("X");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.players[0].color).toBe("red");
  });

  it("sorts players so red is first", () => {
    const reversed: PlayerInfo[] = [
      { id: "p2", color: "blue", playerOrder: 1 },
      { id: "p1", color: "red", playerOrder: 0 },
    ];
    const state = createInitialState(reversed);
    expect(state.players[0].color).toBe("red");
    expect(state.players[1].color).toBe("blue");
  });

  it("initializes with playing status", () => {
    const state = createInitialState(PLAYERS);
    expect(state.status).toBe("playing");
    expect(state.turnNumber).toBe(1);
    expect(state.finishOrder).toEqual([]);
    expect(state.isDraw).toBe(false);
    expect(state.metaWinLine).toBeNull();
  });

  it("initializes subBoardWinLines as all null", () => {
    const state = createInitialState(PLAYERS);
    expect(state.subBoardWinLines).toHaveLength(9);
    expect(state.subBoardWinLines.every((l) => l === null)).toBe(true);
  });

  it("rejects 3 players", () => {
    const three: PlayerInfo[] = [
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p2", color: "blue", playerOrder: 1 },
      { id: "p3", color: "green", playerOrder: 2 },
    ];
    expect(() => createInitialState(three)).toThrow("exactly 2 players");
  });

  it("rejects invalid colors", () => {
    const invalid: PlayerInfo[] = [
      { id: "p1", color: "red", playerOrder: 0 },
      { id: "p2", color: "green", playerOrder: 1 },
    ];
    expect(() => createInitialState(invalid)).toThrow("red player (X) and one blue player (O)");
  });
});
