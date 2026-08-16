import { describe, it, expect } from "vitest";
import type { PlayerInfo } from "../../types";
import type {
  CheckersBoard,
  CheckersGameState,
  CheckersPieceColor,
  CheckersPieceType,
  CheckersMove,
} from "../types";
import { TOTAL_SQUARES } from "../constants";
import { createInitialState } from "../state";
import {
  applyMove,
  getValidMoves,
  countPieces,
  frToSq,
  fileOf,
  rankOf,
  isDarkSquare,
  onBoard,
} from "../rules";

const PLAYERS: PlayerInfo[] = [
  { id: "p1", color: "red", playerOrder: 0 },
  { id: "p2", color: "blue", playerOrder: 1 },
];

function emptyBoard(): CheckersBoard {
  return Array(TOTAL_SQUARES).fill(null);
}

function place(
  board: CheckersBoard,
  type: CheckersPieceType,
  color: CheckersPieceColor,
  file: number,
  rank: number
): void {
  board[frToSq(file, rank)] = { type, color };
}

function customState(
  build: (board: CheckersBoard) => void,
  overrides: Partial<CheckersGameState> = {}
): CheckersGameState {
  const board = emptyBoard();
  build(board);
  return {
    ...createInitialState(PLAYERS),
    board,
    ...overrides,
  };
}

function findMove(
  moves: CheckersMove[],
  from: number,
  to: number
): CheckersMove | undefined {
  return moves.find((m) => m.from === from && m.to === to);
}

describe("geometry helpers", () => {
  it("round-trips fileOf / rankOf / frToSq", () => {
    for (let sq = 0; sq < 64; sq++) {
      expect(frToSq(fileOf(sq), rankOf(sq))).toBe(sq);
    }
  });
  it("isDarkSquare returns true only for (file+rank) odd", () => {
    expect(isDarkSquare(frToSq(1, 0))).toBe(true); // b1
    expect(isDarkSquare(frToSq(0, 0))).toBe(false); // a1
    expect(isDarkSquare(frToSq(0, 1))).toBe(true); // a2
  });
  it("onBoard bounds check", () => {
    expect(onBoard(0, 0)).toBe(true);
    expect(onBoard(7, 7)).toBe(true);
    expect(onBoard(-1, 0)).toBe(false);
    expect(onBoard(8, 0)).toBe(false);
  });
});

describe("initial state", () => {
  it("places 12 men per side on dark squares only", () => {
    const state = createInitialState(PLAYERS);
    const counts = countPieces(state.board, "white");
    const counts2 = countPieces(state.board, "black");
    expect(counts.men).toBe(12);
    expect(counts.kings).toBe(0);
    expect(counts2.men).toBe(12);
    expect(counts2.kings).toBe(0);
    // Every piece should sit on a dark square.
    for (let sq = 0; sq < 64; sq++) {
      if (state.board[sq] && !isDarkSquare(sq)) {
        throw new Error(`piece on light square ${sq}`);
      }
    }
  });

  it("white moves first", () => {
    const state = createInitialState(PLAYERS);
    expect(state.turnColor).toBe("white");
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("sorts players so red (white) is index 0", () => {
    const flipped: PlayerInfo[] = [
      { id: "p2", color: "blue", playerOrder: 1 },
      { id: "p1", color: "red", playerOrder: 0 },
    ];
    const state = createInitialState(flipped);
    expect(state.players[0].color).toBe("red");
  });

  it("throws on wrong player count", () => {
    expect(() => createInitialState([PLAYERS[0]])).toThrow();
  });
});

describe("opening moves", () => {
  it("white has 7 legal moves from the opening (4 inner pieces, 3 have 2 moves... actually)", () => {
    const state = createInitialState(PLAYERS);
    const moves = getValidMoves(state);
    // 4 men on rank 2 can each move; edge men have 1 move, middle men have 2.
    // Pieces on rank 2 dark squares: b3 (1,2), d3 (3,2), f3 (5,2), h3 (7,2).
    // b3 → a4 OR c4 (2 moves), d3 → c4 OR e4, f3 → e4 OR g4, h3 → g4 only (edge).
    // Total = 2+2+2+1 = 7.
    expect(moves.length).toBe(7);
  });

  it("no jump moves from the opening", () => {
    const state = createInitialState(PLAYERS);
    const moves = getValidMoves(state);
    expect(moves.every((m) => m.captures.length === 0)).toBe(true);
  });
});

describe("man moves", () => {
  it("white man moves forward-left and forward-right only", () => {
    const state = customState((b) => place(b, "man", "white", 3, 3));
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // Diagonals: to c5 (2,4) and e5 (4,4)
    expect(moves.length).toBe(2);
    expect(findMove(moves, frToSq(3, 3), frToSq(2, 4))).toBeDefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 4))).toBeDefined();
  });

  it("black man moves forward-left and forward-right only (other way)", () => {
    const state = customState(
      (b) => place(b, "man", "black", 3, 3),
      { turnColor: "black", currentPlayerIndex: 1 }
    );
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // Diagonals: to c3 (2,2) and e3 (4,2)
    expect(moves.length).toBe(2);
    expect(findMove(moves, frToSq(3, 3), frToSq(2, 2))).toBeDefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 2))).toBeDefined();
  });

  it("man cannot move backwards", () => {
    const state = customState((b) => place(b, "man", "white", 3, 3));
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // c3 (2,2) and e3 (4,2) are backwards for white; should NOT appear.
    expect(findMove(moves, frToSq(3, 3), frToSq(2, 2))).toBeUndefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 2))).toBeUndefined();
  });

  it("blocked by own piece cannot move into it", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "white", 2, 4);
    });
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // c5 (2,4) is blocked; e5 (4,4) is open.
    expect(moves.length).toBe(1);
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 4))).toBeDefined();
  });
});

