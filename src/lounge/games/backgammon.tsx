/**
 * Backgammon table game. Bridges the pure engine (src/engine/backgammon,
 * standard rules: bar entry, hitting, bearing off with the higher-roll rule,
 * doubles = four pips) to the TableGame contract. A turn is roll, then one
 * action per pip; the engine ends the turn when the pips are used up or
 * nothing can be played, and the `pending` hook passes a turn that has no
 * legal move right after the roll. Dice are chosen by the acting client's
 * Math.random and travel inside the action (casual honesty, no server).
 * Seat A is white and moves first.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import type { Entity } from '@dcl/sdk/ecs'
import {
  applyMove,
  createInitialState,
  endTurn,
  getLegalMoves,
  hasLegalMove,
  rollForTurn,
  selectBotMove,
  type BackgammonColor,
  type BackgammonGameState,
  type BackgammonMove,
  type BackgammonPoint
} from '../../engine/backgammon'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { uiSprite } from '../atlas'
import { UI } from '../config'
import { t as L } from '../i18n'
import { BG_SPRITES, bgSelection, createBackgammonView, pointColumn, setBgSelection, type BgAction, type BgTarget } from '../views/backgammon3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const IMG = { button: 'button', ring: 'ring' } as const
const FELT = Color4.fromHexString('#5a3e2bff')
const PT_LIGHT = Color4.fromHexString('#e8d9bdff')
const PT_DARK = Color4.fromHexString('#8f2f2aff')

interface Wire {
  pt: string // 24 tokens "w5" / "b2" / "0" joined by ','
  bw: number
  bb: number
  ow: number
  ob: number
  p: number
  s: 'p' | 'f'
  gr: BackgammonGameState['gameResult']
  d: [number, number] | null
  rp: number[]
  l: [number | 'bar', number | 'off', number, 0 | 1] | null
  mc: number
  n: number
}

function encode(s: BackgammonGameState): string {
  const w: Wire = {
    pt: s.points.map((pt) => (pt.owner ? `${pt.owner === 'white' ? 'w' : 'b'}${pt.count}` : '0')).join(','),
    bw: s.bar.white,
    bb: s.bar.black,
    ow: s.off.white,
    ob: s.off.black,
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    gr: s.gameResult,
    d: s.dice,
    rp: s.remainingPips,
    l: s.lastMove ? [s.lastMove.from, s.lastMove.to, s.lastMove.pips, s.lastMove.hit ? 1 : 0] : null,
    mc: s.moveCounter,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): BackgammonGameState {
  const w = JSON.parse(json) as Wire
  const points: BackgammonPoint[] = w.pt.split(',').map((tok) => (tok === '0' ? { count: 0, owner: null } : { count: Number(tok.slice(1)), owner: tok[0] === 'w' ? 'white' : 'black' }))
  while (points.length < 24) points.push({ count: 0, owner: null })
  const idx = w.p === 1 ? 1 : 0
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    points,
    bar: { white: w.bw, black: w.bb },
    off: { white: w.ow, black: w.ob },
    turnColor: idx === 0 ? 'white' : 'black',
    dice: w.d,
    remainingPips: Array.isArray(w.rp) ? w.rp : [],
    gameResult: w.gr,
    lastMove: w.l ? { from: w.l[0], to: w.l[1], pips: w.l[2], hit: w.l[3] === 1, playerId: '', color: 'red', timestamp: 0 } : null,
    moveCounter: w.mc
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

function d6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

/** Handle a tap on a point / the bar / the off tray: pick a source, then a destination; a tap before rolling rolls. */
export function tapBg(root: Entity, state: BackgammonGameState, target: BgTarget, act: (a: BgAction) => boolean | void): void {
  if (state.dice === null) {
    act({ roll: [d6(), d6()] })
    return
  }
  const legal = getLegalMoves(state)
  const sel = bgSelection.get(root)
  if (sel !== undefined && target !== 'bar') {
    const move = legal.find((m) => m.from === sel && m.to === target)
    if (move) {
      setBgSelection(root, null)
      act({ from: move.from, to: move.to, pips: move.pips })
      return
    }
  }
  if (target === 'off') return
  if (legal.some((m) => m.from === target)) setBgSelection(root, sel === target ? null : target)
  else setBgSelection(root, null)
}

// ---------------------------------------------------------------- controls

