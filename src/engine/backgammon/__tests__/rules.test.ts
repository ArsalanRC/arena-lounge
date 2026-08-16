import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import {
  CHECKERS_PER_SIDE,
  HOME_POINTS,
  POINT_COUNT,
  barEntryPoint,
  initialPoints,
  moveDirection,
} from "../constants";
import { createInitialState } from "../state";
import {
  allInHome,
  applyMove,
  endTurn,
  farthestHomePoint,
  getLegalMoves,
  hasLegalMove,
  isDoubles,
  pipCount,
  pipsFromDice,
  rollForTurn,
} from "../rules";
import type { BackgammonGameState } from "../types";

const PLAYERS: PlayerInfo[] = [
  { id: "w", color: "red", playerOrder: 0 },
  { id: "b", color: "blue", playerOrder: 1 },
];

function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Set pips + (optionally) dice directly on a state. */
function withPips(state: BackgammonGameState, pips: number[]): BackgammonGameState {
  const dice: [number, number] =
    pips.length === 4
      ? [pips[0], pips[0]]
      : [pips[0] ?? 1, pips[1] ?? 1];
  return { ...state, dice, remainingPips: [...pips] };
}

// ---------------------------------------------------------------------------
// Board setup
// ---------------------------------------------------------------------------

describe("board setup", () => {
  it("has exactly 24 points", () => {
    expect(POINT_COUNT).toBe(24);
    expect(initialPoints()).toHaveLength(24);
  });

  it("assigns each side 15 checkers in the standard opening position", () => {
    const pts = initialPoints();
    const whiteCount = pts.reduce(
      (acc, p) => acc + (p.owner === "white" ? p.count : 0),
      0
    );
    const blackCount = pts.reduce(
      (acc, p) => acc + (p.owner === "black" ? p.count : 0),
      0
    );
    expect(whiteCount).toBe(CHECKERS_PER_SIDE);
    expect(blackCount).toBe(CHECKERS_PER_SIDE);
  });

  it("exposes 6 home points per color", () => {
    expect(HOME_POINTS.white).toHaveLength(6);
    expect(HOME_POINTS.black).toHaveLength(6);
  });

  it("moveDirection flips by color", () => {
    expect(moveDirection("white")).toBe(-1);
    expect(moveDirection("black")).toBe(1);
  });

  it("barEntryPoint maps pips to the correct entry index", () => {
    expect(barEntryPoint("white", 1)).toBe(23);
    expect(barEntryPoint("white", 6)).toBe(18);
    expect(barEntryPoint("black", 1)).toBe(0);
    expect(barEntryPoint("black", 6)).toBe(5);
  });
});

