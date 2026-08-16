/**
 * Match Pairs table game (memory, 4x4, two players). Bridges the pure engine
 * (src/engine/matchpairs) to the TableGame contract.
 *
 * Symbols are shape + colour (circle, square, ring, cross in two tints), so
 * nothing depends on glyph coverage. A mismatch stays revealed for 1.2 s and
 * is then flipped back through the table layer's pending-action hook.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  SYMBOL_POOL,
  createBotMemory,
  createInitialState,
  flip,
  resolveMismatch,
  selectFirstFlip,
  selectSecondFlip,
  updateBotMemory,
  type BotMemory,
  type MatchPairsCard,
  type MatchPairsGameState
} from '../../engine/matchpairs'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { COLS, OWNER_TINTS, ROWS, createMatchPairsView, symbolIndex, symbolSprite, symbolTint, type PairsAction } from '../views/matchpairs3d'
import { botSettings } from './botSettings'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const REVEAL_MS = 1200
const IMG = { ring: 'images/ui/ring.png', chipA: 'images/ui/disc-yellow.png', chipB: 'images/ui/disc-red.png' }

interface Wire {
  /** one char per card: symbol index 0-7 */
  y: string
  /** one char per card: '.' down, 'u' up, 'A' / 'B' matched by */
  f: string
  fi: number[]
  sc: [number, number]
  p: number
  s: 'p' | 'f'
  tf: number
  n: number
}

function encode(s: MatchPairsGameState): string {
  const w: Wire = {
    y: s.cards.map((c) => String(symbolIndex(c.symbol))).join(''),
    f: s.cards.map((c) => (c.matched ? (c.matchedBy === 'B' ? 'B' : 'A') : c.flipped ? 'u' : '.')).join(''),
    fi: s.flippedIndices,
    sc: [s.scores.A ?? 0, s.scores.B ?? 0],
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    tf: s.turnFlips,
    n: s.moveCount
  }
  return JSON.stringify(w)
}

function decode(json: string): MatchPairsGameState {
  const w = JSON.parse(json) as Wire
  const cards: MatchPairsCard[] = []
  for (let i = 0; i < w.y.length; i++) {
    const flag = w.f[i]
    cards.push({
      id: i,
      symbol: SYMBOL_POOL[Number(w.y[i])] ?? SYMBOL_POOL[0],
      flipped: flag === 'u' || flag === 'A' || flag === 'B',
      matched: flag === 'A' || flag === 'B',
      matchedBy: flag === 'A' ? 'A' : flag === 'B' ? 'B' : null
    })
  }
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n + 1,
    finishOrder: [],
    cards,
    rows: ROWS,
    cols: COLS,
    flippedIndices: w.fi,
    scores: { A: w.sc[0], B: w.sc[1] },
    difficulty: 'easy',
    turnFlips: w.tf,
    elapsedMs: 0,
    moveCount: w.n
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

/**
 * Bot memory, kept by the client that drives the bot. A client drives at most
 * one bot table (it sits at one table), so a single memory is enough; it is
 * fed by every flip this client applies and reset when it deals a new round.
 */
let memory: BotMemory = createBotMemory()

// ---------------------------------------------------------------- controls

function Board(props: { state: MatchPairsGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 74 : 68
  const rows = []
  for (let r = 0; r < ROWS; r++) {
    const cells = []
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const card = state.cards[i]
      const up = card.flipped || card.matched
      const sym = symbolIndex(card.symbol)
      const body = card.matched ? (card.matchedBy === 'B' ? OWNER_TINTS[1] : OWNER_TINTS[0]) : up ? UI.text : Color4.fromHexString('#2f4858ff')
      cells.push(
        <UiEntity
          key={`c${i}`}
          uiTransform={{ width: cell, height: cell, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ color: body }}
          onMouseDown={() => {
            if (ctx.myTurn && !up && state.flippedIndices.length < 2) ctx.act({ flip: i } as PairsAction)
          }}
        >
          {up && <UiEntity uiTransform={{ width: cell * 0.6, height: cell * 0.6 }} uiBackground={{ texture: { src: symbolSprite(sym) }, textureMode: 'stretch', color: symbolTint(sym) }} />}
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

function Controls(props: { state: MatchPairsGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const g = L().g
  const hint = props.ctx.myTurn ? (s.flippedIndices.length === 2 ? g.noMatch : s.flippedIndices.length === 1 ? g.findTwin : g.flipCard) : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${g.pairs}  ${s.scores.A ?? 0} : ${s.scores.B ?? 0}${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const matchPairsGame: TableGame<MatchPairsGameState, PairsAction> = {
  id: 'matchpairs',
  label: 'Match Pairs',
  seatNames: ['Yellow', 'Red'],
  seatSprites: [IMG.chipA, IMG.chipB],
  seatColors: [UI.yellow, UI.red],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS, 'easy')
    memory = createBotMemory()
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
    const a = s.scores.A ?? 0
    const b = s.scores.B ?? 0
    return a === b ? WIN_DRAW : a > b ? 1 : 2
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    try {
      if (action?.resolve) {
        if (s.flippedIndices.length !== 2) return null
        return resolveMismatch(s)
      }
      const i = Math.floor(Number(action?.flip))
      if (!(i >= 0 && i < s.cards.length)) return null
      if (s.flippedIndices.length >= 2) return null
      const next = flip(s, i)
      // every reveal feeds the bot memory (only the driving client applies actions)
      updateBotMemory(memory, next.cards, botSettings.difficulty)
      return next
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    updateBotMemory(memory, s.cards, difficulty)
    if (s.flippedIndices.length === 0) {
      const i = selectFirstFlip(memory, s.cards, s.flippedIndices)
      return i === null ? null : { flip: i }
    }
    if (s.flippedIndices.length === 1) {
      const first = s.flippedIndices[0]
      const i = selectSecondFlip(memory, s.cards, s.cards[first].symbol, first)
      return i === null ? null : { flip: i }
    }
    return null
  },
  pending(s) {
    if (s.status !== 'playing' || s.flippedIndices.length !== 2) return null
    return { delayMs: REVEAL_MS, action: { resolve: true } }
  },
  createView3D: createMatchPairsView,
  Controls
}
