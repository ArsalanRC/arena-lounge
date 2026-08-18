/**
 * Dice Royale duel: two players alternate full turns of the solo Dice Royale
 * game (Yahtzee variant, IP-safe: roll up to three times, hold dice, score
 * one of 13 categories), each on their own score sheet; after both have
 * filled all 13 categories the higher grand total wins. Bridges
 * src/engine/diceroyale (solo engine, one state per side) to the TableGame
 * contract. Dice are chosen by the acting client and travel in the action.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  createInitialState,
  grandTotal,
  previewScore,
  rollDice,
  scoreCategory,
  toggleHold,
  type DiceFace,
  type DiceRoyaleCategory,
  type DiceRoyaleGameState,
  type DiceRoyaleScores
} from '../../engine/diceroyale'
import type { BotDifficulty } from '../../engine/types'
import { uiSprite, type SpriteName } from '../atlas'
import { UI } from '../config'
import { t as L } from '../i18n'
import { createDiceRoyaleView, type DuelView } from '../views/diceroyale3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

export type RoyaleAction = { roll: number[] } | { hold: number } | { score: DiceRoyaleCategory }

/** The duel: one solo sheet per side, `side` to move; the shared 3D view reads `view`. */
export interface DuelState {
  a: DiceRoyaleGameState
  b: DiceRoyaleGameState
  side: SeatNo
  view: DuelView
}

const IMG = { button: 'button' } as const
const CAT_KEYS = CATEGORIES

function sheet(d: DuelState, side: SeatNo): DiceRoyaleGameState {
  return side === 1 ? d.a : d.b
}
function withSheet(d: DuelState, side: SeatNo, s: DiceRoyaleGameState): DuelState {
  const next: DuelState = { ...d, a: side === 1 ? s : d.a, b: side === 2 ? s : d.b }
  return refresh(next)
}
function bothDone(d: DuelState): boolean {
  return d.a.status === 'finished' && d.b.status === 'finished'
}
/** Recompute the shared view snapshot after any change. */
function refresh(d: DuelState): DuelState {
  const cur = sheet(d, d.side)
  return {
    ...d,
    view: {
      dice: cur.dice,
      held: cur.held,
      rolled: cur.hasRolledThisTurn,
      totalA: grandTotal(d.a),
      totalB: grandTotal(d.b),
      turnA: Math.min(d.a.turn, 13),
      turnB: Math.min(d.b.turn, 13),
      rollsLeft: cur.rollsLeft,
      side: d.side,
      finished: bothDone(d)
    }
  }
}

function d6(): number {
  return 1 + Math.floor(Math.random() * 6)
}
function newSheet(id: string): DiceRoyaleGameState {
  return createInitialState([{ id, color: id === 'A' ? 'red' : 'blue', playerOrder: id === 'A' ? 0 : 1 }])
}

interface WireSheet {
  d: number[]
  h: number[]
  r: number
  t: number
  s: number[] // 13 scores, -1 = open
  rb: number
  hr: 0 | 1
  f: 0 | 1
}
interface Wire {
  a: WireSheet
  b: WireSheet
  side: SeatNo
}
function encodeSheet(s: DiceRoyaleGameState): WireSheet {
  return { d: s.dice, h: s.held.map((x) => (x ? 1 : 0)), r: s.rollsLeft, t: s.turn, s: CAT_KEYS.map((c) => s.scores[c] ?? -1), rb: s.royaleBonusCount, hr: s.hasRolledThisTurn ? 1 : 0, f: s.status === 'finished' ? 1 : 0 }
}
function decodeSheet(w: WireSheet, id: string): DiceRoyaleGameState {
  const base = newSheet(id)
  const scores = { ...base.scores } as DiceRoyaleScores
  CAT_KEYS.forEach((c, i) => {
    scores[c] = w.s[i] >= 0 ? w.s[i] : null
  })
  return {
    ...base,
    status: w.f === 1 ? 'finished' : 'playing',
    dice: w.d as DiceFace[],
    held: w.h.map((x) => x === 1),
    rollsLeft: w.r,
    turn: w.t,
    scores,
    royaleBonusCount: w.rb,
    hasRolledThisTurn: w.hr === 1,
    turnNumber: w.t
  }
}
function encode(d: DuelState): string {
  const w: Wire = { a: encodeSheet(d.a), b: encodeSheet(d.b), side: d.side }
  return JSON.stringify(w)
}
function decode(json: string): DuelState {
  const w = JSON.parse(json) as Wire
  return refresh({ a: decodeSheet(w.a, 'A'), b: decodeSheet(w.b, 'B'), side: w.side === 2 ? 2 : 1, view: undefined as unknown as DuelView })
}