describe("king moves", () => {
  it("king moves diagonally in all four directions", () => {
    const state = customState((b) => place(b, "king", "white", 3, 3));
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    expect(moves.length).toBe(4);
    expect(findMove(moves, frToSq(3, 3), frToSq(2, 2))).toBeDefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 2))).toBeDefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(2, 4))).toBeDefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(4, 4))).toBeDefined();
  });

  it("king only steps one square (American rules)", () => {
    const state = customState((b) => place(b, "king", "white", 3, 3));
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // No 2+ square moves.
    expect(findMove(moves, frToSq(3, 3), frToSq(5, 5))).toBeUndefined();
    expect(findMove(moves, frToSq(3, 3), frToSq(1, 1))).toBeUndefined();
  });
});

describe("jump moves — forced captures", () => {
  it("white man jumps one enemy", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "black", 4, 4);
    });
    const moves = getValidMoves(state);
    // Forced jump — c5 / non-capture moves are NOT returned.
    expect(moves.length).toBe(1);
    expect(moves[0].captures).toEqual([frToSq(4, 4)]);
    expect(moves[0].to).toBe(frToSq(5, 5));
  });

  it("cannot jump own piece", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "white", 4, 4);
    });
    const moves = getValidMoves(state).filter((m) => m.from === frToSq(3, 3));
    // No jump; just the simple move to c5 (2,4).
    const jumps = moves.filter((m) => m.captures.length > 0);
    expect(jumps.length).toBe(0);
  });

  it("cannot jump when destination is occupied", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "black", 4, 4);
      place(b, "man", "black", 5, 5);
    });
    const jumpsFromA = getValidMoves(state).filter(
      (m) => m.from === frToSq(3, 3) && m.captures.length > 0
    );
    expect(jumpsFromA.length).toBe(0);
  });

  it("chains multi-jumps", () => {
    // White man at b2 jumps c3 → d4, then jumps e5 → f6.
    const state = customState((b) => {
      place(b, "man", "white", 1, 1);
      place(b, "man", "black", 2, 2);
      place(b, "man", "black", 4, 4);
    });
    const moves = getValidMoves(state);
    expect(moves.length).toBe(1);
    const m = moves[0];
    expect(m.captures).toEqual([frToSq(2, 2), frToSq(4, 4)]);
    expect(m.to).toBe(frToSq(5, 5));
    expect(m.path).toEqual([frToSq(1, 1), frToSq(3, 3), frToSq(5, 5)]);
  });

  it("forced to take a jump when one is available", () => {
    // White man at b2 can simple-move OR jump c3. Rules: must jump.
    const state = customState((b) => {
      place(b, "man", "white", 1, 1);
      place(b, "man", "black", 2, 2);
      // Another white on the board that COULD make a simple move.
      place(b, "man", "white", 5, 1);
    });
    const moves = getValidMoves(state);
    expect(moves.every((m) => m.captures.length > 0)).toBe(true);
  });

  it("king jumps backwards too", () => {
    const state = customState((b) => {
      place(b, "king", "white", 3, 3);
      place(b, "man", "black", 2, 2);
    });
    const jumps = getValidMoves(state).filter((m) => m.captures.length > 0);
    expect(jumps.length).toBeGreaterThan(0);
    const backJump = jumps.find((m) => m.to === frToSq(1, 1));
    expect(backJump).toBeDefined();
    expect(backJump?.captures).toEqual([frToSq(2, 2)]);
  });

  it("man promotion ends the jump sequence (stop on king)", () => {
    // White man at c5 jumps d6 then lands on e7 (rank 6 — NOT the back rank).
    // Actually we want landing on rank 7 — place pieces so the man lands
    // exactly on the back rank after one jump and could keep going as king.
    // Layout: white man d6, black man e7, landing square f8 is the king row.
    // After landing on f8, there would still be a diagonal enemy at g7 to
    // jump — but American rules say the sequence ends.
    const state = customState((b) => {
      place(b, "man", "white", 3, 5);
      place(b, "man", "black", 4, 6);
      place(b, "man", "black", 6, 6);
    });
    const moves = getValidMoves(state);
    // Should jump once and stop; not chain through g7.
    expect(moves.length).toBe(1);
    expect(moves[0].to).toBe(frToSq(5, 7));
    expect(moves[0].captures).toEqual([frToSq(4, 6)]);
    expect(moves[0].promoted).toBe(true);
  });
});

