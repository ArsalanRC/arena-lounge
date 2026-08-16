/** Registry of hosted games. Add a plugin here and give a table its id. */
import type { GameId, TableGame } from './types'
import { connectFourGame } from './connectfour'
import { dotLinesGame } from './dotlines'
import { reversiGame } from './reversi'
import { ticTacToeGame } from './tictactoe'
import { matchPairsGame } from './matchpairs'
import { checkersGame } from './checkers'
import { chessGame } from './chess'
import { crocSnapGame } from './crocsnap'
import { backgammonGame } from './backgammon'
import { ludoGame } from './ludo'
import { superTicTacToeGame } from './supertictactoe'

const GAMES: Partial<Record<GameId, TableGame>> = {
  connectfour: connectFourGame as TableGame,
  dotlines: dotLinesGame as TableGame,
  reversi: reversiGame as TableGame,
  tictactoe: ticTacToeGame as TableGame,
  matchpairs: matchPairsGame as TableGame,
  checkers: checkersGame as TableGame,
  chess: chessGame as TableGame,
  crocsnap: crocSnapGame as TableGame,
  backgammon: backgammonGame as TableGame,
  ludo: ludoGame as TableGame,
  supertictactoe: superTicTacToeGame as TableGame
}

export function getGame(id: string): TableGame {
  return GAMES[id as GameId] ?? (connectFourGame as TableGame)
}

/** Display name for a game id even before its plugin exists (zone banners). */
export const GAME_NAMES: Record<GameId, string> = {
  connectfour: 'Four in a Row',
  dotlines: 'Dot Lines',
  reversi: 'Reversi',
  tictactoe: 'Tic Tac Toe',
  matchpairs: 'Match Pairs',
  checkers: 'Checkers',
  chess: 'Chess',
  backgammon: 'Backgammon',
  crocsnap: 'Croc Snap',
  ludo: 'Ludo',
  supertictactoe: 'Super Tic Tac Toe',
  snakesladders: 'Snakes & Ladders'
}
