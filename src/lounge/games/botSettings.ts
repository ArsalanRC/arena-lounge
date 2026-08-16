/**
 * Bot strength chosen by the local player. Lives in its own module so game
 * plugins (which must not import tables.ts) can read it, e.g. Match Pairs
 * updates its bot memory with the chosen retention rate on every flip.
 */
import type { BotDifficulty } from '../../engine/types'

export const botSettings: { difficulty: BotDifficulty } = { difficulty: 'medium' }
