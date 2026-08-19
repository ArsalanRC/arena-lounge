/**
 * Ludo table game for two to four players at a square four-seat table (side
 * 1 red, 2 green in the opposite yard, 3 blue, 4 yellow; the first seated
 * player picks how many play). Bridges the pure engine (src/engine/ludo,
 * single-die rules: a six leaves the yard and rolls again, three sixes forfeit
 * the turn, captures and reaching home roll again, safe cells) to the
 * TableGame contract. The round ends when the first player brings all four
 * pieces home. A turn is roll, then move; the die is chosen by the acting
 * client and travels in the action (casual honesty, no server); a roll with
 * no legal move is skipped by the `pending` hook after a moment. Touch UI: a
 * mini board for the picture and one big button per legal move (pieces on a
 * phone are too small to tap).
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import type { Entity } from '@dcl/sdk/ecs'
import {
  HOME_POSITION,
  YARD_POSITION,
  applyMove,
  createInitialState,
  getValidMoves,
  handleNoValidMoves,
  positionToXY,
  rollDice,
  selectBotMove,
  type LudoGameState,
  type PiecePositions,
  type ValidMove
} from '../../engine/ludo'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { uiSprite } from '../atlas'
import { UI } from '../config'
import { seatLabel, t as L } from '../i18n'
import { LUDO_COLORS, LUDO_SPRITES, createLudoView, type LudoAction } from '../views/ludo3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const SEAT_NAMES = ['Red', 'Green', 'Blue', 'Yellow']
/** Engine players for a round of `n` sides: id = side number, colour by lounge side order, turn order = side order. */
function enginePlayers(n: number): PlayerInfo[] {
  const count = Math.max(2, Math.min(4, n))
  return LUDO_COLORS.slice(0, count).map((color, i) => ({ id: `${i + 1}`, color, playerOrder: i }))
}
const IMG = { button: 'button', ring: 'ring' } as const
const N = 15
const YARD: PiecePositions = [YARD_POSITION, YARD_POSITION, YARD_POSITION, YARD_POSITION]

interface Wire {
  /** Pieces per colour (red, green, blue, yellow); absent colours stay in the yard. */
  r: PiecePositions
  g: PiecePositions
  b?: PiecePositions
  y?: PiecePositions
  /** Number of sides in the round (2..4). */
  k?: number
  p: number
  d: number | null
  hr: 0 | 1
  cs: number
  fo: string[]
  s: 'p' | 'f'
  n: number
}

