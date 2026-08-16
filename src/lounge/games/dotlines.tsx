/**
 * Dot Lines (dots and boxes) table game: bridges the pure engine
 * (src/engine/dotlines) to the TableGame contract and provides the touch UI.
 *
 * Input is "connect the dots": tap a dot, then a neighbouring dot. Dots are
 * big targets, edges are not, which is what makes this playable on a phone.
 * Seat B stands on the far side of the upright board and sees it mirrored,
 * so the UI mirrors columns for seat B to match.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { applyMove, createInitialState, getBotMove, getLegalMoves, type DotLinesGameState } from '../../engine/dotlines'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { createDotLinesView, dotSelection, tapDot, type DotAction } from '../views/dotlines3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const ROWS = 5
const COLS = 5

const IMG = {
  dot: 'images/ui/hole.png',
  ring: 'images/ui/ring.png',
  yellow: 'images/ui/disc-yellow.png',
  red: 'images/ui/disc-red.png'
}

interface Wire {
  h: string // (ROWS+1)*COLS chars '0'/'1'
  v: string // ROWS*(COLS+1) chars
  b: string // ROWS*COLS chars '0' none '1' A '2' B
  p: number
  s: 'p' | 'f'
  sc: [number, number]
  l: [string, number, number] | null
  n: number
}

function encode(s: DotLinesGameState): string {
  const wire: Wire = {
    h: s.horizontalLines.map((row) => row.map((x) => (x ? '1' : '0')).join('')).join(''),
    v: s.verticalLines.map((row) => row.map((x) => (x ? '1' : '0')).join('')).join(''),
    b: s.boxes.map((row) => row.map((bx) => (bx.ownerIndex === null ? '0' : bx.ownerIndex === 0 ? '1' : '2')).join('')).join(''),
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    sc: [s.scores[0] ?? 0, s.scores[1] ?? 0],
    l: s.lastMove ? [s.lastMove.orientation, s.lastMove.row, s.lastMove.col] : null,
    n: s.turnNumber
  }
  return JSON.stringify(wire)
}

function decode(json: string): DotLinesGameState {
  const w = JSON.parse(json) as Wire
  const horizontalLines: boolean[][] = []
  for (let r = 0; r <= ROWS; r++) {
    const row: boolean[] = []
    for (let c = 0; c < COLS; c++) row.push(w.h[r * COLS + c] === '1')
    horizontalLines.push(row)
  }
  const verticalLines: boolean[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: boolean[] = []
    for (let c = 0; c <= COLS; c++) row.push(w.v[r * (COLS + 1) + c] === '1')
    verticalLines.push(row)
  }
  const boxes = []
  for (let r = 0; r < ROWS; r++) {
    const row = []
    for (let c = 0; c < COLS; c++) {
      const ch = w.b[r * COLS + c]
      row.push({ ownerIndex: ch === '1' ? 0 : ch === '2' ? 1 : null })
    }
    boxes.push(row)
  }
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n,
    finishOrder: [],
    rows: ROWS,
    cols: COLS,
    horizontalLines,
    verticalLines,
    boxes,
    scores: [w.sc[0], w.sc[1]],
    lastMove: w.l ? { orientation: w.l[0] === 'v' ? 'v' : 'h', row: w.l[1], col: w.l[2], completedBoxes: [] } : null
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

const CELL = 42 // dot pitch in UI px
const DOT = 22
const LINE_T = 8

function Board(props: { state: DotLinesGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 60 : CELL
  const dot = props.phone ? 30 : DOT
  const lineT = props.phone ? 10 : LINE_T
  const mirror = ctx.mySeat === 2
  const size = cell * (COLS + 1)
  const root = ctx.root
  const sel = dotSelection.get(root)
  const mx = (c: number) => (mirror ? COLS - c : c) // mirrored dot column
  const items: ReactEcs.JSX.Element[] = []

  // box fills
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const o = state.boxes[r][c].ownerIndex
      if (o === null) continue
      const cc = mirror ? COLS - 1 - c : c
      items.push(
        <UiEntity
          key={`b${r}-${c}`}
          uiTransform={{ positionType: 'absolute', position: { left: cc * cell + cell / 2 + 4, top: r * cell + cell / 2 + 4 }, width: cell - 8, height: cell - 8 }}
          uiBackground={{ color: o === 0 ? Color4.create(0.96, 0.77, 0.1, 0.5) : Color4.create(0.89, 0.27, 0.24, 0.5) }}
        />
      )
    }
  // edges (faint when undrawn so players see the options)
  const isLast = (o: 'h' | 'v', r: number, c: number) => state.lastMove?.orientation === o && state.lastMove.row === r && state.lastMove.col === c
  for (let r = 0; r <= ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const on = state.horizontalLines[r][c]
      const cc = mirror ? COLS - 1 - c : c
      items.push(
        <UiEntity
          key={`h${r}-${c}`}
          uiTransform={{ positionType: 'absolute', position: { left: cc * cell + cell / 2, top: r * cell + cell / 2 - lineT / 2 }, width: cell, height: lineT }}
          uiBackground={{ color: on ? (isLast('h', r, c) ? UI.win : UI.text) : Color4.create(0, 0, 0, 0.08) }}
        />
      )
    }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS; c++) {
      const on = state.verticalLines[r][c]
      const cc = mx(c)
      items.push(
        <UiEntity
          key={`v${r}-${c}`}
          uiTransform={{ positionType: 'absolute', position: { left: cc * cell + cell / 2 - lineT / 2, top: r * cell + cell / 2 }, width: lineT, height: cell }}
          uiBackground={{ color: on ? (isLast('v', r, c) ? UI.win : UI.text) : Color4.create(0, 0, 0, 0.08) }}
        />
      )
    }
  // dots on top (tap targets are the whole cell)
  for (let r = 0; r <= ROWS; r++)
    for (let c = 0; c <= COLS; c++) {
      const cc = mx(c)
      const selected = sel !== undefined && sel.r === r && sel.c === c
      items.push(
        <UiEntity
          key={`d${r}-${c}`}
          uiTransform={{ positionType: 'absolute', position: { left: cc * cell, top: r * cell }, width: cell, height: cell, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          onMouseDown={() => {
            if (!ctx.myTurn) return
            tapDot(root, r, c, (a) => ctx.act(a))
          }}
        >
          <UiEntity
            uiTransform={{ width: selected ? dot + 10 : dot, height: selected ? dot + 10 : dot }}
            uiBackground={{ texture: { src: selected ? IMG.ring : IMG.dot }, textureMode: 'stretch', color: selected ? UI.win : Color4.create(0.15, 0.13, 0.12, 1) }}
          />
        </UiEntity>
      )
    }

  return (
    <UiEntity uiTransform={{ width: size + 16, height: size + 16, padding: 8 }} uiBackground={{ color: Color4.fromHexString('#e9dcc4ff') }}>
      <UiEntity uiTransform={{ width: size, height: size }}>{items}</UiEntity>
    </UiEntity>
  )
}

function Controls(props: { state: DotLinesGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const hint = props.ctx.myTurn ? L().g.tapDot : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${L().g.boxes}  ${s.scores[0]} : ${s.scores[1]}${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const dotLinesGame: TableGame<DotLinesGameState, DotAction> = {
  id: 'dotlines',
  label: 'Dot Lines',
  seatNames: ['Yellow', 'Red'],
  seatSprites: [IMG.yellow, IMG.red],
  seatColors: [UI.yellow, UI.red],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS, ROWS, COLS)
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
    const [a, b] = s.scores
    return a === b ? WIN_DRAW : a > b ? 1 : 2
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const legal = getLegalMoves(s).find((m) => m.orientation === action?.o && m.row === action?.r && m.col === action?.c)
    if (!legal) return null
    try {
      return applyMove(s, legal)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = getBotMove(s, difficulty)
    return m ? { o: m.orientation, r: m.row, c: m.col } : null
  },
  createView3D: createDotLinesView,
  Controls
}
