/**
 * Tic Tac Toe table game: the 30-second warm-up. Bridges the pure engine
 * (src/engine/tictactoe) to the TableGame contract; the touch UI is a 3x3
 * grid of big buttons.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { applyMove, createInitialState, getValidMoves, selectBotMove, type Mark, type TTTBoard, type TTTGameState } from '../../engine/tictactoe'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { TTT_COLORS, createTicTacToeView, type TTTAction } from '../views/tictactoe3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const IMG = { x: 'images/ui/mark-x.png', o: 'images/ui/mark-o.png' }

interface Wire {
  b: string // 9 chars: X, O or .
  p: number
  s: 'p' | 'f'
  w: [number, number, number] | null
  d: boolean
  n: number
}

function encode(s: TTTGameState): string {
  const w: Wire = { b: s.board.map((c) => c ?? '.').join(''), p: s.currentPlayerIndex, s: s.status === 'finished' ? 'f' : 'p', w: s.winLine, d: s.isDraw, n: s.turnNumber }
  return JSON.stringify(w)
}

function decode(json: string): TTTGameState {
  const w = JSON.parse(json) as Wire
  const board = w.b.split('').map((ch) => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null)) as TTTBoard
  const idx = w.p === 1 ? 1 : 0
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    board,
    currentMark: idx === 0 ? 'X' : 'O',
    winLine: w.w,
    isDraw: w.d
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

function Board(props: { state: TTTGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 96 : 88
  const win = new Set(state.winLine ?? [])
  const rows = []
  for (let r = 0; r < 3; r++) {
    const cells = []
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c
      const v = state.board[i]
      cells.push(
        <UiEntity
          key={`c${i}`}
          uiTransform={{ width: cell, height: cell, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ color: win.has(i) ? Color4.create(1, 1, 1, 0.22) : Color4.create(1, 1, 1, 0.08) }}
          onMouseDown={() => {
            if (ctx.myTurn && v === null) ctx.act({ cell: i } as TTTAction)
          }}
        >
          {v !== null && (
            <UiEntity uiTransform={{ width: cell - 22, height: cell - 22 }} uiBackground={{ texture: { src: v === 'X' ? IMG.x : IMG.o }, textureMode: 'stretch', color: v === 'X' ? TTT_COLORS[0] : TTT_COLORS[1] }} />
          )}
        </UiEntity>
      )
    }
    rows.push(
      <UiEntity key={`r${r}`} uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto' }}>
        {cells}
      </UiEntity>
    )
  }
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 6 }} uiBackground={{ color: Color4.fromHexString('#3a3230ff') }}>
      {rows}
    </UiEntity>
  )
}

function Controls(props: { state: TTTGameState; ctx: GameContext; phone: boolean }) {
  const mine: Mark | null = props.ctx.mySeat === 1 ? 'X' : props.ctx.mySeat === 2 ? 'O' : null
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      {mine !== null && (
        <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `You play ${mine}${props.ctx.myTurn ? '   ·   Tap an empty square' : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      )}
      <Board state={props.state} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const ticTacToeGame: TableGame<TTTGameState, TTTAction> = {
  id: 'tictactoe',
  label: 'Tic Tac Toe',
  seatNames: ['X', 'O'],
  seatSprites: [IMG.x, IMG.o],
  seatSpriteTints: TTT_COLORS,
  seatColors: TTT_COLORS,

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
    return opening === 2 ? { ...s, currentPlayerIndex: 1, currentMark: 'O' } : s
  },
  encode,
  decode,
  turnSeat(s) {
    return s.status === 'finished' ? 0 : seatOfIndex(s.currentPlayerIndex)
  },
  finished(s) {
    return s.status === 'finished'
  },
  winner(s) {
    if (s.status !== 'finished') return WIN_NONE
    if (s.isDraw || !s.winLine) return WIN_DRAW
    return seatOfIndex(s.currentPlayerIndex)
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const cell = Math.floor(Number(action?.cell))
    if (!(cell >= 0 && cell < 9) || s.board[cell] !== null) return null
    const player = s.players[s.currentPlayerIndex]
    try {
      return applyMove(s, { cellIndex: cell, mark: s.currentMark, playerId: player.id, color: player.color, timestamp: Date.now() })
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = selectBotMove(s, getValidMoves(s), difficulty)
    return m ? { cell: m.cellIndex } : null
  },
  createView3D: createTicTacToeView,
  Controls
}