function Stack(props: { pt: BackgammonPoint; size: number; top: boolean; highlight: boolean }) {
  const { pt, size } = props
  const shown = Math.min(pt.count, 5)
  const discs: ReactEcs.JSX.Element[] = []
  for (let k = 0; k < shown; k++) {
    discs.push(
      <UiEntity key={`d${k}`} uiTransform={{ width: size - 4, height: size - 4, margin: 0 }} uiBackground={uiSprite(pt.owner === 'white' ? BG_SPRITES[0] : BG_SPRITES[1])}>
        {props.highlight && k === shown - 1 && <UiEntity uiTransform={{ width: size - 4, height: size - 4 }} uiBackground={uiSprite(IMG.ring, UI.accentTint)} />}
      </UiEntity>
    )
  }
  if (pt.count > 5) discs.push(<UiEntity key="n" uiTransform={{ width: size - 4, height: 18 }} uiText={{ value: `${pt.count}`, fontSize: 14, color: UI.light, textAlign: 'middle-center' }} />)
  return (
    <UiEntity uiTransform={{ width: size, height: '100%', flexDirection: props.top ? 'column' : 'column-reverse', alignItems: 'center' }}>{discs}</UiEntity>
  )
}

function Board(props: { state: BackgammonGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const col = props.phone ? 40 : 30
  const rowH = props.phone ? 150 : 112
  const barW = props.phone ? 34 : 26
  const mirror = ctx.behind // columns as seen from behind the upright board
  const rolled = state.dice !== null
  const legal = ctx.myTurn && rolled ? getLegalMoves(state) : []
  const sel = bgSelection.get(ctx.root)
  const sources = new Set(legal.map((m) => m.from))
  const targets = new Set(sel === undefined ? [] : legal.filter((m) => m.from === sel).map((m) => m.to))
  const tap = (t: BgTarget) => {
    if (ctx.myTurn) tapBg(ctx.root, state, t, (a) => ctx.act(a))
  }
  const point = (p: number, top: boolean) => {
    const pt = state.points[p]
    const isSel = sel === p
    const isTarget = targets.has(p)
    const c = pointColumn(p).col
    const bg = isSel ? UI.accent : isTarget ? UI.accentTint : (c % 2 === 0) !== top ? PT_LIGHT : PT_DARK
    return (
      <UiEntity
        key={`p${p}`}
        uiTransform={{ width: col, height: rowH, margin: { left: 1, right: 1 }, justifyContent: top ? 'flex-start' : 'flex-end', alignItems: 'center', pointerFilter: 'block' }}
        uiBackground={{ color: bg }}
        onMouseDown={() => tap(p)}
      >
        {pt.count > 0 && <Stack pt={pt} size={col} top={top} highlight={sources.has(p) && sel === undefined} />}
      </UiEntity>
    )
  }
  const topPoints: ReactEcs.JSX.Element[] = []
  const bottomPoints: ReactEcs.JSX.Element[] = []
  for (let c = 0; c < 12; c++) {
    const cc = mirror ? 11 - c : c
    topPoints.push(point(12 + cc, true))
    bottomPoints.push(point(11 - cc, false))
  }
  const me: BackgammonColor = ctx.mySeat === 2 ? 'black' : 'white'
  const barCount = state.bar[me]
  const bar = (
    <UiEntity
      uiTransform={{ width: barW, height: rowH * 2 + 8, margin: { left: 2, right: 2 }, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ color: sel === 'bar' ? UI.accent : Color4.fromHexString('#2b1e14ff') }}
      onMouseDown={() => tap('bar')}
    >
      {barCount > 0 && <UiEntity uiTransform={{ width: barW - 6, height: barW - 6 }} uiBackground={uiSprite(me === 'white' ? BG_SPRITES[0] : BG_SPRITES[1])} />}
      {barCount > 1 && <UiEntity uiTransform={{ width: barW, height: 18 }} uiText={{ value: `${barCount}`, fontSize: 14, color: UI.light, textAlign: 'middle-center' }} />}
    </UiEntity>
  )
  const off = (
    <UiEntity
      uiTransform={{ width: barW + 10, height: rowH * 2 + 8, margin: { left: 4 }, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ color: targets.has('off') ? UI.accentTint : Color4.fromHexString('#3a2a1eff') }}
      onMouseDown={() => tap('off')}
    >
      <UiEntity uiTransform={{ width: barW + 8, height: 40 }} uiText={{ value: `Off\n${state.off[me]}`, fontSize: 14, color: UI.light, textAlign: 'middle-center' }} />
    </UiEntity>
  )
  const half = (pts: ReactEcs.JSX.Element[], top: boolean) => (
    <UiEntity uiTransform={{ width: 'auto', height: rowH, flexDirection: 'row', alignItems: top ? 'flex-start' : 'flex-end' }}>
      {pts.slice(0, 6)}
      <UiEntity uiTransform={{ width: barW + 4, height: rowH }} />
      {pts.slice(6)}
    </UiEntity>
  )
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto', alignItems: 'center' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 4 }} uiBackground={{ color: FELT }}>
        {half(topPoints, true)}
        <UiEntity uiTransform={{ width: '100%', height: 8 }} />
        {half(bottomPoints, false)}
        {/* the bar sits over the gap between the halves */}
        <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 4, left: 4 + 6 * (col + 2) }, width: barW + 4, height: rowH * 2 + 8, justifyContent: 'center', alignItems: 'center' }}>{bar}</UiEntity>
      </UiEntity>
      {off}
    </UiEntity>
  )
}