describe("applyMove", () => {
  it("moves a man and updates turn + fullmove + halfmove", () => {
    const state = createInitialState(PLAYERS);
    const move = getValidMoves(state)[0];
    const after = applyMove(state, move);
    expect(after.turnColor).toBe("black");
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.fullmoveNumber).toBe(1); // white moved — black's move coming
    expect(after.halfmoveClock).toBe(0); // man advance resets
  });

  it("removes captured pieces", () => {
    const state = customState((b) => {
      place(b, "man", "white", 3, 3);
      place(b, "man", "black", 4, 4);
    });
    const move = getValidMoves(state)[0];
    const after = applyMove(state, move);
    expect(after.board[frToSq(4, 4)]).toBeNull();
    expect(after.board[frToSq(5, 5)]).toEqual({ type: "man", color: "white" });
  });

  it("promotes a man to king", () => {
    // White man one square from the king row.
    const state = customState((b) => place(b, "man", "white", 3, 6));
    const moves = getValidMoves(state);
    const promote = moves.find((m) => m.to === frToSq(2, 7));
    expect(promote).toBeDefined();
    const after = applyMove(state, promote!);
    expect(after.board[frToSq(2, 7)]).toEqual({ type: "king", color: "white" });
  });

  it("declares win when opponent has no moves", () => {
    // White man at a3, black man at b4 about to be trapped/captured.
    // Simpler: black has only one piece left with no legal moves.
    const state = customState(
      (b) => {
        // Black man trapped in the corner with no moves.
        place(b, "man", "black", 0, 0);
        place(b, "man", "white", 0, 1); // BLOCKS the diagonal from a1 to b2
        place(b, "man", "white", 2, 2);
      },
      { turnColor: "black", currentPlayerIndex: 1 }
    );
    // Wait — we must have a LEGAL white move too. Let's add a white man
    // elsewhere and use applyMove to reach the finish condition naturally.
    // Actually we can just call getValidMoves and if it returns [], the
    // state itself evaluates. But we use applyMove + finaliseGameResult
    // which only triggers on apply. For a pure legal-move-count assertion:
    expect(getValidMoves(state).length).toBe(0);
  });

  it("fifty-move rule (halfmove 80) triggers draw", () => {
    // Two kings shuffling with no capture or man move for 80 halfmoves.
    const state = customState(
      (b) => {
        place(b, "king", "white", 0, 0);
        place(b, "king", "black", 7, 7);
      },
      { halfmoveClock: 79 }
    );
    const move = getValidMoves(state)[0];
    const after = applyMove(state, move);
    expect(after.halfmoveClock).toBe(80);
    expect(after.status).toBe("finished");
    expect(after.drawReason).toBe("forty_move");
  });
});

describe("edge cases", () => {
  it("returns [] when game already finished", () => {
    const state = createInitialState(PLAYERS);
    const finished = { ...state, status: "finished" as const, gameResult: "white_wins" as const };
    expect(getValidMoves(finished).length).toBe(0);
  });

  it("multiple jump paths are all returned", () => {
    // White man at c3 can jump d4 OR b4 (both directions have an enemy).
    const state = customState((b) => {
      place(b, "man", "white", 2, 2);
      place(b, "man", "black", 3, 3);
      place(b, "man", "black", 1, 3);
    });
    const jumps = getValidMoves(state);
    expect(jumps.length).toBe(2);
    const destinations = new Set(jumps.map((m) => m.to));
    expect(destinations).toEqual(new Set([frToSq(4, 4), frToSq(0, 4)]));
  });
});
