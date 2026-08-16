/**
 * Snakes & Ladders game rules — dice rolling, movement, snake/ladder
 * resolution, bounce-back, bonus turns, bust, and turn management.
 *
 * Key rules:
 *   - Position 0 = off-board. First roll enters the board at square `diceValue`.
 *   - Must land exactly on 100 to win. Overshoot = bounce back from 100.
 *   - Landing on a snake head slides down; landing on a ladder bottom climbs up.
 *   - No chain reactions — snake/ladder triggers once only.
 *   - Single mode: rolling 6 = bonus turn. Double mode: rolling double 6s (6-6) = bonus turn.
 *   - Three consecutive bonus rolls = bust (turn forfeited, piece stays put).
 */

import type {
  DiceMode,
  DoubleDiceState,
  SnakeOrLadder,
  SnakesLaddersGameState,
  SnakesLaddersMove,
} from "./types";
import { BUST_THRESHOLD, WIN_POSITION } from "./constants";

// ---------------------------------------------------------------------------
// Dice rolling
// ---------------------------------------------------------------------------

/** Roll a single die (1–6). */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Roll two dice, returning individual values. */
export function rollDoubleDice(): [number, number] {
  return [rollDice(), rollDice()];
}

// ---------------------------------------------------------------------------
// Snake / ladder lookup
// ---------------------------------------------------------------------------

/**
 * Find a snake or ladder at the given square.
 * Returns the entity if found, null otherwise.
 */