function Controls(props: { state: BackgammonGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const rolled = s.dice !== null
  const finished = s.status === 'finished'
  const sel = bgSelection.get(props.ctx.root)
  const g = L().g
  const hint = finished
    ? g.bearsOff(s.gameResult === 'white_wins' ? g.white : g.black)
    : props.ctx.myTurn
      ? !rolled
        ? g.tapRoll
        : sel !== undefined
          ? g.tapMarkedPoint
          : hasLegalMove(s)
            ? g.tapChecker
            : g.noMove
      : ''
  const diceText = s.dice ? g.dice(s.dice[0], s.dice[1], s.remainingPips.join(' ') || '–') : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${diceText}${diceText && hint ? '   ·   ' : ''}${hint}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} phone={props.phone} />
      {props.ctx.myTurn && !rolled && !finished && (
        <UiEntity
          uiTransform={{ width: 220, height: 52, margin: { top: 6 }, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={uiSprite(IMG.button, UI.accent)}
          uiText={{ value: g.rollDice, fontSize: 20, color: UI.onAccent, textAlign: 'middle-center' }}
          onMouseDown={() => props.ctx.act({ roll: [d6(), d6()] } as BgAction)}
        />
      )}
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

function isRoll(a: BgAction): a is { roll: [number, number] } {
  return Array.isArray((a as { roll?: unknown }).roll)
}
function isPass(a: BgAction): a is { pass: true } {
  return (a as { pass?: unknown }).pass === true
}

export const backgammonGame: TableGame<BackgammonGameState, BgAction> = {
  id: 'backgammon',
  label: 'Backgammon',
  seatNames: ['White', 'Black'],
  seatSprites: BG_SPRITES,
  seatColors: [Color4.fromHexString('#f2e8d5ff'), Color4.fromHexString('#3a3230ff')],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
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
    return s.gameResult === 'white_wins' ? 1 : s.gameResult === 'black_wins' ? 2 : WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    if (!action) return null
    if (isRoll(action)) {
      if (s.dice !== null) return null
      const [a, b] = action.roll.map((v) => Math.floor(Number(v)))
      if (!(a >= 1 && a <= 6 && b >= 1 && b <= 6)) return null
      const vals = [(a - 1) / 6 + 0.01, (b - 1) / 6 + 0.01]
      let i = 0
      return rollForTurn(s, () => vals[i++ % 2])
    }
    if (isPass(action)) {
      if (s.dice === null || hasLegalMove(s)) return null
      return endTurn(s)
    }
    const move: BackgammonMove | undefined = getLegalMoves(s).find((m) => m.from === action.from && m.to === action.to && m.pips === action.pips)
    if (!move) return null
    const next = applyMove(s, move)
    return next === s ? null : next
  },
  pending(s) {
    // rolled but nothing to play: pass after a moment so everyone sees the dice
    if (s.status === 'playing' && s.dice !== null && !hasLegalMove(s)) return { delayMs: 1400, action: { pass: true } }
    return null
  },
  botAction(s, difficulty: BotDifficulty) {
    if (s.dice === null) return { roll: [d6(), d6()] }
    const m = selectBotMove(s, difficulty)
    return m ? { from: m.from, to: m.to, pips: m.pips } : null
  },
  createView3D(root, onAction, getState) {
    return createBackgammonView(root, (target) => {
      const s = getState()
      if (s) tapBg(root, s, target, onAction)
    })
  },
  Controls
}
