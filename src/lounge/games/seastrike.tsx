/**
 * Sea Strike (Battleship variant) table game. Fleets are placed at random for
 * both players when the round is dealt, so a phone player fires straight
 * away; players take turns firing at a 10x10 grid, sink all five ships to
 * win. Bridges src/engine/seastrike to the TableGame contract.
 *
 * Hidden information: both fleets travel inside the synced state (a
 * technically savvy peer could read them), but the lounge never shows unshot
 * enemy ships. Casual honesty, no server.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  FLEET,
  TOTAL_CELLS,
  applyMove,
  autoPlaceShips,
  createBotMemory,
  createInitialState,
  getValidMoves,
  placeShip,
  selectBotMove,
  updateBotMemory,
  type CellState,
  type Orientation,
  type PlayerBoard,
  type SeaStrikeGameState
} from '../../engine/seastrike'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { SEA_COLORS, createSeaStrikeView, type SeaAction } from '../views/seastrike3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const N = 10
const IMG = { yellow: 'images/ui/disc-red.png', blue: 'images/ui/disc-blue.png', ring: 'images/ui/ring.png', dot: 'images/ui/disc.png' }
const WATER = Color4.fromHexString('#1f4e7fff')
const WATER_MINE = Color4.fromHexString('#2b5f8fff')
const SHIP = Color4.fromHexString('#8fa3b8ff')
const HIT = Color4.fromHexString('#ff5a4dff')
const MISS = Color4.fromHexString('#cfe3ffff')
const SUNK = Color4.fromHexString('#7a1f18ff')

interface WireBoard {
  g: string // 100 chars: . ship=s hit=h miss=m sunk=k
  s: string[] // per FLEET ship: "<startCell><h|v>"
}
interface Wire {
  b: [WireBoard, WireBoard]
  p: number
  s: 'p' | 'f'
  fo: string[]
  l: [number, string, string] | null
  n: number
}

const CELL_CH: Record<CellState, string> = { empty: '.', ship: 's', hit: 'h', miss: 'm', sunk: 'k' }
const CH_CELL: Record<string, CellState> = { '.': 'empty', s: 'ship', h: 'hit', m: 'miss', k: 'sunk' }

function encodeBoard(b: PlayerBoard): WireBoard {
  return {
    g: b.grid.map((c) => CELL_CH[c]).join(''),
    s: FLEET.map((def) => {
      const ship = b.ships.find((x) => x.id === def.id)
      const start = ship && ship.cells.length ? Math.min(...ship.cells) : 0
      return `${start}${ship?.orientation === 'vertical' ? 'v' : 'h'}`
    })
  }
}

function decodeBoard(w: WireBoard): PlayerBoard {
  let board: PlayerBoard = { grid: new Array(TOTAL_CELLS).fill('empty'), ships: FLEET.map((d) => ({ ...d, cells: [], orientation: 'horizontal' as Orientation, hits: [], isSunk: false })), allShipsPlaced: false }
  FLEET.forEach((def, i) => {
    const tok = w.s[i] ?? '0h'
    const start = parseInt(tok, 10)
    const orientation: Orientation = tok.endsWith('v') ? 'vertical' : 'horizontal'
    board = placeShip(board, { shipId: def.id, startCell: start, orientation })
  })
  const grid = w.g.split('').map((ch) => CH_CELL[ch] ?? 'empty') as CellState[]
  while (grid.length < TOTAL_CELLS) grid.push('empty')
  const ships = board.ships.map((ship) => {
    const hits = ship.cells.filter((c) => grid[c] === 'hit' || grid[c] === 'sunk')
    return { ...ship, hits, isSunk: hits.length === ship.size }
  })
  return { grid, ships, allShipsPlaced: true }
}

function encode(s: SeaStrikeGameState): string {
  const w: Wire = {
    b: [encodeBoard(s.boards[0]), encodeBoard(s.boards[1])],
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    fo: s.finishOrder,
    l: s.lastShotResult ? [s.lastShotResult.cell, s.lastShotResult.result, s.lastShotResult.shipId ?? ''] : null,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): SeaStrikeGameState {
  const w = JSON.parse(json) as Wire
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n,
    finishOrder: Array.isArray(w.fo) ? w.fo : [],
    phase: 'attacking',
    boards: [decodeBoard(w.b[0]), decodeBoard(w.b[1])],
    lastShotResult: w.l ? { cell: w.l[0], result: w.l[1] as 'hit' | 'miss' | 'sunk', shipId: w.l[2] || undefined } : null
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

function Grid(props: { board: PlayerBoard; cell: number; mine: boolean; myTurn: boolean; onFire?: (cell: number) => void; lastCell: number }) {
  const { board, cell, mine } = props
  const rows: ReactEcs.JSX.Element[] = []
  for (let r = 0; r < N; r++) {
    const cells: ReactEcs.JSX.Element[] = []
    for (let c = 0; c < N; c++) {
      const i = r * N + c
      const st = board.grid[i]
      const showShip = mine && st === 'ship'
      const open = !mine && props.myTurn && (st === 'empty' || st === 'ship')
      const bg = st === 'sunk' ? SUNK : showShip ? SHIP : mine ? WATER_MINE : WATER
      cells.push(
        <UiEntity
          key={`c${i}`}
          uiTransform={{ width: cell, height: cell, margin: 1, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ color: i === props.lastCell ? Color4.create(bg.r * 0.6 + 0.4, bg.g * 0.6 + 0.4, bg.b * 0.6 + 0.2, 1) : bg }}
          onMouseDown={() => {
            if (open && props.onFire) props.onFire(i)
          }}
        >
          {st === 'hit' && <UiEntity uiTransform={{ width: cell * 0.8, height: cell * 0.8 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: HIT }} />}
          {st === 'miss' && <UiEntity uiTransform={{ width: cell * 0.35, height: cell * 0.35 }} uiBackground={{ texture: { src: IMG.dot }, textureMode: 'stretch', color: MISS }} />}
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
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 3 }} uiBackground={{ color: Color4.fromHexString('#12304fff') }}>
      {rows}
    </UiEntity>
  )
}

function Controls(props: { state: SeaStrikeGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const ctx = props.ctx
  const g = L().g
  const me = ctx.mySeat === 2 ? 1 : 0
  const enemy = me === 0 ? 1 : 0
  const finished = s.status === 'finished'
  const big = props.phone ? 36 : 26
  const small = props.phone ? 18 : 12
  const last = s.lastShotResult
  const lastLine = last ? (last.result === 'sunk' ? g.sunk : last.result === 'hit' ? g.hit : g.miss) : ''
  const hint = finished ? g.fleetSunk(s.finishOrder[0] === 'A' ? g.red : g.blue) : ctx.myTurn ? g.tapWater : ''
  const enemyShips = s.boards[enemy].ships.filter((x) => !x.isSunk).length
  const myShips = s.boards[me].ships.filter((x) => !x.isSunk).length
  const lastOnEnemy = last && s.currentPlayerIndex === enemy ? last.cell : -1 // last shot fired at the enemy was mine when it is now their turn
  const lastOnMe = last && s.currentPlayerIndex === me ? last.cell : -1
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${g.shipsLeft(myShips, enemyShips)}${lastLine ? '   ·   ' + lastLine : ''}${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'flex-end', width: 'auto', height: 'auto' }}>
        <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
          <UiEntity uiTransform={{ width: '100%', height: 20 }} uiText={{ value: g.enemyWaters, fontSize: 14, color: UI.muted, textAlign: 'middle-center' }} />
          <Grid board={s.boards[enemy]} cell={big} mine={false} myTurn={ctx.myTurn} onFire={(cell) => ctx.act({ fire: cell } as SeaAction)} lastCell={lastOnEnemy} />
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto', margin: { left: 10 } }}>
          <UiEntity uiTransform={{ width: '100%', height: 20 }} uiText={{ value: g.yourFleet, fontSize: 14, color: UI.muted, textAlign: 'middle-center' }} />
          <Grid board={s.boards[me]} cell={small} mine myTurn={false} lastCell={lastOnMe} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const seaStrikeGame: TableGame<SeaStrikeGameState, SeaAction> = {
  id: 'seastrike',
  label: 'Sea Strike',
  seatNames: ['Red', 'Blue'],
  seatSprites: [IMG.yellow, IMG.blue],
  seatColors: SEA_COLORS,

  newGame(opening) {
    const base = createInitialState(ENGINE_PLAYERS)
    // random fleets for both, straight into the attack phase (phones should not place five ships)
    const boards: [PlayerBoard, PlayerBoard] = [autoPlaceShips(base.boards[0]), autoPlaceShips(base.boards[1])]
    return { ...base, boards, phase: 'attacking', currentPlayerIndex: opening === 2 ? 1 : 0 }
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
    return s.finishOrder[0] === 'A' ? 1 : s.finishOrder[0] === 'B' ? 2 : WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const cell = Math.floor(Number(action?.fire))
    const move = getValidMoves(s).find((m) => m.targetCell === cell)
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const memory = updateBotMemory(createBotMemory(), s, s.currentPlayerIndex)
    const m = selectBotMove(s, getValidMoves(s), difficulty, memory)
    return m ? { fire: m.targetCell } : null
  },
  createView3D(root, onAction, getState) {
    return createSeaStrikeView(root, (grid, cell) => {
      // grid 0 belongs to red (player 0), grid 1 to blue; only the side to move may fire on its own grid
      const s = getState()
      if (s && s.currentPlayerIndex === grid) onAction({ fire: cell })
    })
  },
  Controls
}
