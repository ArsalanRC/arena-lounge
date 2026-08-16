/**
 * Checkers (American draughts) table game. Bridges the pure engine
 * (src/engine/checkers) to the TableGame contract. Touch input is tap a
 * piece, then tap a highlighted square; jumps are forced by the engine and
 * multi-jump chains are one move.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import type { Entity } from '@dcl/sdk/ecs'
import { applyMove, createInitialState, getValidMoves, selectBotMove, type CheckersBoard, type CheckersGameState, type CheckersMove, type CheckersPiece } from '../../engine/checkers'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { PIECE_SPRITES, checkersSelection, createCheckersView, setCheckersSelection, type CheckersAction } from '../views/checkers3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const N = 8
const IMG = { pixel: 'images/ui/pixel.png', ring: 'images/ui/ring.png', dot: 'images/ui/disc.png' }
const LIGHT = Color4.fromHexString('#e8d9bdff')
const DARK = Color4.fromHexString('#6b4a35ff')

interface Wire {
  b: string // 64 chars: . w W b B
  p: number
  s: 'p' | 'f'
  gr: string
  hm: number
  fm: number
  l: [number, number, number[]] | null
  n: number
}

function encode(s: CheckersGameState): string {
  const w: Wire = {
    b: s.board.map((p) => (!p ? '.' : p.color === 'white' ? (p.type === 'king' ? 'W' : 'w') : p.type === 'king' ? 'B' : 'b')).join(''),
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    gr: s.gameResult,
    hm: s.halfmoveClock,
    fm: s.fullmoveNumber,
    l: s.lastMove ? [s.lastMove.from, s.lastMove.to, s.lastMove.captures] : null,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): CheckersGameState {
  const w = JSON.parse(json) as Wire
  const board: CheckersBoard = []
  for (let i = 0; i < 64; i++) {
    const ch = w.b[i]
    board.push(ch === 'w' ? { color: 'white', type: 'man' } : ch === 'W' ? { color: 'white', type: 'king' } : ch === 'b' ? { color: 'black', type: 'man' } : ch === 'B' ? { color: 'black', type: 'king' } : null)
  }
  const idx = w.p === 1 ? 1 : 0
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    board,
    turnColor: idx === 0 ? 'white' : 'black',
    halfmoveClock: w.hm,
    fullmoveNumber: w.fm,
    gameResult: w.gr as CheckersGameState['gameResult'],
    lastMove: w.l ? { from: w.l[0], to: w.l[1], captures: w.l[2], path: [w.l[0], w.l[1]], playerId: '', color: 'red', timestamp: 0 } : null
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

/**
 * Handle a tap on a square: select one of the side-to-move's pieces, or move
 * the selected piece to a legal target. `act` rejects moves that are not the
 * local player's, so the selection is only ever a local highlight.
 */
export function tapSquare(root: Entity, state: CheckersGameState, sq: number, act: (a: CheckersAction) => boolean | void): void {
  const legal = getValidMoves(state)
  const sel = checkersSelection.get(root)
  if (sel !== undefined) {
    const move = legal.find((m) => m.from === sel && m.to === sq)
    if (move) {
      setCheckersSelection(root, null)
      act({ from: sel, to: sq })
      return
    }
  }
  if (legal.some((m) => m.from === sq)) setCheckersSelection(root, sel === sq ? null : sq)
  else setCheckersSelection(root, null)
}

// ---------------------------------------------------------------- controls