function encode(s: LudoGameState): string {
  const w: Wire = {
    r: s.board.pieces.red,
    g: s.board.pieces.green,
    b: s.board.pieces.blue,
    y: s.board.pieces.yellow,
    k: s.players.length,
    p: s.currentPlayerIndex,
    d: s.currentDiceValue,
    hr: s.hasRolled ? 1 : 0,
    cs: s.consecutiveSixes,
    fo: s.finishOrder,
    s: s.status === 'finished' ? 'f' : 'p',
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): LudoGameState {
  const w = JSON.parse(json) as Wire
  const players = enginePlayers(w.k ?? 2)
  const idx = Math.max(0, Math.min(players.length - 1, Math.floor(w.p)))
  const base: LudoGameState = {
    status: w.s === 'f' ? 'finished' : 'playing',
    players,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: Array.isArray(w.fo) ? w.fo : [],
    board: { pieces: { red: w.r, green: w.g, blue: w.b ?? YARD, yellow: w.y ?? YARD } },
    currentDiceValue: w.d,
    hasRolled: w.hr === 1,
    consecutiveSixes: w.cs,
    validMoves: [],
    turnPhase: 'roll',
    diceMode: 'single',
    doubleDice: null
  }
  if (base.hasRolled && base.currentDiceValue !== null && base.status === 'playing') {
    const color = players[idx].color
    base.validMoves = getValidMoves(base, color, base.currentDiceValue)
    base.turnPhase = base.validMoves.length > 0 ? 'move' : 'roll'
  }
  return base
}

function seatOfIndex(i: number): SeatNo {
  return Math.max(1, Math.min(4, i + 1)) as SeatNo
}

/** The round is over as soon as somebody has all four pieces home. */
function roundOver(s: LudoGameState): boolean {
  return s.status === 'finished' || s.finishOrder.length > 0
}

function d6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

function isRoll(a: LudoAction): a is { roll: number } {
  return typeof (a as { roll?: unknown }).roll === 'number'
}
function isSkip(a: LudoAction): a is { skip: true } {
  return (a as { skip?: unknown }).skip === true
}

/** 3D tap: roll when it is time to roll, else move the nearest own piece that has a legal move. */
export function tapLudoCell(root: Entity, state: LudoGameState, row: number, col: number, act: (a: LudoAction) => boolean | void): void {
  void root
  if (roundOver(state)) return
  if (!state.hasRolled) {
    act({ roll: d6() })
    return
  }
  const color = state.players[state.currentPlayerIndex].color
  let best: ValidMove | null = null
  let bestD = 2.5
  for (const m of state.validMoves) {
    const pos = state.board.pieces[color][m.pieceIndex]
    const { row: r, col: c } = positionToXY(pos, color, m.pieceIndex)
    const d = Math.hypot(r - row, c - col)
    if (d < bestD) {
      bestD = d
      best = m
    }
  }
  if (best) act({ piece: best.pieceIndex })
}

// ---------------------------------------------------------------- controls

/** Move-button tints per side (red, green, blue, yellow), dark enough for cream text. */
const MOVE_TINTS = [Color4.fromHexString('#a33a33ff'), Color4.fromHexString('#2f7d46ff'), Color4.fromHexString('#2f5f9dff'), Color4.fromHexString('#9a7a12ff')]

function MiniBoard(props: { state: LudoGameState; cell: number }) {
  const { state, cell } = props
  const size = cell * N
  const items: ReactEcs.JSX.Element[] = []
  const movable = new Set(state.turnPhase === 'move' ? state.validMoves.map((m) => `${m.color}:${m.pieceIndex}`) : [])
  for (let ci = 0; ci < state.players.length; ci++) {
    const color = LUDO_COLORS[ci]
    const positions = state.board.pieces[color]
    for (let pi = 0; pi < 4; pi++) {
      const { row, col } = positionToXY(positions[pi], color, pi)
      const sharing = positions.filter((p, j) => p === positions[pi] && j < pi && positions[pi] >= 0).length
      const glow = movable.has(`${color}:${pi}`)
      items.push(
        <UiEntity
          key={`p${ci}${pi}`}
          uiTransform={{ positionType: 'absolute', position: { left: col * cell + 1 + sharing * 3, top: row * cell + 1 - sharing * 3 }, width: cell - 2, height: cell - 2, justifyContent: 'center', alignItems: 'center' }}
          uiBackground={uiSprite(LUDO_SPRITES[ci])}
        >
          {glow && <UiEntity uiTransform={{ width: cell - 2, height: cell - 2 }} uiBackground={uiSprite(IMG.ring, UI.win)} />}
        </UiEntity>
      )
    }
  }
  return (
    <UiEntity uiTransform={{ width: size, height: size }} uiBackground={{ texture: { src: 'images/ludo-board.png' }, textureMode: 'stretch' }}>
      {items}
    </UiEntity>
  )
}

function moveLabel(m: ValidMove): string {
  const g = L().g
  const n = m.pieceIndex + 1
  if (m.isExitYard) return g.pieceOut(n)
  if (m.to === HOME_POSITION) return g.pieceHome(n)
  if (m.isCapture) return g.pieceCapture(n)
  return g.piecePlus(n, m.to - m.from)
}

function Controls(props: { state: LudoGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const ctx = props.ctx
  const finished = roundOver(s)
  const cell = props.phone ? 26 : 22
  const canRoll = ctx.myTurn && !s.hasRolled && !finished
  const canMove = ctx.myTurn && s.turnPhase === 'move' && !finished
  const g = L().g
  const die = s.hasRolled && s.currentDiceValue ? g.rolled(s.currentDiceValue) : ''
  const hint = finished
    ? g.broughtHome(seatLabel(SEAT_NAMES[Math.max(0, Number(s.finishOrder[0]) - 1)] ?? SEAT_NAMES[0]))
    : ctx.myTurn
      ? canRoll
        ? g.tapRoll
        : canMove
          ? g.pickPiece
          : g.noMove
      : ''
  const buttons: ReactEcs.JSX.Element[] = []
  if (canRoll) {
    buttons.push(
      <UiEntity
        key="roll"
        uiTransform={{ width: 200, height: 56, margin: 4, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
        uiBackground={uiSprite(IMG.button, UI.accent)}
        uiText={{ value: g.rollDie, fontSize: 20, color: UI.onAccent, textAlign: 'middle-center' }}
        onMouseDown={() => ctx.act({ roll: d6() } as LudoAction)}
      />
    )
  }
  if (canMove) {
    const tint = MOVE_TINTS[Math.max(0, ctx.mySeat - 1)] ?? MOVE_TINTS[0]
    for (const m of s.validMoves) {
      buttons.push(
        <UiEntity
          key={`m${m.pieceIndex}`}
          uiTransform={{ width: props.phone ? 200 : 176, height: 52, margin: 4, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={uiSprite(IMG.button, tint)}
          uiText={{ value: moveLabel(m), fontSize: 18, color: UI.onAccent, textAlign: 'middle-center' }}
          onMouseDown={() => ctx.act({ piece: m.pieceIndex } as LudoAction)}
        />
      )
    }
  }
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${die}${die && hint ? '   ·   ' : ''}${hint}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <UiEntity uiTransform={{ flexDirection: props.phone ? 'row' : 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
        <MiniBoard state={s} cell={cell} />
        {buttons.length > 0 && (
          <UiEntity uiTransform={{ flexDirection: props.phone ? 'column' : 'row', flexWrap: props.phone ? 'nowrap' : 'wrap', justifyContent: 'center', alignItems: 'center', width: props.phone ? 216 : '100%', height: 'auto', margin: props.phone ? { left: 8 } : { top: 6 } }}>
            {buttons}
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const ludoGame: TableGame<LudoGameState, LudoAction> = {
  id: 'ludo',
  label: 'Ludo',
  seatNames: SEAT_NAMES,
  seatSprites: LUDO_SPRITES,
  seatColors: [UI.red, Color4.fromHexString('#3fa35aff'), Color4.fromHexString('#3a7bd5ff'), Color4.fromHexString('#f5c518ff')],
  seats: 4,

  newGame(opening, players) {
    const s = createInitialState(enginePlayers(players))
    const idx = Math.max(0, Math.min(s.players.length - 1, opening - 1))
    return idx > 0 ? { ...s, currentPlayerIndex: idx } : s
  },
  encode,
  decode,
  turnSeat(s) {
    return roundOver(s) ? 0 : seatOfIndex(s.currentPlayerIndex)
  },
  finished(s) {
    return roundOver(s)
  },
  winner(s) {
    if (!roundOver(s)) return WIN_NONE
    const first = Number(s.finishOrder[0])
    return first >= 1 && first <= 4 ? (first as SeatNo) : WIN_DRAW
  },
  apply(s, action, seat) {
    if (roundOver(s)) return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    if (!action) return null
    if (isRoll(action)) {
      if (s.hasRolled) return null
      const v = Math.floor(action.roll)
      if (!(v >= 1 && v <= 6)) return null
      return rollDice(s, v)
    }
    if (isSkip(action)) {
      if (!s.hasRolled || s.validMoves.length > 0) return null
      return handleNoValidMoves(s)
    }
    if (!s.hasRolled) return null
    const move = s.validMoves.find((m) => m.pieceIndex === Math.floor(Number(action.piece)))
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  pending(s) {
    if (!roundOver(s) && s.hasRolled && s.validMoves.length === 0) return { delayMs: 1500, action: { skip: true } }
    return null
  },
  botAction(s, difficulty: BotDifficulty) {
    if (!s.hasRolled) return { roll: d6() }
    if (s.validMoves.length === 0) return null // the pending hook skips
    const m = selectBotMove(s, s.validMoves, difficulty)
    return m ? { piece: m.pieceIndex } : null
  },
  createView3D(root, onAction, getState) {
    return createLudoView(root, (row, col) => {
      const s = getState()
      if (s) tapLudoCell(root, s, row, col, onAction)
    })
  },
  Controls
}
