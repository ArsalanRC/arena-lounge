/**
 * Croc Snap game rules — tooth pressing, elimination, and round management.
 *
 * Each round: 12 teeth, 1 hidden trigger. Players press teeth in turn order.
 * Press the trigger → eliminated. Round resets for remaining players.
 * Last player standing wins.
 */

import type { CrocSnapGameState, CrocSnapMove } from "./types";
import { createTeeth } from "./state";

/** Get all valid moves for the current player (all un-pressed teeth). */
export function getValidMoves(state: CrocSnapGameState): CrocSnapMove[] {
  if (state.status !== "playing") return [];

  const currentPlayer = state.players[state.currentPlayerIndex];

  return state.teeth
    .map((tooth, index) => ({ tooth, index }))
    .filter(({ tooth }) => !tooth.pressed)
    .map(({ index }) => ({
      playerId: currentPlayer.id,
      color: currentPlayer.color,
      timestamp: Date.now(),
      toothIndex: index,
    }));
}

/**
 * Get the next active (non-eliminated) player index after the given index.
 * Wraps around the players array, skipping eliminated players.
 */
export function getNextActivePlayerIndex(
  state: CrocSnapGameState,
  afterIndex: number
): number {
  const count = state.players.length;
  for (let offset = 1; offset <= count; offset++) {
    const candidate = (afterIndex + offset) % count;
    if (!state.eliminatedPlayers.includes(state.players[candidate].id)) {
      return candidate;
    }
  }
  // Should not happen if game logic is correct
  return afterIndex;
}

/** Count how many players are still alive. */
export function getAliveCount(state: CrocSnapGameState): number {
  return state.players.length - state.eliminatedPlayers.length;
}

/** Apply a move (press a tooth) and return the new game state. */
export function applyMove(state: CrocSnapGameState, move: CrocSnapMove): CrocSnapGameState {
  const { toothIndex } = move;

  if (state.teeth[toothIndex].pressed) {
    throw new Error(`Tooth ${toothIndex} is already pressed`);
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Press the tooth
  const newTeeth = state.teeth.map((t, i) =>
    i === toothIndex ? { pressed: true } : t
  );

  // Check if this is the trigger tooth
  const isSnap = toothIndex === state.triggerIndex;

  if (isSnap) {
    // Player is eliminated
    const newEliminated = [...state.eliminatedPlayers, currentPlayer.id];
    const aliveCount = state.players.length - newEliminated.length;

    if (aliveCount <= 1) {
      // Game over — find the winner
      const winner = state.players.find(
        (p) => !newEliminated.includes(p.id)
      )!;

      // Build finish order: winner first, then eliminated in reverse
      // (last eliminated = 2nd place, first eliminated = last place)
      const finishOrder = [
        winner.id,
        ...newEliminated.reverse(),
      ];

      return {
        ...state,
        teeth: newTeeth,
        status: "finished",
        eliminatedPlayers: newEliminated,
        finishOrder,
        lastSnap: { toothIndex, eliminatedPlayerId: currentPlayer.id },
        turnNumber: state.turnNumber + 1,
      };
    }

    // Round continues with remaining players — reset teeth for new round
    const { teeth: freshTeeth, triggerIndex: newTrigger } = createTeeth();
    const nextIndex = getNextActivePlayerIndex(state, state.currentPlayerIndex);

    return {
      ...state,
      teeth: freshTeeth,
      triggerIndex: newTrigger,
      round: state.round + 1,
      eliminatedPlayers: newEliminated,
      currentPlayerIndex: nextIndex,
      lastSnap: { toothIndex, eliminatedPlayerId: currentPlayer.id },
      turnNumber: state.turnNumber + 1,
    };
  }

  // Safe tooth — just advance to next player
  const nextIndex = getNextActivePlayerIndex(state, state.currentPlayerIndex);

  return {
    ...state,
    teeth: newTeeth,
    currentPlayerIndex: nextIndex,
    lastSnap: null,
    turnNumber: state.turnNumber + 1,
  };
}
