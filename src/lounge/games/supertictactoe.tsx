/**
 * Super Tic Tac Toe table game: nine 3x3 boards in a 3x3 grid; the cell you
 * play in sends your rival to the board with that index; win three boards in
 * a row. Bridges src/engine/supertictactoe to the TableGame contract; the
 * touch UI is the 9x9 grid with the forced board highlighted. X (side 1)
 * moves first.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { applyMove, createInitialState, getValidMoves, selectBotMove, type MetaBoard, type SubBoard, type SuperTTTGameState } from '../../engine/supertictactoe'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { STTT_COLORS, createSuperTTTView, type SuperTTTAction } from '../views/supertictactoe3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const IMG = { x: 'images/ui/mark-x.png', o: 'images/ui/mark-o.png' }

interface Wire {
  b: string // 81 chars: X, O or .
  m: string // 9 chars: X, O, D (drawn) or .
  a: number // active board or -1
  p: number
  s: 'p' | 'f'
  w: [number, number, number] | null
  d: 0 | 1
  n: number
}

function encode(s: SuperTTTGameState): string {
  const w: Wire = {
    b: s.boards.map((sb) => sb.map((c) => c ?? '.').join('')).join(''),
    m: s.metaBoard.map((c) => (c === null ? '.' : c === 'drawn' ? 'D' : c)).join(''),
    a: s.activeBoard ?? -1,
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    w: s.metaWinLine,
    d: s.isDraw ? 1 : 0,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

const WIN_LINES: Array<[number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
]
function subWinLine(b: SubBoard, mark: 'X' | 'O'): [number, number, number] | null {
  return WIN_LINES.find(([x, y, z]) => b[x] === mark && b[y] === mark && b[z] === mark) ?? null
}

function decode(json: string): SuperTTTGameState {
  const w = JSON.parse(json) as Wire
  const boards: SubBoard[] = []
  for (let b = 0; b < 9; b++) {
    const cells = w.b.slice(b * 9, b * 9 + 9).split('').map((ch) => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null))
    boards.push(cells as SubBoard)
  }
  const metaBoard = w.m.split('').map((ch) => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : ch === 'D' ? 'drawn' : null)) as MetaBoard
  const idx = w.p === 1 ? 1 : 0
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    boards,
    metaBoard,
    activeBoard: w.a >= 0 ? w.a : null,
    currentMark: idx === 0 ? 'X' : 'O',
    metaWinLine: w.w,
    isDraw: w.d === 1,
    subBoardWinLines: boards.map((b, i) => (metaBoard[i] === 'X' || metaBoard[i] === 'O' ? subWinLine(b, metaBoard[i] as 'X' | 'O') : null))
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

function Board(props: { state: SuperTTTGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 50 : 34
  const gap = 6
  const legal = new Set(ctx.myTurn ? getValidMoves(state).map((m) => m.boardIndex * 9 + m.cellIndex) : [])
  const meta = state.metaBoard
  const metaWin = new Set(state.metaWinLine ?? [])
  const rows: ReactEcs.JSX.Element[] = []
  for (let by = 0; by < 3; by++) {
    const boardsRow: ReactEcs.JSX.Element[] = []
    for (let bx = 0; bx < 3; bx++) {
      const b = by * 3 + bx
      const won = meta[b]
      const forced = ctx.myTurn && state.status === 'playing' && (state.activeBoard === b || (state.activeBoard === null && won === null))
      const cells: ReactEcs.JSX.Element[] = []
      for (let cy = 0; cy < 3; cy++) {
        const cellRow: ReactEcs.JSX.Element[] = []
        for (let cx = 0; cx < 3; cx++) {
          const c = cy * 3 + cx
          const v = state.boards[b][c]
          const key = b * 9 + c
          const playable = legal.has(key)
          cellRow.push(
            <UiEntity
              key={`c${key}`}
              uiTransform={{ width: cell, height: cell, margin: 1, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
              uiBackground={{ color: playable ? Color4.create(1, 1, 1, 0.22) : Color4.create(1, 1, 1, 0.06) }}
              onMouseDown={() => {
                if (playable) ctx.act({ board: b, cell: c } as SuperTTTAction)
              }}
            >
              {v !== null && <UiEntity uiTransform={{ width: cell - 10, height: cell - 10 }} uiBackground={{ texture: { src: v === 'X' ? IMG.x : IMG.o }, textureMode: 'stretch', color: v === 'X' ? STTT_COLORS[0] : STTT_COLORS[1] }} />}
            </UiEntity>
          )
        }
        cells.push(
          <UiEntity key={`r${b}${cy}`} uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto' }}>
            {cellRow}
          </UiEntity>
        )
      }
      boardsRow.push(
        <UiEntity
          key={`b${b}`}
          uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', margin: gap / 2, padding: 2, justifyContent: 'center', alignItems: 'center' }}
          uiBackground={{ color: won === 'X' ? Color4.create(0.96, 0.77, 0.1, 0.35) : won === 'O' ? Color4.create(0.89, 0.27, 0.24, 0.35) : won === 'drawn' ? Color4.create(1, 1, 1, 0.12) : forced ? Color4.create(1, 0.95, 0.5, 0.35) : Color4.create(0, 0, 0, 0.25) }}
        >
          {cells}
          {(won === 'X' || won === 'O') && (
            <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 2, left: 2 }, width: cell * 3 + 6, height: cell * 3 + 6, justifyContent: 'center', alignItems: 'center' }}>
              <UiEntity uiTransform={{ width: cell * 2.2, height: cell * 2.2 }} uiBackground={{ texture: { src: won === 'X' ? IMG.x : IMG.o }, textureMode: 'stretch', color: metaWin.has(b) ? UI.win : won === 'X' ? STTT_COLORS[0] : STTT_COLORS[1] }} />
            </UiEntity>
          )}
        </UiEntity>
      )
    }
    rows.push(
      <UiEntity key={`br${by}`} uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto' }}>
        {boardsRow}
      </UiEntity>
    )
  }
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 4 }} uiBackground={{ color: Color4.fromHexString('#3a3230ff') }}>
      {rows}
    </UiEntity>
  )
}

function Controls(props: { state: SuperTTTGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const g = L().g
  const mine = props.ctx.mySeat === 1 ? 'X' : props.ctx.mySeat === 2 ? 'O' : null
  const hint = s.status === 'finished' ? '' : props.ctx.myTurn ? (s.activeBoard === null ? g.anyBoard : g.tapEmpty) : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${mine ? g.youPlay(mine) : ''}${mine && hint ? '   ·   ' : ''}${hint}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const superTicTacToeGame: TableGame<SuperTTTGameState, SuperTTTAction> = {
  id: 'supertictactoe',
  label: 'Super Tic Tac Toe',
  seatNames: ['X', 'O'],
  seatSprites: [IMG.x, IMG.o],
  seatSpriteTints: STTT_COLORS,
  seatColors: STTT_COLORS,

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
    if (s.isDraw || !s.metaWinLine) return WIN_DRAW
    // the meta line belongs to the mark that just moved: the finish order names the winner
    return s.finishOrder[0] === 'A' ? 1 : s.finishOrder[0] === 'B' ? 2 : WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const board = Math.floor(Number(action?.board))
    const cell = Math.floor(Number(action?.cell))
    const move = getValidMoves(s).find((m) => m.boardIndex === board && m.cellIndex === cell)
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = selectBotMove(s, getValidMoves(s), difficulty)
    return m ? { board: m.boardIndex, cell: m.cellIndex } : null
  },
  createView3D: createSuperTTTView,
  Controls
}