function isRoll(a: RoyaleAction): a is { roll: number[] } {
  return Array.isArray((a as { roll?: unknown }).roll)
}
function isHold(a: RoyaleAction): a is { hold: number } {
  return typeof (a as { hold?: unknown }).hold === 'number'
}

// ---------------------------------------------------------------- bot

/** Greedy sheet play: hold the most frequent face (hard also keeps straights), score the best open category. */
function botMove(s: DiceRoyaleGameState, difficulty: BotDifficulty): RoyaleAction {
  if (!s.hasRolledThisTurn) return { roll: [d6(), d6(), d6(), d6(), d6()] }
  const open = CAT_KEYS.filter((c) => s.scores[c] === null)
  const best = (): { c: DiceRoyaleCategory; v: number } => {
    let bc = open[0]
    let bv = -1
    for (const c of open) {
      let v = previewScore(s.dice, c)
      if (c === 'chance' && difficulty !== 'easy') v -= 8 // save chance for a bad roll
      if (v > bv) {
        bv = v
        bc = c
      }
    }
    return { c: bc, v: bv }
  }
  const b = best()
  if (s.rollsLeft === 0 || difficulty === 'easy' || b.v >= 25) return { score: b.c }
  // hold the mode face, then roll again
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const f of s.dice) counts[f]++
  let face = 1
  for (let f = 1; f <= 6; f++) if (counts[f] > counts[face] || (counts[f] === counts[face] && f > face)) face = f
  const wantHeld = s.dice.map((f) => f === face)
  const straight = difficulty === 'hard' && new Set(s.dice).size >= 4
  const target = straight ? s.dice.map((f, i) => s.dice.indexOf(f) === i) : wantHeld
  for (let i = 0; i < 5; i++) if (s.held[i] !== target[i]) return { hold: i }
  return { roll: s.dice.map((f, i) => (s.held[i] ? f : d6())) }
}

// ---------------------------------------------------------------- controls

