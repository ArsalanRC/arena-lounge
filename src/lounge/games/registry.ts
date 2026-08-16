/** Registry of hosted games. Add a plugin here and give a table its id. */
import type { GameId, TableGame } from './types'
import { connectFourGame } from './connectfour'
import { dotLinesGame } from './dotlines'

const GAMES: Record<GameId, TableGame> = {
  connectfour: connectFourGame as TableGame,
  dotlines: dotLinesGame as TableGame
}

export function getGame(id: string): TableGame {
  return GAMES[(id as GameId) in GAMES ? (id as GameId) : 'connectfour']
}
