import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import { createInitialState } from "../state";
import { applyMove, getLegalMoves, countSides, isGameOver } from "../rules";
import type { DotLinesGameState, DotLinesMove } from "../types";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function makeMove(
  state: DotLinesGameState,
  orientation: "h" | "v",
  row: number,
  col: number
): DotLinesMove {
  const player = state.players[state.currentPlayerIndex];
  return {
    kind: "draw",
    orientation,
    row,
    col,
    playerId: player.id,
    color: player.color,
    timestamp: Date.now(),
  };
}

describe("createInitialState", () => {
  it("creates a 5×5 board with 60 undrawn edges", () => {
    const state = createInitialState(PLAYERS);
    expect(state.rows).toBe(5);
    expect(state.cols).toBe(5);

    let total = 0;
    for (const row of state.horizontalLines) total += row.filter(Boolean).length;
    for (const row of state.verticalLines) total += row.filter(Boolean).length;
    expect(total).toBe(0);
  });

  it("starts with player 0 (red) having the first turn", () => {
    const state = createInitialState(PLAYERS);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.status).toBe("playing");
  });

  it("starts with all boxes unclaimed and scores zero", () => {
    const state = createInitialState(PLAYERS);
    for (const row of state.boxes) {
      for (const box of row) {
        expect(box.ownerIndex).toBeNull();
      }
    }
    expect(state.scores).toEqual([0, 0]);
  });
});

describe("getLegalMoves", () => {
  it("returns 60 moves on a fresh 5×5 board", () => {
    const state = createInitialState(PLAYERS);
    expect(getLegalMoves(state)).toHaveLength(60);
  });

  it("shrinks by 1 after each non-completing move", () => {
    let state = createInitialState(PLAYERS);
    state = applyMove(state, makeMove(state, "h", 0, 0));
    expect(getLegalMoves(state)).toHaveLength(59);
    state = applyMove(state, makeMove(state, "h", 0, 1));
    expect(getLegalMoves(state)).toHaveLength(58);
  });

  it("returns 0 moves when game is finished", () => {
    const state = createInitialState(PLAYERS, 1, 1); // 1-box grid, 4 edges
    let s = state;
    s = applyMove(s, makeMove(s, "h", 0, 0));
    s = applyMove(s, makeMove(s, "h", 1, 0));
    s = applyMove(s, makeMove(s, "v", 0, 0));
    s = applyMove(s, makeMove(s, "v", 0, 1)); // completes box → finished
    expect(getLegalMoves(s)).toHaveLength(0);
  });
});

describe("applyMove — drawing lines", () => {
  it("marks a horizontal edge as drawn", () => {
    const state = createInitialState(PLAYERS);
    const next = applyMove(state, makeMove(state, "h", 0, 0));
    expect(next.horizontalLines[0][0]).toBe(true);
  });

  it("marks a vertical edge as drawn", () => {
    const state = createInitialState(PLAYERS);
    const next = applyMove(state, makeMove(state, "v", 0, 0));
    expect(next.verticalLines[0][0]).toBe(true);
  });

  it("throws when the edge is already drawn", () => {
    const state = createInitialState(PLAYERS);
    const next = applyMove(state, makeMove(state, "h", 0, 0));
    expect(() => applyMove(next, makeMove(next, "h", 0, 0))).toThrow();
  });

  it("does not modify the original state (immutability)", () => {
    const state = createInitialState(PLAYERS);
    applyMove(state, makeMove(state, "h", 0, 0));
    expect(state.horizontalLines[0][0]).toBe(false);
  });
});

describe("applyMove — turn management", () => {
  it("advances to the next player when no box is completed", () => {
    const state = createInitialState(PLAYERS);
    const next = applyMove(state, makeMove(state, "h", 0, 0));
    expect(next.currentPlayerIndex).toBe(1);
  });

  it("keeps the same player after completing a box", () => {
    // Draw 3 sides of box (0,0) as player 0/1 alternating, then player 0 closes it
    let s = createInitialState(PLAYERS);
    s = applyMove(s, makeMove(s, "h", 0, 0)); // p0 → turn passes to p1
    s = applyMove(s, makeMove(s, "h", 1, 0)); // p1 → turn passes to p0
    s = applyMove(s, makeMove(s, "v", 0, 0)); // p0 → turn passes to p1
    // p1 closes the box with the right edge
    const before = s.currentPlayerIndex; // 1
    s = applyMove(s, makeMove(s, "v", 0, 1)); // p1 completes box → stays p1
    expect(s.currentPlayerIndex).toBe(before);
    expect(s.scores[1]).toBe(1);
  });

  it("records the completing player as box owner", () => {
    let s = createInitialState(PLAYERS);
    s = applyMove(s, makeMove(s, "h", 0, 0));
    s = applyMove(s, makeMove(s, "h", 1, 0));
    s = applyMove(s, makeMove(s, "v", 0, 0));
    s = applyMove(s, makeMove(s, "v", 0, 1)); // p1 closes box (0,0)
    expect(s.boxes[0][0].ownerIndex).toBe(1);
  });
});