function Controls(props: { state: DuelState; ctx: GameContext; phone: boolean }) {
  const d = props.state
  const ctx = props.ctx
  const g = L().g
  const mySide: SeatNo = ctx.mySeat === 2 ? 2 : 1
  const mine = sheet(d, mySide === 1 ? 1 : 2)
  const cur = sheet(d, d.side)
  const finished = bothDone(d)
  const canAct = ctx.myTurn && !finished
  const canRoll = canAct && cur.rollsLeft > 0
  const canHold = canAct && cur.hasRolledThisTurn && cur.rollsLeft > 0
  const canScore = canAct && cur.hasRolledThisTurn
  const dieSize = props.phone ? 60 : 44
  const status = finished
    ? d.view.totalA === d.view.totalB
      ? L().draw
      : g.royaleWinner(d.view.totalA > d.view.totalB ? g.red : g.blue, Math.max(d.view.totalA, d.view.totalB))
    : ctx.myTurn
      ? cur.hasRolledThisTurn
        ? g.holdOrScore(cur.rollsLeft)
        : g.tapRoll
      : ''
  const dice: ReactEcs.JSX.Element[] = []
  for (let i = 0; i < 5; i++) {
    const held = cur.held[i]
    dice.push(
      <UiEntity
        key={`d${i}`}
        uiTransform={{ width: dieSize, height: dieSize, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block', opacity: cur.hasRolledThisTurn ? 1 : 0.35 }}
        uiBackground={uiSprite(`die-${cur.dice[i]}` as SpriteName, held ? Color4.fromHexString('#ffd27aff') : Color4.White())}
        onMouseDown={() => {
          if (canHold) ctx.act({ hold: i } as RoyaleAction)
        }}
      />
    )
  }
  const cats: ReactEcs.JSX.Element[] = []
  const w = props.phone ? 156 : 150
  for (const c of CAT_KEYS) {
    const filled = mine.scores[c]
    const preview = canScore && cur === mine ? previewScore(cur.dice, c) : null
    const open = canScore && cur === mine && filled === null
    cats.push(
      <UiEntity
        key={c}
        uiTransform={{ width: w, height: 34, margin: 2, justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', padding: { left: 8, right: 8 }, pointerFilter: 'block' }}
        uiBackground={uiSprite(IMG.button, filled !== null ? UI.panelSoft : open ? UI.accent : Color4.create(0.2, 0.18, 0.17, 0.9))}
        onMouseDown={() => {
          if (open) ctx.act({ score: c } as RoyaleAction)
        }}
      >
        <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: CATEGORY_LABELS[c], fontSize: 14, color: filled !== null ? UI.muted : UI.text }} />
        <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: filled !== null ? `${filled}` : preview !== null ? `${preview}` : '', fontSize: 15, color: filled !== null ? UI.muted : UI.text }} />
      </UiEntity>
    )
  }
  const grid = (
    <UiEntity uiTransform={{ width: (w + 8) * 2, height: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>{cats}</UiEntity>
  )
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${g.totals(d.view.totalA, d.view.totalB)}${status ? '   ·   ' + status : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', width: 'auto', height: 'auto' }}>
        {dice}
        {canRoll && (
          <UiEntity
            uiTransform={{ width: 130, height: 52, margin: { left: 8 }, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
            uiBackground={uiSprite(IMG.button, UI.accent)}
            uiText={{ value: `${g.rollDice} (${cur.rollsLeft})`, fontSize: 17, color: UI.text, textAlign: 'middle-center' }}
            onMouseDown={() => ctx.act({ roll: cur.dice.map((f, i) => (cur.held[i] ? f : d6())) } as RoyaleAction)}
          />
        )}
      </UiEntity>
      {grid}
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const diceRoyaleGame: TableGame<DuelState, RoyaleAction> = {
  id: 'diceroyale',
  label: 'Dice Royale',
  seatNames: ['Red', 'Blue'],
  seatSprites: ['disc-red', 'disc-blue'],
  seatColors: [UI.red, Color4.fromHexString('#3a7bd5ff')],

  newGame(opening) {
    return refresh({ a: newSheet('A'), b: newSheet('B'), side: opening === 2 ? 2 : 1, view: undefined as unknown as DuelView })
  },
  encode,
  decode,
  turnSeat(d) {
    return bothDone(d) ? 0 : d.side
  },
  finished(d) {
    return bothDone(d)
  },
  winner(d) {
    if (!bothDone(d)) return WIN_NONE
    const a = grandTotal(d.a)
    const b = grandTotal(d.b)
    return a === b ? WIN_DRAW : a > b ? 1 : 2
  },
  apply(d, action, seat) {
    if (bothDone(d) || d.side !== seat || !action) return null
    const s = sheet(d, seat)
    if (s.status === 'finished') return null
    if (isRoll(action)) {
      if (s.rollsLeft <= 0) return null
      const vals = action.roll.map((v) => Math.floor(Number(v)))
      if (vals.length !== 5 || vals.some((v) => !(v >= 1 && v <= 6))) return null
      let i = 0
      const rolled = rollDice(s, () => (vals[i++ % 5] - 1) / 6 + 0.01)
      return withSheet(d, seat, rolled)
    }
    if (isHold(action)) {
      const next = toggleHold(s, Math.floor(action.hold))
      return next === s ? null : withSheet(d, seat, next)
    }
    const c = action.score
    if (!CAT_KEYS.includes(c) || s.scores[c] !== null || !s.hasRolledThisTurn) return null
    const scored = scoreCategory(s, c)
    // the turn passes to the other side unless they are already done
    const other: SeatNo = seat === 1 ? 2 : 1
    const otherSheet = sheet(d, other)
    const nextSide: SeatNo = otherSheet.status === 'finished' ? seat : other
    return withSheet({ ...d, side: nextSide }, seat, scored)
  },
  botAction(d, difficulty: BotDifficulty) {
    return botMove(sheet(d, d.side), difficulty)
  },
  createView3D(root, onAction, getState) {
    return createDiceRoyaleView(root, () => {
      const d = getState()
      if (!d) return
      const s = sheet(d, d.side)
      if (s.rollsLeft > 0) onAction({ roll: s.dice.map((f, i) => (s.held[i] ? f : d6())) })
    })
  },
  Controls
}
