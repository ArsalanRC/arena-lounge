/**
 * Snakes & Ladders state creation — initializes a 2–4 player game.
 * All pieces start off-board at position 0. Red always goes first.
 */

import type { PlayerColor, PlayerInfo } from "../types";
import type { DiceMode, SnakeOrLadder, SnakesLaddersGameState } from "./types";
import {
  COLOR_ORDER,
  DEFAULT_LADDERS,
  DEFAULT_SNAKES,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "./constants";

/**
 * Build typed SnakeOrLadder arrays from the default positions.
 */
function buildSnakesAndLadders(): {
  snakes: SnakeOrLadder[];
  ladders: SnakeOrLadder[];
} {
  const snakes: SnakeOrLadder[] = DEFAULT_SNAKES.map((s) => ({
    from: s.from,
    to: s.to,
    type: "snake" as const,
  }));
  const ladders: SnakeOrLadder[] = DEFAULT_LADDERS.map((l) => ({
    from: l.from,
    to: l.to,
    type: "ladder" as const,
  }));
  return { snakes, ladders };
}

/**
 * Create initial state for a new Snakes & Ladders game.
 * Validates 2–4 players; sorts by color order (red first).
 */
export function createInitialState(
  players: PlayerInfo[],
  diceMode: DiceMode = "single"
): SnakesLaddersGameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Snakes & Ladders requires ${MIN_PLAYERS}–${MAX_PLAYERS} players, got ${players.length}`
    );
  }

  // Sort players by color order: red, blue, green, yellow
  const sortedPlayers = [...players].sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  // Initialize all positions to 0 (off-board)
  const positions: Record<PlayerColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };

  const { snakes, ladders } = buildSnakesAndLadders();

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    positions,
    currentDiceValue: null,
    hasRolled: false,
    consecutiveBonuses: 0,
    turnPhase: "roll",
    diceMode,
    doubleDice: null,
    snakes,
    ladders,
    lastSnakeOrLadder: null,
    isBust: false,
  };
}
