/**
 * Ludo game state creation and transitions.
 *
 * Accepts an optional GameConfig to control dice mode (single vs double).
 * Backward-compatible — no config defaults to single dice mode.
 */

import type { PlayerInfo } from "../types";
import type { LudoGameState, PiecePositions, DiceMode } from "./types";
import { YARD_POSITION, COLOR_ORDER } from "./constants";

/** Configuration for creating a new game. */
export interface GameConfig {
  diceMode?: DiceMode;
}

/**
 * Create initial game state for a new Ludo game.
 * All pieces start in the yard (-1).
 * First player in the list goes first.
 */
export function createInitialState(players: PlayerInfo[], config?: GameConfig): LudoGameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error(`Ludo requires 2-4 players, got ${players.length}`);
  }

  // Validate player colors
  const colors = players.map((p) => p.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== colors.length) {
    throw new Error("Duplicate player colors");
  }
  for (const color of colors) {
    if (!COLOR_ORDER.includes(color)) {
      throw new Error(`Invalid color: ${color}`);
    }
  }

  // Initialize all pieces in the yard
  const yardPieces: PiecePositions = [
    YARD_POSITION,
    YARD_POSITION,
    YARD_POSITION,
    YARD_POSITION,
  ];

  const pieces: Record<string, PiecePositions> = {
    red: [...yardPieces] as PiecePositions,
    blue: [...yardPieces] as PiecePositions,
    green: [...yardPieces] as PiecePositions,
    yellow: [...yardPieces] as PiecePositions,
  };

  // Sort players by their color order for consistent turn sequence
  const sortedPlayers = [...players].sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  return {
    status: "playing",
    players: sortedPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    finishOrder: [],
    board: {
      pieces: pieces as Record<"red" | "blue" | "green" | "yellow", PiecePositions>,
    },
    currentDiceValue: null,
    hasRolled: false,
    consecutiveSixes: 0,
    validMoves: [],
    turnPhase: "roll",
    diceMode: config?.diceMode ?? "single",
    doubleDice: null,
  };
}
