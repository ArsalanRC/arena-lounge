/**
 * Snakes & Ladders table game: pure luck, red vs blue, roll and move, a six
 * rolls again (three sixes forfeit the turn), snakes slide you down, ladders
 * climb, exactly 100 wins (overshoot bounces back). Bridges
 * src/engine/snakesladders to the TableGame contract; the die is chosen by
 * the acting client and travels in the action.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { WIN_POSITION, applyMove, calculateMove, createInitialState, squareToCoords, type SnakeOrLadder, type SnakesLaddersGameState } from '../../engine/snakesladders'
import type { PlayerInfo } from '../../engine/types'
import { uiSprite } from '../atlas'
import { UI } from '../config'
import { t as L } from '../i18n'
import { SNAKES_COLORS, SNAKES_SPRITES, createSnakesView, type SnakesAction } from '../views/snakes3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const IMG = { button: 'button' } as const

interface Wire {
  r: number
  b: number
  p: number
  d: number | null
  hr: 0 | 1
  cb: number
  s: 'p' | 'f'
  fo: string[]
  l: [number, number, string] | null
  bust: 0 | 1
  n: number
}

function encode(s: SnakesLaddersGameState): string {
  const w: Wire = {
    r: s.positions.red,
    b: s.positions.blue,
    p: s.currentPlayerIndex,
    d: s.currentDiceValue,
    hr: s.hasRolled ? 1 : 0,
    cb: s.consecutiveBonuses,
    s: s.status === 'finished' ? 'f' : 'p',
    fo: s.finishOrder,
    l: s.lastSnakeOrLadder ? [s.lastSnakeOrLadder.from, s.lastSnakeOrLadder.to, s.lastSnakeOrLadder.type] : null,
    bust: s.isBust ? 1 : 0,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): SnakesLaddersGameState {
  const w = JSON.parse(json) as Wire
  const base = createInitialState(ENGINE_PLAYERS)
  const last: SnakeOrLadder | null = w.l ? { from: w.l[0], to: w.l[1], type: w.l[2] === 'snake' ? 'snake' : 'ladder' } : null
  return {
    ...base,
    status: w.s === 'f' ? 'finished' : 'playing',
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n,
    finishOrder: Array.isArray(w.fo) ? w.fo : [],
    positions: { red: w.r, blue: w.b, green: 0, yellow: 0 },
    currentDiceValue: w.d,
    hasRolled: w.hr === 1,
    consecutiveBonuses: w.cb,
    turnPhase: 'roll',
    lastSnakeOrLadder: last,
    isBust: w.bust === 1
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

function d6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

// ---------------------------------------------------------------- controls

function MiniBoard(props: { state: SnakesLaddersGameState; cell: number }) {
  const { state, cell } = props
  const size = cell * 10
  const items: ReactEcs.JSX.Element[] = []
  for (let i = 0; i < 2; i++) {
    const pos = state.positions[SNAKES_COLORS[i]]
    if (pos <= 0) continue
    const { row, col } = squareToCoords(pos)
    items.push(
      <UiEntity
        key={`p${i}`}
        uiTransform={{ positionType: 'absolute', position: { left: col * cell + (i === 0 ? 1 : cell * 0.35), top: row * cell + 1 + (i === 0 ? 0 : cell * 0.3) }, width: cell * 0.7, height: cell * 0.7 }}
        uiBackground={uiSprite(SNAKES_SPRITES[i])}
      />
    )
  }
  return (
    <UiEntity uiTransform={{ width: size, height: size }} uiBackground={{ texture: { src: 'images/snakes-board.png' }, textureMode: 'stretch' }}>
      {items}
    </UiEntity>
  )
}

function Controls(props: { state: SnakesLaddersGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const ctx = props.ctx
  const g = L().g
  const finished = s.status === 'finished'
  const cell = props.phone ? 30 : 24
  const me = ctx.mySeat === 2 ? 'blue' : 'red'
  const myPos = s.positions[me]
  const last = s.lastSnakeOrLadder
  const event = last ? (last.type === 'snake' ? g.snakeDown(last.to) : g.ladderUp(last.to)) : ''
  const hint = finished ? g.reached100(s.finishOrder[0] === 'A' ? g.red : g.blue) : ctx.myTurn ? g.tapRoll : ''
  const info = `${g.square(myPos)}${event ? '   ·   ' + event : ''}${hint ? '   ·   ' + hint : ''}`
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: info, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <UiEntity uiTransform={{ flexDirection: props.phone ? 'row' : 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
        <MiniBoard state={s} cell={cell} />
        {/* the slot keeps its size when the button hides: unmounting recentred the board */}
        <UiEntity uiTransform={{ width: 200, height: 56, margin: props.phone ? { left: 10 } : { top: 6 }, justifyContent: 'center', alignItems: 'center' }}>
          {ctx.myTurn && !finished && (
            <UiEntity
              uiTransform={{ width: 200, height: 56, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
              uiBackground={uiSprite(IMG.button, UI.accent)}
              uiText={{ value: g.rollDie, fontSize: 20, color: UI.onAccent, textAlign: 'middle-center' }}
              onMouseDown={() => ctx.act({ roll: d6() } as SnakesAction)}
            />
          )}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const snakesLaddersGame: TableGame<SnakesLaddersGameState, SnakesAction> = {
  id: 'snakesladders',
  label: 'Snakes & Ladders',
  seatNames: ['Red', 'Blue'],
  seatSprites: SNAKES_SPRITES,
  seatColors: [UI.red, Color4.fromHexString('#3a7bd5ff')],

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
    return s.finishOrder[0] === 'A' ? 1 : s.finishOrder[0] === 'B' ? 2 : WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const v = Math.floor(Number(action?.roll))
    if (!(v >= 1 && v <= 6)) return null
    try {
      return applyMove(s, calculateMove(s, v))
    } catch {
      return null
    }
  },
  botAction() {
    return { roll: d6() }
  },
  createView3D(root, onAction) {
    return createSnakesView(root, () => onAction({ roll: d6() }))
  },
  Controls
}

export const SNAKES_WIN = WIN_POSITION
