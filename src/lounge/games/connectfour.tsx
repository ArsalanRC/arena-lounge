/**
 * Connect Four table game: bridges the pure engine (src/engine/connectfour)
 * to the TableGame contract, and provides the touch controller.
 *
 * Sync payload: a compact JSON object (42-char cell string + turn + status +
 * winning cells + last move), ~120 bytes, rebuilt into the engine's grid
 * state on decode.
 */
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  COLS,
  ROWS,
  applyMove,
  createInitialState,
  getBotMove,
  isColumnPlayable,
  type ConnectFourCell,
  type ConnectFourGameState
} from '../../engine/connectfour'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { createConnectFourView, type C4Action } from '../views/connectfour3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

/** Engine player list: platform colour "red" maps to the yellow disc (index 0). */
const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]

const IMG = {
  button: 'images/ui/button.png',
  yellow: 'images/ui/disc-yellow.png',
  red: 'images/ui/disc-red.png',
  hole: 'images/ui/hole.png',
  ring: 'images/ui/ring.png'
}
const CELL = 40
const CELL_GAP = 4

interface Wire {
  /** 42 chars row-major, '0' empty '1' yellow '2' red. */
  c: string
  /** current player index 0/1 */
  p: number
  /** 'p' playing, 'f' finished */
  s: 'p' | 'f'
  /** winning cells or null */
  w: Array<[number, number]> | null
  /** last move [row, col] or null */
  l: [number, number] | null
  n: number
}

function toCells(state: ConnectFourGameState): string {
  let out = ''
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = state.board[r][c]
      out += v === 'yellow' ? '1' : v === 'red' ? '2' : '0'
    }
  }
  return out
}

function fromCells(cells: string): ConnectFourCell[][] {
  const grid: ConnectFourCell[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: ConnectFourCell[] = []
    for (let c = 0; c < COLS; c++) {
      const ch = cells[r * COLS + c]
      row.push(ch === '1' ? 'yellow' : ch === '2' ? 'red' : 'empty')
    }
    grid.push(row)
  }
  return grid
}

function encode(state: ConnectFourGameState): string {
  const wire: Wire = {
    c: toCells(state),
    p: state.currentPlayerIndex,
    s: state.status === 'finished' ? 'f' : 'p',
    w: state.winningCells,
    l: state.lastMove ? [state.lastMove.row, state.lastMove.column] : null,
    n: state.turnNumber
  }
  return JSON.stringify(wire)
}

function decode(json: string): ConnectFourGameState {
  const w = JSON.parse(json) as Wire
  const idx = w.p === 1 ? 1 : 0
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    board: fromCells(w.c),
    currentDisc: idx === 0 ? 'yellow' : 'red',
    winningCells: w.w,
    lastMove:
      w.l === null
        ? null
        : { kind: 'drop', column: w.l[1], row: w.l[0], playerId: '', color: 'red', timestamp: 0 }
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

function Cell(props: { key?: string; v: number; highlight: boolean }) {
  return (
    <UiEntity
      uiTransform={{ width: CELL, height: CELL, margin: CELL_GAP / 2, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={{ texture: { src: props.v === 0 ? IMG.hole : props.v === 1 ? IMG.yellow : IMG.red }, textureMode: 'stretch' }}
    >
      {props.highlight && (
        <UiEntity uiTransform={{ width: CELL, height: CELL }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch' }} />
      )}
    </UiEntity>
  )
}

/** Full 7x6 board; columns are tappable when it is the player's turn. */
function Board(props: { state: ConnectFourGameState; ctx: GameContext }) {
  const { state, ctx } = props
  const win = new Set((state.winningCells ?? []).map(([r, c]) => r * COLS + c))
  const last = state.lastMove ? state.lastMove.row * COLS + state.lastMove.column : -1
  const columns = []
  for (let c = 0; c < COLS; c++) {
    const cells = []
    for (let r = 0; r < ROWS; r++) {
      const idx = r * COLS + c
      const v = state.board[r][c] === 'yellow' ? 1 : state.board[r][c] === 'red' ? 2 : 0
      cells.push(<Cell key={`c${idx}`} v={v} highlight={win.has(idx) || (idx === last && win.size === 0)} />)
    }
    columns.push(
      <UiEntity
        key={`col${c}`}
        uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', pointerFilter: 'block' }}
        onMouseDown={() => {
          if (ctx.myTurn) ctx.act({ col: c } as C4Action)
        }}
      >
        {cells}
      </UiEntity>
    )
  }
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto', padding: 8 }} uiBackground={{ color: UI.boardBg }}>
      {columns}
    </UiEntity>
  )
}

/** Seven big drop buttons, one per column, showing the player's disc. */
function DropStrip(props: { state: ConnectFourGameState; ctx: GameContext }) {
  const { state, ctx } = props
  const sprite = ctx.mySeat === 2 ? IMG.red : IMG.yellow
  const buttons = []
  for (let c = 0; c < COLS; c++) {
    const playable = ctx.myTurn && isColumnPlayable(state.board, c)
    buttons.push(
      <UiEntity
        key={`d${c}`}
        uiTransform={{ width: 70, height: 76, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block', opacity: playable ? 1 : 0.35 }}
        uiBackground={{ texture: { src: IMG.button }, textureMode: 'stretch', color: UI.boardBg }}
        onMouseDown={() => {
          if (playable) ctx.act({ col: c } as C4Action)
        }}
      >
        <UiEntity uiTransform={{ width: 46, height: 46 }} uiBackground={{ texture: { src: sprite }, textureMode: 'stretch' }} />
      </UiEntity>
    )
  }
  return <UiEntity uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto' }}>{buttons}</UiEntity>
}

/** Phone: the drop strip (the 3D board is the show) unless the player asked for the full board. */
function Controls(props: { state: ConnectFourGameState; ctx: GameContext; phone: boolean; fullBoard: boolean }) {
  return props.phone && !props.fullBoard ? <DropStrip state={props.state} ctx={props.ctx} /> : <Board state={props.state} ctx={props.ctx} />
}

// ---------------------------------------------------------------- plugin

export const connectFourGame: TableGame<ConnectFourGameState, C4Action> = {
  id: 'connectfour',
  label: 'Connect Four',
  seatNames: ['Yellow', 'Red'],
  seatSprites: [IMG.yellow, IMG.red],
  seatColors: [UI.yellow, UI.red],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
    if (opening === 2) return { ...s, currentPlayerIndex: 1, currentDisc: 'red' }
    return s
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
    if (!s.winningCells) return WIN_DRAW
    // the player who just moved won; currentPlayerIndex is left on the winner by applyMove
    return seatOfIndex(s.currentPlayerIndex)
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const col = Math.floor(Number(action?.col))
    if (!(col >= 0 && col < COLS) || !isColumnPlayable(s.board, col)) return null
    const player = s.players[s.currentPlayerIndex]
    try {
      return applyMove(s, { kind: 'drop', column: col, row: 0, playerId: player.id, color: player.color, timestamp: Date.now() })
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const move = getBotMove(s, difficulty)
    return move ? { col: move.column } : null
  },
  createView3D: createConnectFourView,
  Controls,
  hasStrip: true
}
