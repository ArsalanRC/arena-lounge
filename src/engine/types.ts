/**
 * Base game engine interfaces for all game types.
 * Pure TypeScript — no React, no Supabase dependencies.
 */

export type PlayerColor = "red" | "blue" | "green" | "yellow";

export type BotDifficulty = "easy" | "medium" | "hard";

export interface PlayerInfo {
  id: string;
  color: PlayerColor;
  playerOrder: number;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export interface BaseGameState {
  status: "waiting" | "playing" | "finished";
  players: PlayerInfo[];
  currentPlayerIndex: number;
  turnNumber: number;
  finishOrder: string[]; // player IDs in finish order
}

export interface BaseGameMove {
  playerId: string;
  color: PlayerColor;
  timestamp: number;
}

export interface GameEngine<S extends BaseGameState, M extends BaseGameMove> {
  createInitialState(players: PlayerInfo[]): S;
  getValidMoves(state: S, diceValue: number): M[];
  applyMove(state: S, move: M): S;
  checkWinCondition(state: S): string | null; // returns winner player ID or null
  getNextPlayerIndex(state: S): number;
  isGameOver(state: S): boolean;
}
