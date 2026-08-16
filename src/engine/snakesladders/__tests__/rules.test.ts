import { describe, it, expect } from "vitest";
import {
  rollDice,
  rollDoubleDice,
  findSnakeOrLadder,
  isBonusRoll,
  calculateBounce,
  calculateMove,
  applyMove,
  getNextActivePlayerIndex,
  getActivePlayers,
} from "../rules";
import { squareToCoords, coordsToSquare } from "../constants";
import { createInitialState } from "../state";
import type { SnakesLaddersGameState, SnakeOrLadder } from "../types";
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

/** Helper to create a state with custom positions and overrides. */
function makeState(
  players: PlayerInfo[],
  overrides?: Partial<SnakesLaddersGameState>
): SnakesLaddersGameState {
  const base = createInitialState(players);
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// squareToCoords / coordsToSquare
// ---------------------------------------------------------------------------

describe("squareToCoords", () => {
  it("maps square 1 to bottom-left", () => {
    expect(squareToCoords(1)).toEqual({ row: 9, col: 0 });
  });

  it("maps square 10 to bottom-right", () => {
    expect(squareToCoords(10)).toEqual({ row: 9, col: 9 });
  });

  it("maps square 11 to second row right (zigzag)", () => {
    expect(squareToCoords(11)).toEqual({ row: 8, col: 9 });
  });

  it("maps square 20 to second row left (zigzag)", () => {
    expect(squareToCoords(20)).toEqual({ row: 8, col: 0 });
  });

  it("maps square 91 to top-right", () => {
    expect(squareToCoords(91)).toEqual({ row: 0, col: 9 });
  });

  it("maps square 100 to top-left", () => {
    expect(squareToCoords(100)).toEqual({ row: 0, col: 0 });
  });
});

describe("coordsToSquare", () => {
  it("is the inverse of squareToCoords", () => {
    for (let sq = 1; sq <= 100; sq++) {
      const { row, col } = squareToCoords(sq);
      expect(coordsToSquare(row, col)).toBe(sq);
    }
  });
});

// ---------------------------------------------------------------------------
// rollDice / rollDoubleDice
// ---------------------------------------------------------------------------

describe("rollDice", () => {
  it("returns values between 1 and 6", () => {
    for (let i = 0; i < 100; i++) {
      const val = rollDice();
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });
});

describe("rollDoubleDice", () => {
  it("returns two values between 1 and 6", () => {
    for (let i = 0; i < 100; i++) {
      const [d1, d2] = rollDoubleDice();
      expect(d1).toBeGreaterThanOrEqual(1);
      expect(d1).toBeLessThanOrEqual(6);
      expect(d2).toBeGreaterThanOrEqual(1);
      expect(d2).toBeLessThanOrEqual(6);
    }
  });
});

// ---------------------------------------------------------------------------
// findSnakeOrLadder
// ---------------------------------------------------------------------------

describe("findSnakeOrLadder", () => {
  const snakes: SnakeOrLadder[] = [
    { from: 16, to: 6, type: "snake" },
    { from: 47, to: 26, type: "snake" },
  ];
  const ladders: SnakeOrLadder[] = [
    { from: 2, to: 38, type: "ladder" },
    { from: 28, to: 84, type: "ladder" },
  ];

  it("finds a snake at its head", () => {
    const result = findSnakeOrLadder(16, snakes, ladders);
    expect(result).toEqual({ from: 16, to: 6, type: "snake" });
  });

  it("finds a ladder at its bottom", () => {
    const result = findSnakeOrLadder(28, snakes, ladders);
    expect(result).toEqual({ from: 28, to: 84, type: "ladder" });
  });

  it("returns null for an empty square", () => {
    expect(findSnakeOrLadder(50, snakes, ladders)).toBeNull();
  });

  it("does not trigger on snake tail (only head)", () => {
    expect(findSnakeOrLadder(6, snakes, ladders)).toBeNull();
  });

  it("does not trigger on ladder top (only bottom)", () => {
    expect(findSnakeOrLadder(84, snakes, ladders)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isBonusRoll
// ---------------------------------------------------------------------------

describe("isBonusRoll", () => {
  it("returns true for 6 in single mode", () => {
    expect(isBonusRoll(6, "single", null)).toBe(true);
  });

  it("returns false for non-6 in single mode", () => {
    expect(isBonusRoll(5, "single", null)).toBe(false);
    expect(isBonusRoll(1, "single", null)).toBe(false);
  });

  it("returns true for double 6s in double mode", () => {
    expect(
      isBonusRoll(12, "double", { diceValues: [6, 6], isDoubles: true })
    ).toBe(true);
  });

  it("returns false for non-6 doubles in double mode", () => {
    expect(
      isBonusRoll(8, "double", { diceValues: [4, 4], isDoubles: true })
    ).toBe(false);
  });

  it("returns false for non-doubles in double mode", () => {
    expect(
      isBonusRoll(7, "double", { diceValues: [3, 4], isDoubles: false })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateBounce
// ---------------------------------------------------------------------------

describe("calculateBounce", () => {
  it("bounces back from overshoot", () => {
    // position 97, roll 5 → 97+5=102, overshoot 2 → 100-2=98
    expect(calculateBounce(97, 5)).toBe(98);
  });

  it("bounces back from large overshoot", () => {
    // position 96, roll 6 → 96+6=102, overshoot 2 → 100-2=98
    expect(calculateBounce(96, 6)).toBe(98);
  });

  it("bounces back to exact position for minimal overshoot", () => {
    // position 99, roll 2 → 99+2=101, overshoot 1 → 100-1=99
    expect(calculateBounce(99, 2)).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// calculateMove
// ---------------------------------------------------------------------------

describe("calculateMove", () => {
  it("moves from off-board to square equal to dice value", () => {
    const state = makeState(TWO_PLAYERS);
    const move = calculateMove(state, 4);
    expect(move.from).toBe(0);
    expect(move.to).toBe(4);
    expect(move.finalTo).toBe(4);
    expect(move.isBounce).toBe(false);
    expect(move.triggeredSnakeOrLadder).toBeNull();
  });

  it("moves forward on the board", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 10, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 5);
    expect(move.from).toBe(10);
    expect(move.to).toBe(15);
    // Square 15 is a ladder bottom (15 → 26)
    expect(move.finalTo).toBe(26);
    expect(move.triggeredSnakeOrLadder).toEqual({ from: 15, to: 26, type: "ladder" });
  });

  it("triggers a snake when landing on snake head", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 45, blue: 0, green: 0, yellow: 0 } });
    // Red at 45, roll 2 → lands on 47 (snake head: 47 → 26)
    const move = calculateMove(state, 2);
    expect(move.to).toBe(47);
    expect(move.finalTo).toBe(26);
    expect(move.triggeredSnakeOrLadder?.type).toBe("snake");
  });

  it("triggers a ladder when landing on ladder bottom", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 25, blue: 0, green: 0, yellow: 0 } });
    // Red at 25, roll 3 → lands on 28 (ladder: 28 → 84)
    const move = calculateMove(state, 3);
    expect(move.to).toBe(28);
    expect(move.finalTo).toBe(84);
    expect(move.triggeredSnakeOrLadder?.type).toBe("ladder");
  });

  it("lands exactly on 100 to win", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 96, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 4);
    expect(move.to).toBe(100);
    expect(move.finalTo).toBe(100);
    expect(move.isBounce).toBe(false);
  });

  it("bounces back when overshooting 100", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 97, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 5);
    expect(move.to).toBe(98); // 100 - (102-100) = 98
    expect(move.isBounce).toBe(true);
  });

  it("bounce can trigger a snake", () => {
    // Snake at 95 → 75. Position 97, roll 5 → bounce to 98. No snake at 98 though.
    // Let's use: position 98, roll 5 → 103 → bounce to 97. No snake at 97.
    // Better: position 99, roll 6 → 105 → bounce to 95. Snake at 95!
    const state = makeState(TWO_PLAYERS, { positions: { red: 99, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 6);
    expect(move.to).toBe(95); // 100 - (105-100) = 95
    expect(move.isBounce).toBe(true);
    expect(move.finalTo).toBe(75); // snake 95 → 75
    expect(move.triggeredSnakeOrLadder?.type).toBe("snake");
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("updates player position", () => {
    const state = makeState(TWO_PLAYERS);
    const move = calculateMove(state, 3);
    const newState = applyMove(state, move);
    expect(newState.positions.red).toBe(3);
  });

  it("advances to next player on normal turn", () => {
    const state = makeState(TWO_PLAYERS);
    const move = calculateMove(state, 3);
    const newState = applyMove(state, move);
    expect(newState.currentPlayerIndex).toBe(1); // blue's turn
  });

  it("grants bonus turn on rolling 6 (single mode)", () => {
    const state = makeState(TWO_PLAYERS);
    const move = calculateMove(state, 6);
    const newState = applyMove(state, move);
    // Same player (red) gets another turn
    expect(newState.currentPlayerIndex).toBe(0);
    expect(newState.consecutiveBonuses).toBe(1);
  });

  it("grants bonus turn on double 6s (double mode)", () => {
    const state = makeState(TWO_PLAYERS, {
      diceMode: "double",
      doubleDice: { diceValues: [6, 6], isDoubles: true },
    });
    const move = calculateMove(state, 12); // 6+6
    const newState = applyMove(state, move);
    expect(newState.currentPlayerIndex).toBe(0); // same player
    expect(newState.consecutiveBonuses).toBe(1);
  });

  it("does not grant bonus on non-6 doubles (double mode)", () => {
    const state = makeState(TWO_PLAYERS, {
      diceMode: "double",
      doubleDice: { diceValues: [3, 3], isDoubles: true },
    });
    const move = calculateMove(state, 6); // 3+3
    const newState = applyMove(state, move);
    expect(newState.currentPlayerIndex).toBe(1); // advances to next player
    expect(newState.consecutiveBonuses).toBe(0);
  });

  it("busts on 3 consecutive bonuses (single mode)", () => {
    const state = makeState(TWO_PLAYERS, {
      positions: { red: 10, blue: 0, green: 0, yellow: 0 },
      consecutiveBonuses: 2, // already had 2 sixes
    });
    const move = calculateMove(state, 6); // third six → bust
    const newState = applyMove(state, move);
    expect(newState.isBust).toBe(true);
    // Position reverted to before this move
    expect(newState.positions.red).toBe(10);
    // Turn advances to next player
    expect(newState.currentPlayerIndex).toBe(1);
    expect(newState.consecutiveBonuses).toBe(0);
  });

  it("resets consecutiveBonuses on non-bonus roll", () => {
    const state = makeState(TWO_PLAYERS, { consecutiveBonuses: 1 });
    const move = calculateMove(state, 3);
    const newState = applyMove(state, move);
    expect(newState.consecutiveBonuses).toBe(0);
  });

  it("adds winning player to finishOrder", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 96, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 4); // land on 100
    const newState = applyMove(state, move);
    expect(newState.finishOrder).toContain("p1");
  });

  it("finishes game when only 1 player remains", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 96, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 4);
    const newState = applyMove(state, move);
    expect(newState.status).toBe("finished");
    expect(newState.finishOrder).toEqual(["p1", "p2"]);
  });

  it("continues game when 2+ players remain after a win (3+ player game)", () => {
    const state = makeState(THREE_PLAYERS, {
      positions: { red: 96, blue: 30, green: 20, yellow: 0 },
    });
    const move = calculateMove(state, 4);
    const newState = applyMove(state, move);
    expect(newState.status).toBe("playing");
    expect(newState.finishOrder).toEqual(["p1"]);
    // Next player should be blue (index 1)
    expect(newState.currentPlayerIndex).toBe(1);
  });

  it("skips finished players in turn rotation", () => {
    const state = makeState(THREE_PLAYERS, {
      positions: { red: 50, blue: 100, green: 20, yellow: 0 },
      finishOrder: ["p2"],
      currentPlayerIndex: 0, // red's turn
    });
    const move = calculateMove(state, 3);
    const newState = applyMove(state, move);
    // Should skip blue (finished) and go to green
    expect(newState.currentPlayerIndex).toBe(2);
  });

  it("does not grant bonus turn on winning roll", () => {
    // Even though rolling a 6 normally grants bonus, winning ends the turn
    const state = makeState(TWO_PLAYERS, { positions: { red: 94, blue: 0, green: 0, yellow: 0 } });
    const move = calculateMove(state, 6); // land on 100
    const newState = applyMove(state, move);
    expect(newState.status).toBe("finished");
  });

  it("increments turnNumber", () => {
    const state = makeState(TWO_PLAYERS);
    const move = calculateMove(state, 3);
    const newState = applyMove(state, move);
    expect(newState.turnNumber).toBe(2);
  });

  it("stores triggeredSnakeOrLadder in lastSnakeOrLadder", () => {
    const state = makeState(TWO_PLAYERS, { positions: { red: 45, blue: 0, green: 0, yellow: 0 } });
    // 45 + 2 = 47 (snake: 47 → 26)
    const move = calculateMove(state, 2);
    const newState = applyMove(state, move);
    expect(newState.lastSnakeOrLadder).toEqual({ from: 47, to: 26, type: "snake" });
    expect(newState.positions.red).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// getNextActivePlayerIndex
// ---------------------------------------------------------------------------

describe("getNextActivePlayerIndex", () => {
  it("wraps around from last to first player", () => {
    const state = makeState(TWO_PLAYERS);
    expect(getNextActivePlayerIndex(state, 1)).toBe(0);
  });

  it("skips finished players", () => {
    const state = makeState(THREE_PLAYERS, { finishOrder: ["p2"] });
    // After red (0), skip blue (1, finished), go to green (2)
    expect(getNextActivePlayerIndex(state, 0)).toBe(2);
  });

  it("wraps around and skips finished players", () => {
    const state = makeState(THREE_PLAYERS, { finishOrder: ["p1"] });
    // After green (2), skip red (0, finished), go to blue (1)
    expect(getNextActivePlayerIndex(state, 2)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getActivePlayers
// ---------------------------------------------------------------------------

describe("getActivePlayers", () => {
  it("returns total players when none finished", () => {
    const state = makeState(FOUR_PLAYERS);
    expect(getActivePlayers(state)).toBe(4);
  });

  it("subtracts finished players", () => {
    const state = makeState(FOUR_PLAYERS, { finishOrder: ["p1", "p3"] });
    expect(getActivePlayers(state)).toBe(2);
  });
});