export function findSnakeOrLadder(
  square: number,
  snakes: SnakeOrLadder[],
  ladders: SnakeOrLadder[]
): SnakeOrLadder | null {
  return (
    snakes.find((s) => s.from === square) ??
    ladders.find((l) => l.from === square) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Bonus / bust logic
// ---------------------------------------------------------------------------

/** Check if a dice result grants a bonus turn. */
export function isBonusRoll(
  diceValue: number,
  diceMode: DiceMode,
  doubleDice: DoubleDiceState | null
): boolean {
  if (diceMode === "single") {
    return diceValue === 6;
  }
  // Double mode: bonus only on double 6s (6-6)
  return doubleDice !== null && doubleDice.diceValues[0] === 6 && doubleDice.diceValues[1] === 6;
}

// ---------------------------------------------------------------------------
// Move calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the bounce-back position when overshooting 100.
 * E.g. position 97 + roll 5 = 102 → bounces to 100 - (102 - 100) = 98.
 */
export function calculateBounce(position: number, diceValue: number): number {
  const overshoot = position + diceValue - WIN_POSITION;
  return WIN_POSITION - overshoot;
}

/**
 * Calculate the full move for the current player given a dice value.
 * Handles entering the board, forward movement, bounce-back, and snake/ladder.
 */
export function calculateMove(
  state: SnakesLaddersGameState,
  diceValue: number
): SnakesLaddersMove {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentPos = state.positions[currentPlayer.color];

  // Calculate raw destination
  const rawDest = currentPos + diceValue;
  let isBounce = false;
  let destination: number;

  if (rawDest > WIN_POSITION) {
    // Bounce back from 100
    destination = calculateBounce(currentPos, diceValue);
    isBounce = true;
  } else {
    destination = rawDest;
  }

  // Check for snake or ladder at the destination
  const triggered = findSnakeOrLadder(destination, state.snakes, state.ladders);
  const finalTo = triggered ? triggered.to : destination;

  return {
    playerId: currentPlayer.id,
    color: currentPlayer.color,
    timestamp: Date.now(),
    from: currentPos,
    to: destination,
    finalTo,
    diceValue,
    triggeredSnakeOrLadder: triggered,
    isBounce,
  };
}

// ---------------------------------------------------------------------------
// Turn management
// ---------------------------------------------------------------------------

/**
 * Get the next active player index, skipping players who have finished.
 * Wraps around the players array.
 */
export function getNextActivePlayerIndex(
  state: SnakesLaddersGameState,
  afterIndex: number
): number {
  const count = state.players.length;
  for (let offset = 1; offset <= count; offset++) {
    const candidate = (afterIndex + offset) % count;
    const candidatePlayer = state.players[candidate];
    if (!state.finishOrder.includes(candidatePlayer.id)) {
      return candidate;
    }
  }
  return afterIndex;
}

/** Count how many players have not yet finished. */
export function getActivePlayers(state: SnakesLaddersGameState): number {
  return state.players.length - state.finishOrder.length;
}

// ---------------------------------------------------------------------------
// Apply move
// ---------------------------------------------------------------------------

/**
 * Apply a move to produce a new game state.
 *
 * Handles: position update, win detection, bonus turn, bust, turn advancement.
 * The caller (store) is responsible for animation timing between intermediate
 * states — the engine just produces the final logical state.
 */
export function applyMove(
  state: SnakesLaddersGameState,
  move: SnakesLaddersMove
): SnakesLaddersGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Update position to final destination (after snake/ladder)
  const newPositions = {
    ...state.positions,
    [currentPlayer.color]: move.finalTo,
  };

  // Check for win
  const hasWon = move.finalTo === WIN_POSITION;
  const newFinishOrder = hasWon
    ? [...state.finishOrder, currentPlayer.id]
    : [...state.finishOrder];

  // Check if game is over (only 1 player remaining)
  const remainingAfterMove = state.players.length - newFinishOrder.length;
  const isGameOver = remainingAfterMove <= 1;

  if (isGameOver) {
    // Add the last remaining player to finish order
    const lastPlayer = state.players.find(
      (p) => !newFinishOrder.includes(p.id)
    );
    if (lastPlayer) {
      newFinishOrder.push(lastPlayer.id);
    }

    return {
      ...state,
      positions: newPositions,
      status: "finished",
      finishOrder: newFinishOrder,
      currentDiceValue: move.diceValue,
      hasRolled: true,
      turnPhase: "roll",
      lastSnakeOrLadder: move.triggeredSnakeOrLadder,
      isBust: false,
      consecutiveBonuses: 0,
      turnNumber: state.turnNumber + 1,
    };
  }

  // Check for bonus turn (6 in single / double 6s in double mode)
  const bonus = isBonusRoll(move.diceValue, state.diceMode, state.doubleDice);
  const newConsecutiveBonuses = bonus ? state.consecutiveBonuses + 1 : 0;

  // Check for bust (3 consecutive bonuses)
  const isBust = newConsecutiveBonuses >= BUST_THRESHOLD;

  if (isBust) {
    // Bust: turn forfeited, piece stays where it was BEFORE this move
    const bustPositions = {
      ...state.positions,
      [currentPlayer.color]: move.from,
    };
    const nextIndex = getNextActivePlayerIndex(
      { ...state, finishOrder: newFinishOrder },
      state.currentPlayerIndex
    );

    return {
      ...state,
      positions: bustPositions,
      currentPlayerIndex: nextIndex,
      currentDiceValue: move.diceValue,
      hasRolled: false,
      consecutiveBonuses: 0,
      turnPhase: "roll",
      doubleDice: null,
      lastSnakeOrLadder: null,
      isBust: true,
      finishOrder: newFinishOrder,
      turnNumber: state.turnNumber + 1,
    };
  }

  if (bonus && !hasWon) {
    // Bonus turn: same player rolls again
    return {
      ...state,
      positions: newPositions,
      currentDiceValue: move.diceValue,
      hasRolled: false,
      consecutiveBonuses: newConsecutiveBonuses,
      turnPhase: "roll",
      doubleDice: null,
      lastSnakeOrLadder: move.triggeredSnakeOrLadder,
      isBust: false,
      finishOrder: newFinishOrder,
      turnNumber: state.turnNumber + 1,
    };
  }

  // Normal turn end: advance to next player
  const nextIndex = getNextActivePlayerIndex(
    { ...state, finishOrder: newFinishOrder },
    state.currentPlayerIndex
  );

  return {
    ...state,
    positions: newPositions,
    currentPlayerIndex: nextIndex,
    currentDiceValue: move.diceValue,
    hasRolled: false,
    consecutiveBonuses: 0,
    turnPhase: "roll",
    doubleDice: null,
    lastSnakeOrLadder: move.triggeredSnakeOrLadder,
    isBust: false,
    finishOrder: newFinishOrder,
    turnNumber: state.turnNumber + 1,
  };
}
