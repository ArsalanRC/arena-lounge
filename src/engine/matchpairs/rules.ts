/**
 * Match Pairs game rules — card flipping, match detection, turn management.
 *
 * Turn flow:
 *  1. Player calls flip(state, index) → card is revealed.
 *  2. Player calls flip(state, index2) → second card revealed.
 *     a. Match: both cards are marked matched + claimed by this player;
 *        scores[player] incremented; same player gets another turn (turnFlips reset).
 *     b. Mismatch: flippedIndices holds both indices; caller is responsible for
 *        showing them briefly, then calling resolveMismatch to flip them back
 *        and advance to the next player.
 *  3. When all cards are matched, status → "finished" and finishOrder is built.
 */

import type { MatchPairsGameState, MatchPairsCard } from "./types";

/** Build a sorted finish order: player with most pairs first; ties broken by turn order. */
function buildFinishOrder(state: MatchPairsGameState): string[] {
  return [...state.players]
    .sort((a, b) => {
      const diff = (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0);
      if (diff !== 0) return diff;
      return a.playerOrder - b.playerOrder;
    })
    .map((p) => p.id);
}

/** True when every card on the board has been claimed. */
export function isGameOver(state: MatchPairsGameState): boolean {
  return state.cards.every((c) => c.matched);
}

/**
 * Flip a card at `index`.
 *
 * Rejects (throws) if:
 *  - The card is already matched.
 *  - The card is already in flippedIndices (already face-up this turn).
 *  - Two cards are already face-up (waiting for resolve).
 *  - The game is not in "playing" status.
 *
 * Returns the next state. If this is the second flip:
 *  - Match: pairs are claimed, score incremented, same player continues.
 *  - Mismatch: state has both indices in flippedIndices; caller waits then calls resolveMismatch.
 */
export function flip(state: MatchPairsGameState, index: number): MatchPairsGameState {
  if (state.status !== "playing") {
    throw new Error("Game is not in playing state");
  }

  const card = state.cards[index];
  if (!card) throw new Error(`No card at index ${index}`);
  if (card.matched) throw new Error(`Card ${index} is already matched`);
  if (state.flippedIndices.includes(index)) {
    throw new Error(`Card ${index} is already flipped this turn`);
  }
  if (state.flippedIndices.length >= 2) {
    throw new Error("Two cards already flipped — resolve first");
  }

  // Reveal the card
  const newCards: MatchPairsCard[] = state.cards.map((c, i) =>
    i === index ? { ...c, flipped: true } : c
  );

  const currentPlayer = state.players[state.currentPlayerIndex];
  const newFlipped = [...state.flippedIndices, index];

  // First flip of this turn
  if (newFlipped.length === 1) {
    return {
      ...state,
      cards: newCards,
      flippedIndices: newFlipped,
      turnFlips: state.turnFlips + 1,
    };
  }

  // Second flip — check for match
  const [firstIdx, secondIdx] = newFlipped as [number, number];
  const firstCard = newCards[firstIdx];
  const secondCard = newCards[secondIdx];
  const isMatch = firstCard.symbol === secondCard.symbol;

  if (isMatch) {
    // Claim the pair
    const claimedCards = newCards.map((c, i) =>
      i === firstIdx || i === secondIdx
        ? { ...c, matched: true, matchedBy: currentPlayer.id }
        : c
    );

    const newScores = {
      ...state.scores,
      [currentPlayer.id]: (state.scores[currentPlayer.id] ?? 0) + 1,
    };

    const nextState: MatchPairsGameState = {
      ...state,
      cards: claimedCards,
      flippedIndices: [],
      scores: newScores,
      turnFlips: 0,
      moveCount: state.moveCount + 1,
      turnNumber: state.turnNumber + 1,
      // Same player gets another turn after a match
      currentPlayerIndex: state.currentPlayerIndex,
    };

    if (isGameOver(nextState)) {
      return {
        ...nextState,
        status: "finished",
        finishOrder: buildFinishOrder(nextState),
      };
    }

    return nextState;
  }

  // Mismatch — leave flippedIndices with both indices; caller will call resolveMismatch
  return {
    ...state,
    cards: newCards,
    flippedIndices: newFlipped,
    turnFlips: state.turnFlips + 1,
    moveCount: state.moveCount + 1,
  };
}

/**
 * Resolve a mismatch after the reveal delay.
 * Flips both cards back face-down and advances to the next player.
 * Throws if there is not exactly one mismatch pair pending.
 */
export function resolveMismatch(state: MatchPairsGameState): MatchPairsGameState {
  if (state.flippedIndices.length !== 2) {
    throw new Error("resolveMismatch called with wrong number of flipped indices");
  }

  const [firstIdx, secondIdx] = state.flippedIndices as [number, number];
  const first = state.cards[firstIdx];
  const second = state.cards[secondIdx];

  // Safety guard: if somehow called on a matched pair, do nothing
  if (first.matched || second.matched) {
    throw new Error("resolveMismatch called on matched cards");
  }

  const flippedBack = state.cards.map((c, i) =>
    i === firstIdx || i === secondIdx ? { ...c, flipped: false } : c
  );

  const nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    cards: flippedBack,
    flippedIndices: [],
    turnFlips: 0,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: state.turnNumber + 1,
  };
}
