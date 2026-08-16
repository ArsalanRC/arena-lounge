/**
 * Match Pairs bot AI — memory-based card selection.
 *
 * The bot maintains a memory of cards it has seen (symbol → [index, ...]).
 * On its turn it makes two flip decisions:
 *
 *  1. First flip:
 *     a. If memory contains 2 indices for the same symbol → pick one (will pair next flip).
 *     b. Otherwise → flip a random face-down, un-matched card.
 *
 *  2. Second flip (called once after first flip is known):
 *     a. If memory shows a card with the same symbol as the just-flipped card → flip it.
 *     b. Otherwise → flip a random un-seen face-down card (avoids the first card).
 *
 * Memory retention probabilities per difficulty:
 *  - easy:   50 % chance to remember a newly seen card
 *  - medium: 80 % chance
 *  - hard:   100 % (perfect memory)
 *
 * The bot only sees a card after it has been flipped (on any player's turn).
 * `updateBotMemory` should be called by the store whenever a card is revealed
 * or resolved, passing current card states.
 */

import type { BotDifficulty } from "../types";
import type { MatchPairsCard } from "./types";

/** Map of symbol → list of known indices that still have that symbol face-down. */
export type BotMemory = Map<string, number[]>;

/** Create a fresh bot memory. */
export function createBotMemory(): BotMemory {
  return new Map();
}

/**
 * Update bot memory based on currently visible card states.
 *
 * For each card that is now face-up (flipped but not yet resolved back):
 *  - Add its index to memory at the symbol key (if not already present),
 *    subject to the forget probability.
 *
 * For each card that is now face-down again (after a mismatch resolve) or
 * matched: entries remain in memory (the bot still remembers what it saw),
 * but matched cards should be pruned out since they are no longer actionable.
 *
 * @param memory    Mutable bot memory to update in place.
 * @param cards     Current card array from game state.
 * @param difficulty Bot difficulty controlling retention probability.
 * @param rng       Optional RNG for deterministic tests.
 */
export function updateBotMemory(
  memory: BotMemory,
  cards: MatchPairsCard[],
  difficulty: BotDifficulty,
  rng: () => number = Math.random
): void {
  const retentionProb = difficulty === "easy" ? 0.5 : difficulty === "medium" ? 0.8 : 1.0;

  // Add newly visible cards to memory
  for (let ci = 0; ci < cards.length; ci++) {
    const card = cards[ci];
    if (card.matched) {
      // Remove matched cards from memory (no longer relevant)
      if (memory.has(card.symbol)) {
        const indices = (memory.get(card.symbol) ?? []).filter((idx) => idx !== card.id);
        if (indices.length === 0) memory.delete(card.symbol);
        else memory.set(card.symbol, indices);
      }
    } else if (card.flipped) {
      // Card is currently visible — record it if not already known
      const existing = memory.get(card.symbol) ?? [];
      if (!existing.includes(card.id)) {
        // Apply retention probability
        if (rng() < retentionProb) {
          memory.set(card.symbol, [...existing, card.id]);
        }
      }
    }
  }
}

/**
 * Select the first flip for the bot's turn.
 *
 * Returns the card index to flip, or null if no valid moves exist.
 * If the bot knows a complete pair in memory, it flips the first of that pair.
 * Otherwise it picks a random face-down, un-matched card.
 */
export function selectFirstFlip(
  memory: BotMemory,
  cards: MatchPairsCard[],
  currentlyFlipped: number[],
  rng: () => number = Math.random
): number | null {
  // Find a known pair: symbol with ≥2 remembered indices that are still valid
  const memEntries = Array.from(memory.values());
  for (let mi = 0; mi < memEntries.length; mi++) {
    const indices = memEntries[mi];
    const valid = indices.filter(
      (idx) => !cards[idx].matched && !cards[idx].flipped && !currentlyFlipped.includes(idx)
    );
    if (valid.length >= 2) {
      return valid[0];
    }
  }

  // No known pair — pick a random unseen card
  const candidates = cards
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => !c.matched && !c.flipped && !currentlyFlipped.includes(i));

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)].i;
}

/**
 * Select the second flip given the symbol revealed by the first flip.
 *
 * If memory contains the matching card for `knownSymbol`, flip it.
 * Otherwise pick a random card that is not the first card, not matched, not flipped.
 */
export function selectSecondFlip(
  memory: BotMemory,
  cards: MatchPairsCard[],
  knownSymbol: string,
  firstIndex: number,
  rng: () => number = Math.random
): number | null {
  // Check memory for the partner
  const remembered = (memory.get(knownSymbol) ?? []).filter(
    (idx) => idx !== firstIndex && !cards[idx].matched && !cards[idx].flipped
  );
  if (remembered.length > 0) {
    return remembered[0];
  }

  // No memory — pick a random card (prefer unseen, avoid first flip)
  const candidates = cards
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => i !== firstIndex && !c.matched && !c.flipped);

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)].i;
}