describe("applyMove — multi-box claim", () => {
  it("claims two boxes from one move when both become complete", () => {
    // Build a 1×2 grid (2 boxes, 7 edges).
    // Draw all edges except the shared vertical edge v(0,1), then close it.
    let s = createInitialState(PLAYERS, 1, 2);
    // Left box sides: h(0,0), h(1,0), v(0,0)  — top, bottom, left
    // Right box sides: h(0,1), h(1,1), v(0,2) — top, bottom, right
    // Shared: v(0,1)
    s = applyMove(s, makeMove(s, "h", 0, 0)); // p0 → p1
    s = applyMove(s, makeMove(s, "h", 1, 0)); // p1 → p0
    s = applyMove(s, makeMove(s, "v", 0, 0)); // p0 → p1
    s = applyMove(s, makeMove(s, "h", 0, 1)); // p1 → p0
    s = applyMove(s, makeMove(s, "h", 1, 1)); // p0 → p1
    s = applyMove(s, makeMove(s, "v", 0, 2)); // p1 → p0
    // Now draw the shared edge — p0 completes BOTH boxes
    s = applyMove(s, makeMove(s, "v", 0, 1));
    expect(s.scores[0]).toBe(2);
    expect(s.boxes[0][0].ownerIndex).toBe(0);
    expect(s.boxes[0][1].ownerIndex).toBe(0);
  });
});

describe("countSides", () => {
  it("returns 0 for an untouched box", () => {
    const state = createInitialState(PLAYERS);
    expect(countSides(0, 0, state)).toBe(0);
  });

  it("increments correctly as edges are drawn", () => {
    let s = createInitialState(PLAYERS);
    s = applyMove(s, makeMove(s, "h", 0, 0)); // top of box (0,0)
    expect(countSides(0, 0, s)).toBe(1);
    s = applyMove(s, makeMove(s, "h", 1, 0)); // bottom
    expect(countSides(0, 0, s)).toBe(2);
    s = applyMove(s, makeMove(s, "v", 0, 0)); // left
    expect(countSides(0, 0, s)).toBe(3);
    s = applyMove(s, makeMove(s, "v", 0, 1)); // right → claimed
    expect(countSides(0, 0, s)).toBe(4);
  });
});

describe("isGameOver", () => {
  it("returns false for an in-progress game", () => {
    const state = createInitialState(PLAYERS);
    expect(isGameOver(state)).toBe(false);
  });

  it("returns true when all 25 boxes are claimed on a 5×5 grid", () => {
    // Simulate a quick 1×1 game (4 moves)
    let s = createInitialState(PLAYERS, 1, 1);
    s = applyMove(s, makeMove(s, "h", 0, 0));
    s = applyMove(s, makeMove(s, "h", 1, 0));
    s = applyMove(s, makeMove(s, "v", 0, 0));
    s = applyMove(s, makeMove(s, "v", 0, 1));
    expect(isGameOver(s)).toBe(true);
  });
});

describe("game over — winner", () => {
  it("declares the player with more boxes as the winner", () => {
    // 1×2 grid (2 boxes). We'll engineer p0 claiming both.
    // Box(0,0): top=h(0,0), bottom=h(1,0), left=v(0,0), right=v(0,1)
    // Box(0,1): top=h(0,1), bottom=h(1,1), left=v(0,1), right=v(0,2)
    // shared edge v(0,1) borders BOTH boxes.
    // Strategy: draw all edges of both boxes except v(0,1).
    // Then when p0 draws v(0,1), it completes BOTH boxes simultaneously.
    let s = createInitialState(PLAYERS, 1, 2);
    s = applyMove(s, makeMove(s, "h", 0, 0)); // p0 → p1
    s = applyMove(s, makeMove(s, "h", 1, 0)); // p1 → p0
    s = applyMove(s, makeMove(s, "v", 0, 0)); // p0 → p1
    s = applyMove(s, makeMove(s, "h", 0, 1)); // p1 → p0
    s = applyMove(s, makeMove(s, "h", 1, 1)); // p0 → p1
    s = applyMove(s, makeMove(s, "v", 0, 2)); // p1 → p0
    // Now p0 draws the shared edge v(0,1) → completes both boxes
    s = applyMove(s, makeMove(s, "v", 0, 1));
    expect(s.status).toBe("finished");
    expect(s.scores[0]).toBe(2);
    expect(s.finishOrder[0]).toBe(s.players[0].id);
  });
});
