/**
 * Reversi table game: bridges the pure engine (src/engine/reversi) to the
 * TableGame contract and provides the touch UI (tap a square; legal squares
 * are marked on your turn). Passes are handled inside the engine: when the
 * opponent has no move you simply keep the turn.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { applyMove, createInitialState, getBotMove, getLegalMoves, score, type ReversiCell, type ReversiGameState } from '../../engine/reversi'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { createReversiView, type ReversiAction } from '../views/reversi3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const N = 8
const IMG = {
  dark: 'images/ui/disc-dark.png',
  light: 'images/ui/disc-light.png',
  ring: 'images/ui/ring.png',
  
  disc: 'images/ui/disc.png'
}
const FELT = Color4.fromHexString('#2f6b46ff')
const FELT_LINE = Color4.fromHexString('#1d452cff')

interface Wire {
  b: string // 64 chars: 0 empty, 1 black, 2 white
  p: number
  s: 'p' | 'f'
  pc: number
  l: [number, number] | null
  n: number
}

function encode(s: ReversiGameState): string {
  const w: Wire = {
    b: s.board.map((row) => row.map((c) => (c === 'black' ? '1' : c === 'white' ? '2' : '0')).join('')).join(''),
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    pc: s.passCount,
    l: s.lastMove ? [s.lastMove.r, s.lastMove.c] : null,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): ReversiGameState {
  const w = JSON.parse(json) as Wire
  const board: ReversiCell[][] = []
  for (let r = 0; r < N; r++) {
    const row: ReversiCell[] = []
    for (let c = 0; c < N; c++) {
      const ch = w.b[r * N + c]
      row.push(ch === '1' ? 'black' : ch === '2' ? 'white' : 'empty')
    }
    board.push(row)
  }
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n,
    finishOrder: [],
    board,
    passCount: w.pc,
    lastMove: w.l ? { r: w.l[0], c: w.l[1] } : null
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

function Board(props: { state: ReversiGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 56 : 36
  const mirror = ctx.mySeat === 2
  const legal = new Set(ctx.myTurn ? getLegalMoves(state).map((m) => m.r * N + m.c) : [])
  const last = state.lastMove ? state.lastMove.r * N + state.lastMove.c : -1
  const rows = []
  for (let r = 0; r < N; r++) {
    const cells = []
    for (let c0 = 0; c0 < N; c0++) {
      const c = mirror ? N - 1 - c0 : c0
      const idx = r * N + c
      const v = state.board[r][c]
      cells.push(
        <UiEntity
          key={`c${idx}`}
          uiTransform={{ width: cell, height: cell, margin: 1, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ color: FELT }}
          onMouseDown={() => {
            if (ctx.myTurn) ctx.act({ r, c } as ReversiAction)
          }}
        >
          {v !== 'empty' && (
            <UiEntity uiTransform={{ width: cell - 6, height: cell - 6, justifyContent: 'center', alignItems: 'center' }} uiBackground={{ texture: { src: v === 'black' ? IMG.dark : IMG.light }, textureMode: 'stretch' }}>
              {idx === last && <UiEntity uiTransform={{ width: cell - 6, height: cell - 6 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: UI.accentTint }} />}
            </UiEntity>
          )}
          {v === 'empty' && legal.has(idx) && (
            <UiEntity uiTransform={{ width: cell / 3, height: cell / 3 }} uiBackground={{ texture: { src: IMG.disc }, textureMode: 'stretch', color: Color4.create(1, 1, 1, 0.55) }} />
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
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 6 }} uiBackground={{ color: FELT_LINE }}>
      {rows}
    </UiEntity>
  )
}

function Controls(props: { state: ReversiGameState; ctx: GameContext; phone: boolean }) {
  const sc = score(props.state.board)
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${L().g.discs}  ${sc.black} : ${sc.white}${props.ctx.myTurn ? '   ·   ' + L().g.tapMarked : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={props.state} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const reversiGame: TableGame<ReversiGameState, ReversiAction> = {
  id: 'reversi',
  label: 'Reversi',
  seatNames: ['Black', 'White'],
  seatSprites: [IMG.dark, IMG.light],
  seatColors: [Color4.fromHexString('#3a3230ff'), Color4.fromHexString('#f2e8d5ff')],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
    return opening === 2 ? { ...s, currentPlayerIndex: 1 } : s
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
    const sc = score(s.board)
    return sc.black === sc.white ? WIN_DRAW : sc.black > sc.white ? 1 : 2
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const r = Math.floor(Number(action?.r))
    const c = Math.floor(Number(action?.c))
    if (!getLegalMoves(s).some((m) => m.r === r && m.c === c)) return null
    const player = s.players[s.currentPlayerIndex]
    try {
      return applyMove(s, { kind: 'place', row: r, col: c, playerId: player.id, color: player.color, timestamp: Date.now() })
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = getBotMove(s, difficulty)
    return m.kind === 'place' && m.row !== undefined && m.col !== undefined ? { r: m.row, c: m.col } : null
  },
  createView3D: createReversiView,
  Controls
}
