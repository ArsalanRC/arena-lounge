/**
 * Backgammon rules — dice, legal move generation, applyMove, bearing off,
 * turn advancement.
 *
 * Every function is pure. Invalid moves return the input state unchanged
 * (the caller should use `getLegalMoves` to filter).
 *
 * Bearing-off semantics ("higher roll" rule):
 *   Bearing off with an exact pip is always legal when the home board is
 *   ready. If the roll exceeds the highest remaining home point, the
 *   player may bear off from that highest point with a larger roll. If
 *   the roll is larger than needed AND a lower point has checkers, the
 *   roll cannot be used to bear off — it must be played as a regular
 *   move if possible.
 */

import type {
  BackgammonColor,
  BackgammonGameState,
  BackgammonMove,
  BackgammonPoint,
} from "./types";
import {
  CHECKERS_PER_SIDE,
  HOME_POINTS,
  OPPOSITE,
  POINT_COUNT,
  barEntryPoint,
  moveDirection,
} from "./constants";

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

export function rollD6(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

export function rollTwoDice(rng: () => number = Math.random): [number, number] {
  return [rollD6(rng), rollD6(rng)];
}

export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

/**
 * Returns the list of pips available for the given dice. Doubles grant
 * four of the same value; otherwise both distinct values are returned.
 */
export function pipsFromDice(dice: [number, number]): number[] {
  return isDoubles(dice) ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
}

// ---------------------------------------------------------------------------
// Ownership / home-board helpers
// ---------------------------------------------------------------------------

export function ownedBy(
  state: BackgammonGameState,
  index: number,
  color: BackgammonColor
): boolean {
  const p = state.points[index];
  return p.count > 0 && p.owner === color;
}

/** Are ALL of `color`'s checkers in their home board (or borne off)? */
export function allInHome(
  state: BackgammonGameState,
  color: BackgammonColor
): boolean {
  if (state.bar[color] > 0) return false;
  const home = HOME_POINTS[color];
  const homeSet = new Set(home);
  for (let i = 0; i < POINT_COUNT; i++) {
    if (homeSet.has(i)) continue;
    if (state.points[i].count > 0 && state.points[i].owner === color) return false;
  }
  return true;
}

/** Highest-numbered home point that still carries at least one checker. */
export function farthestHomePoint(
  state: BackgammonGameState,
  color: BackgammonColor
): number | null {
  // White bears off from 0..5; the "farthest" (away from 0) is the largest index.
  // Black bears off from 18..23; the farthest (away from 23) is the smallest.
  if (color === "white") {
    for (let i = 5; i >= 0; i--) {
      if (state.points[i].count > 0 && state.points[i].owner === color) return i;
    }
  } else {
    for (let i = 18; i <= 23; i++) {
      if (state.points[i].count > 0 && state.points[i].owner === color) return i;
    }
  }
  return null;
}

/**
 * Total pips remaining for `color` to move all their checkers home and off.
 * Standard pip-count formula — exposed primarily for bot evaluation.
 */
export function pipCount(
  state: BackgammonGameState,
  color: BackgammonColor
): number {
  let total = 0;
  for (let i = 0; i < POINT_COUNT; i++) {
    const p = state.points[i];
    if (p.count === 0 || p.owner !== color) continue;
    // White: distance to bear-off is i + 1 (from point 5 → 6 pips to off).
    //   (Technically white bears off when pip 0 is reached; distance to go is i+1.)
    // Black: distance to bear-off is 24 - i.
    const dist = color === "white" ? i + 1 : 24 - i;
    total += dist * p.count;
  }
  // Bar checkers contribute max-distance = 25.
  total += state.bar[color] * 25;
  return total;
}

// ---------------------------------------------------------------------------
// Legal move enumeration
// ---------------------------------------------------------------------------

/**
 * List every legal move available given the current state (from any
 * source, using any remaining pip). Does NOT enforce the "must use
 * both dice if possible" constraint — callers that care must validate
 * move *sequences* separately.
 */
export function getLegalMoves(state: BackgammonGameState): BackgammonMove[] {
  if (state.status !== "playing") return [];
  const color = state.turnColor;
  const playerId = state.players[state.currentPlayerIndex]?.id ?? "";
  const out: BackgammonMove[] = [];
  const pipsSet = new Set(state.remainingPips);

  // If the player has checkers on the bar, they MUST re-enter first.
  if (state.bar[color] > 0) {
    for (const pip of Array.from(pipsSet)) {
      const target = barEntryPoint(color, pip);
      if (target < 0 || target >= POINT_COUNT) continue;
      const pt = state.points[target];
      if (canLandOn(pt, color)) {
        out.push(makeMove(playerId, color, "bar", target, pip, pt.owner === OPPOSITE[color] && pt.count === 1));
      }
    }
    return out;
  }

  const dir = moveDirection(color);
  const canBearOff = allInHome(state, color);

  for (let from = 0; from < POINT_COUNT; from++) {
    const src = state.points[from];
    if (src.count === 0 || src.owner !== color) continue;
    for (const pip of Array.from(pipsSet)) {
      const rawTo = from + dir * pip;
      // Regular in-board move.
      if (rawTo >= 0 && rawTo < POINT_COUNT) {
        const pt = state.points[rawTo];
        if (canLandOn(pt, color)) {
          out.push(
            makeMove(
              playerId,
              color,
              from,
              rawTo,
              pip,
              pt.owner === OPPOSITE[color] && pt.count === 1
            )
          );
        }
        continue;
      }
      // Outside the 0..23 range means bearing off.
      if (!canBearOff) continue;
      // Exact off: rawTo == -1 (white) or 24 (black).
      const wentExactly =
        (color === "white" && rawTo === -1) ||
        (color === "black" && rawTo === POINT_COUNT);
      if (wentExactly) {
        out.push(makeMove(playerId, color, from, "off", pip, false));
        continue;
      }
      // Overshoot: legal only if `from` is the farthest occupied home point.
      const farthest = farthestHomePoint(state, color);
      if (farthest === null) continue;
      const overshotBy =
        color === "white" ? -rawTo - 1 : rawTo - POINT_COUNT;
      if (overshotBy > 0 && from === farthest) {
        // Need to confirm this is exactly the pip needed — i.e. no further
        // home points beyond this could have used it.
        const requiredPip =
          color === "white" ? from + 1 : POINT_COUNT - from;
        if (pip >= requiredPip) {
          out.push(makeMove(playerId, color, from, "off", pip, false));
        }
      }
    }
  }

  return dedupeMoves(out);
}

function canLandOn(pt: BackgammonPoint, color: BackgammonColor): boolean {
  if (pt.count === 0) return true;
  if (pt.owner === color) return true;
  // Opponent's point: can only land if it's a single blot (count === 1).
  return pt.count === 1;
}

function makeMove(
  playerId: string,
  color: BackgammonColor,
  from: number | "bar",
  to: number | "off",
  pips: number,
  hit: boolean
): BackgammonMove {
  return {
    playerId,
    color: color === "white" ? "red" : "blue",
    timestamp: Date.now(),
    from,
    to,
    pips,
    hit,
  };
}

function dedupeMoves(moves: BackgammonMove[]): BackgammonMove[] {
  const seen = new Set<string>();
  const out: BackgammonMove[] = [];
  for (const m of moves) {
    const key = `${m.from}|${m.to}|${m.pips}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

/**
 * Apply a single move (one pip's worth) from the current player's
 * available dice. Returns an unchanged state when the move is illegal.
 *
 * If every pip has been consumed after applying, the turn advances and
 * the new turnColor is set. Otherwise the same player continues.
 */
export function applyMove(
  state: BackgammonGameState,
  move: BackgammonMove
): BackgammonGameState {
  if (state.status !== "playing") return state;
  const legal = getLegalMoves(state);
  const match = legal.find(
    (m) => m.from === move.from && m.to === move.to && m.pips === move.pips
  );
  if (!match) return state;

  const color = state.turnColor;
  const opposite = OPPOSITE[color];
  const pts = state.points.map((p) => ({ ...p }));
  const bar = { ...state.bar };
  const off = { ...state.off };

  // Source removal.
  if (match.from === "bar") {
    bar[color] = Math.max(0, bar[color] - 1);
  } else {
    const src = pts[match.from];
    src.count -= 1;
    if (src.count === 0) src.owner = null;
  }

  // Destination placement (hit opposite blot if applicable).
  if (match.to === "off") {
    off[color] += 1;
  } else {
    const dst = pts[match.to];
    if (dst.owner === opposite && dst.count === 1) {
      // Hit.
      bar[opposite] += 1;
      dst.count = 0;
      dst.owner = null;
    }
    dst.owner = color;
    dst.count += 1;
  }

  // Remove the consumed pip.
  const remainingPips = [...state.remainingPips];
  const idx = remainingPips.indexOf(match.pips);
  if (idx >= 0) remainingPips.splice(idx, 1);

  // Win check.
  if (off[color] >= CHECKERS_PER_SIDE) {
    return {
      ...state,
      points: pts,
      bar,
      off,
      remainingPips: [],
      dice: null,
      lastMove: match,
      moveCounter: state.moveCounter + 1,
      status: "finished",
      gameResult: color === "white" ? "white_wins" : "black_wins",
      finishOrder: [
        state.players[state.currentPlayerIndex].id,
        state.players[1 - state.currentPlayerIndex].id,
      ],
    };
  }

  // If pips remain AND the player can use at least one, they stay on.
  // Otherwise the turn ends (even if pips are still nominally available —
  // "stuck" scenarios forfeit the remaining pips in Backgammon).
  const tentative: BackgammonGameState = {
    ...state,
    points: pts,
    bar,
    off,
    remainingPips,
    lastMove: match,
    moveCounter: state.moveCounter + 1,
  };

  const canContinue =
    remainingPips.length > 0 && getLegalMoves(tentative).length > 0;
  if (canContinue) return tentative;

  // End the turn: swap color, clear dice.
  return {
    ...tentative,
    turnColor: opposite,
    currentPlayerIndex: 1 - state.currentPlayerIndex,
    dice: null,
    remainingPips: [],
    turnNumber: state.turnNumber + 1,
  };
}

/**
 * Roll two dice, set `remainingPips`, and update `state.dice`. Returns a
 * fresh state. No-ops if the player still has unused pips.
 */
export function rollForTurn(
  state: BackgammonGameState,
  rng: () => number = Math.random
): BackgammonGameState {
  if (state.status !== "playing") return state;
  if (state.dice !== null || state.remainingPips.length > 0) return state;
  const dice = rollTwoDice(rng);
  return {
    ...state,
    dice,
    remainingPips: pipsFromDice(dice),
  };
}

/**
 * End the current player's turn early — used when no legal move exists
 * with the remaining pips (should be detected by the caller).
 */
export function endTurn(state: BackgammonGameState): BackgammonGameState {
  if (state.status !== "playing") return state;
  return {
    ...state,
    turnColor: OPPOSITE[state.turnColor],
    currentPlayerIndex: 1 - state.currentPlayerIndex,
    dice: null,
    remainingPips: [],
    turnNumber: state.turnNumber + 1,
  };
}

/** True if the current player has any legal move this turn. */
export function hasLegalMove(state: BackgammonGameState): boolean {
  return getLegalMoves(state).length > 0;
}