describe("createInitialState", () => {
  it("rejects anything other than 2 players", () => {
    expect(() => createInitialState([PLAYERS[0]])).toThrow();
    expect(() =>
      createInitialState([...PLAYERS, { id: "x", color: "green", playerOrder: 2 }])
    ).toThrow();
  });

  it("starts with white to move and no dice rolled", () => {
    const s = createInitialState(PLAYERS);
    expect(s.turnColor).toBe("white");
    expect(s.dice).toBeNull();
    expect(s.remainingPips).toEqual([]);
    expect(s.bar.white).toBe(0);
    expect(s.off.white).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dice helpers
// ---------------------------------------------------------------------------

describe("dice helpers", () => {
  it("detects doubles", () => {
    expect(isDoubles([3, 3])).toBe(true);
    expect(isDoubles([2, 6])).toBe(false);
  });

  it("expands doubles to 4 pips", () => {
    expect(pipsFromDice([4, 4])).toEqual([4, 4, 4, 4]);
    expect(pipsFromDice([2, 5])).toEqual([2, 5]);
  });

  it("rollForTurn sets dice + remainingPips exactly once", () => {
    const s = createInitialState(PLAYERS);
    const rolled = rollForTurn(s, fixedRng([0.5, 0.0])); // d6: 4, 1
    expect(rolled.dice).toEqual([4, 1]);
    expect(rolled.remainingPips).toEqual([4, 1]);
    // Second call is a no-op.
    expect(rollForTurn(rolled)).toBe(rolled);
  });
});

// ---------------------------------------------------------------------------
// Legal moves
// ---------------------------------------------------------------------------

describe("getLegalMoves", () => {
  it("yields several legal moves at the opening for pips 3 + 1", () => {
    const s = withPips(createInitialState(PLAYERS), [3, 1]);
    const moves = getLegalMoves(s);
    expect(moves.length).toBeGreaterThan(0);
    // Every move must come from a white-owned point.
    for (const m of moves) {
      if (m.from === "bar") continue;
      expect(s.points[m.from].owner).toBe("white");
    }
  });

  it("forbids moves onto a point with ≥2 enemy checkers", () => {
    const s = withPips(createInitialState(PLAYERS), [5, 3]);
    const moves = getLegalMoves(s);
    // Point 0 has 2 black checkers. White moving 23 → 18 (pip 5) is blocked by
    // black's point 18? No, 18 is white's own. Test differently:
    // White moving from 7 by 6 hits point 1 (empty). OK — instead check that
    // moves DO NOT land on point 11 (5 black).
    for (const m of moves) {
      if (typeof m.to === "number") expect(m.to).not.toBe(11);
    }
  });

  it("requires bar re-entry before anything else", () => {
    const s0 = createInitialState(PLAYERS);
    const barred = { ...s0, bar: { ...s0.bar, white: 1 } };
    const withDice = withPips(barred, [5, 3]);
    const moves = getLegalMoves(withDice);
    for (const m of moves) expect(m.from).toBe("bar");
  });

  it("allows bearing off only once every checker is in the home board", () => {
    // Craft a state where white has all checkers on points 0..5.
    const pts = Array.from({ length: POINT_COUNT }, () => ({ count: 0, owner: null as null }));
    pts[5] = { count: 5, owner: "white" } as never;
    pts[4] = { count: 5, owner: "white" } as never;
    pts[3] = { count: 5, owner: "white" } as never;
    const crafted: BackgammonGameState = {
      ...createInitialState(PLAYERS),
      points: pts as never,
    };
    expect(allInHome(crafted, "white")).toBe(true);
    const withDice = withPips(crafted, [6, 1]);
    const moves = getLegalMoves(withDice);
    const offMoves = moves.filter((m) => m.to === "off");
    expect(offMoves.length).toBeGreaterThan(0);
  });

  it("farthestHomePoint returns the farthest occupied home index", () => {
    const pts = Array.from({ length: POINT_COUNT }, () => ({ count: 0, owner: null as null }));
    pts[2] = { count: 3, owner: "white" } as never;
    pts[5] = { count: 2, owner: "white" } as never;
    const crafted: BackgammonGameState = {
      ...createInitialState(PLAYERS),
      points: pts as never,
    };
    expect(farthestHomePoint(crafted, "white")).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("moves a checker onto an empty point", () => {
    const s = withPips(createInitialState(PLAYERS), [6, 5]);
    const legal = getLegalMoves(s);
    const move = legal.find((m) => m.from === 23 && typeof m.to === "number");
    expect(move).toBeDefined();
    const after = applyMove(s, move!);
    // Source decremented.
    expect(after.points[23].count).toBe(1);
    // One pip consumed.
    expect(after.remainingPips.length).toBe(1);
  });

  it("hits a blot and sends the opposing checker to the bar", () => {
    // Construct a state where white is about to hit black on point 20.
    const s0 = createInitialState(PLAYERS);
    const pts = s0.points.map((p) => ({ ...p }));
    pts[20] = { count: 1, owner: "black" };
    const source = pts[23];
    source.count = 2;
    source.owner = "white";
    const crafted: BackgammonGameState = withPips(
      { ...s0, points: pts },
      [3, 4]
    );
    const hitMove = getLegalMoves(crafted).find(
      (m) => m.from === 23 && m.to === 20
    );
    expect(hitMove).toBeDefined();
    const after = applyMove(crafted, hitMove!);
    expect(after.points[20].owner).toBe("white");
    expect(after.bar.black).toBe(1);
  });

  it("bears off when the rolled pip matches exactly", () => {
    const pts = Array.from({ length: POINT_COUNT }, () => ({
      count: 0,
      owner: null as null,
    }));
    pts[5] = { count: 1, owner: "white" } as never;
    const s: BackgammonGameState = withPips(
      {
        ...createInitialState(PLAYERS),
        points: pts as never,
        off: { white: 14, black: 0 },
      },
      [6, 2]
    );
    const moves = getLegalMoves(s);
    const offMove = moves.find((m) => m.to === "off");
    expect(offMove).toBeDefined();
    const after = applyMove(s, offMove!);
    expect(after.off.white).toBe(15);
    expect(after.status).toBe("finished");
    expect(after.gameResult).toBe("white_wins");
  });

  it("ends the turn automatically when no pip remains", () => {
    // Use a doubles roll so we consume both pips cleanly.
    const s = withPips(createInitialState(PLAYERS), [1, 1, 1, 1]);
    let state = s;
    for (let i = 0; i < 4; i++) {
      const moves = getLegalMoves(state);
      if (moves.length === 0) break;
      state = applyMove(state, moves[0]);
    }
    // After using all pips (or running out of legal moves), turn has flipped.
    expect(state.turnColor === "black" || state.status === "finished").toBe(true);
  });

  it("hasLegalMove reflects current state", () => {
    const s = createInitialState(PLAYERS);
    expect(hasLegalMove(s)).toBe(false); // no dice yet
    const rolled = withPips(s, [3, 1]);
    expect(hasLegalMove(rolled)).toBe(true);
  });
});

describe("pipCount", () => {
  it("returns 167 for each side at the opening", () => {
    // Standard opening pip count is 167 for both sides.
    const s = createInitialState(PLAYERS);
    expect(pipCount(s, "white")).toBe(167);
    expect(pipCount(s, "black")).toBe(167);
  });

  it("adds 25 per bar checker", () => {
    const s0 = createInitialState(PLAYERS);
    const barred: BackgammonGameState = {
      ...s0,
      bar: { white: 1, black: 0 },
      points: s0.points.map((p, i) =>
        i === 23 ? { count: p.count - 1, owner: p.count - 1 > 0 ? p.owner : null } : p
      ),
    };
    // Removed one from 23 (−24 pips) and added one bar (+25) → net +1 pip.
    expect(pipCount(barred, "white")).toBe(168);
  });
});

describe("endTurn", () => {
  it("flips color and clears dice", () => {
    const s = withPips(createInitialState(PLAYERS), [3, 1]);
    const after = endTurn(s);
    expect(after.turnColor).toBe("black");
    expect(after.dice).toBeNull();
    expect(after.remainingPips).toEqual([]);
  });
});