function Board(props: { state: CheckersGameState; ctx: GameContext; compact: boolean }) {
  const { state, ctx } = props
  const cell = props.compact ? 32 : 36
  const mirror = ctx.mySeat === 2
  const legal = ctx.myTurn ? getValidMoves(state) : []
  const sel = checkersSelection.get(ctx.root)
  const movable = new Set(legal.map((m) => m.from))
  const targets = new Set(sel === undefined ? [] : legal.filter((m) => m.from === sel).map((m) => m.to))
  const last = state.lastMove
  const rows = []
  // rank 7 at the top for seat A; seat B sees the board mirrored (their side at the bottom)
  for (let r = 0; r < N; r++) {
    const rank = mirror ? r : N - 1 - r
    const cells = []
    for (let c = 0; c < N; c++) {
      const file = mirror ? N - 1 - c : c
      const sq = rank * N + file
      const p: CheckersPiece | null = state.board[sq]
      const dark = (file + rank) % 2 === 1
      const isLast = last !== null && (last.from === sq || last.to === sq)
      const bg = sq === sel ? UI.accent : isLast ? Color4.fromHexString('#8a6a4aff') : dark ? DARK : LIGHT
      cells.push(
        <UiEntity
          key={`s${sq}`}
          uiTransform={{ width: cell, height: cell, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ texture: { src: IMG.pixel }, textureMode: 'stretch', color: bg }}
          onMouseDown={() => {
            if (ctx.myTurn) tapSquare(ctx.root, state, sq, (a) => ctx.act(a))
          }}
        >
          {p !== null && (
            <UiEntity
              uiTransform={{ width: cell - 6, height: cell - 6, justifyContent: 'center', alignItems: 'center' }}
              uiBackground={{ texture: { src: p.color === 'white' ? (p.type === 'king' ? PIECE_SPRITES.whiteKing : PIECE_SPRITES.white) : p.type === 'king' ? PIECE_SPRITES.blackKing : PIECE_SPRITES.black }, textureMode: 'stretch' }}
            >
              {movable.has(sq) && sel === undefined && <UiEntity uiTransform={{ width: cell - 6, height: cell - 6 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: UI.accentTint }} />}
            </UiEntity>
          )}
          {p === null && targets.has(sq) && <UiEntity uiTransform={{ width: 12, height: 12 }} uiBackground={{ texture: { src: IMG.dot }, textureMode: 'stretch', color: Color4.create(1, 1, 1, 0.75) }} />}
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
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 6 }} uiBackground={{ texture: { src: IMG.pixel }, textureMode: 'stretch', color: Color4.fromHexString('#3a2a1eff') }}>
      {rows}
    </UiEntity>
  )
}

function countPieces(board: CheckersBoard, color: 'white' | 'black'): number {
  let n = 0
  for (const p of board) if (p && p.color === color) n++
  return n
}

function Controls(props: { state: CheckersGameState; ctx: GameContext; compact: boolean }) {
  const s = props.state
  const sel = checkersSelection.get(props.ctx.root)
  const forced = props.ctx.myTurn && getValidMoves(s).some((m) => m.captures.length > 0)
  const hint = props.ctx.myTurn ? (sel !== undefined ? 'Tap a marked square' : forced ? 'You must jump' : 'Tap a piece') : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `Pieces  ${countPieces(s.board, 'white')} : ${countPieces(s.board, 'black')}${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} compact={props.compact} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const checkersGame: TableGame<CheckersGameState, CheckersAction> = {
  id: 'checkers',
  label: 'Checkers',
  seatNames: ['White', 'Black'],
  seatSprites: [PIECE_SPRITES.white, PIECE_SPRITES.black],
  seatColors: [Color4.fromHexString('#f2e8d5ff'), Color4.fromHexString('#3a3230ff')],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
    // white always opens in checkers; the opening seat only decides who is white? No: seats are fixed
    // colours (A = white), so seat B opening simply means black starts a round: allowed here.
    return opening === 2 ? { ...s, currentPlayerIndex: 1, turnColor: 'black' } : s
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
    if (s.gameResult === 'white_wins') return 1
    if (s.gameResult === 'black_wins') return 2
    return WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const from = Math.floor(Number(action?.from))
    const to = Math.floor(Number(action?.to))
    const move: CheckersMove | undefined = getValidMoves(s).find((m) => m.from === from && m.to === to)
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = selectBotMove(s, getValidMoves(s), difficulty)
    return m ? { from: m.from, to: m.to } : null
  },
  createView3D(root, onAction, getState) {
    return createCheckersView(root, (sq) => {
      const s = getState()
      if (s) tapSquare(root, s, sq, onAction)
    })
  },
  Controls
}
