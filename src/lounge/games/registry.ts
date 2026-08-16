/** Registry of hosted games. Add a plugin here and give a table its id. */
import type { GameId, TableGame } from './types'
import { connectFourGame } from './connectfour'

const GAMES: Record<GameId, TableGame> = {
  connectfour: connectFourGame as TableGame,
  // dotlines lands next; until then tables must not reference it
  dotlines: connectFourGame as TableGame
}

export function getGame(id: string): TableGame {
  return GAMES[(id as GameId) in GAMES ? (id as GameId) : 'connectfour']
}
