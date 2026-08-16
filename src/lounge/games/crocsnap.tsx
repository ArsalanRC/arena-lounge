/**
 * Croc Snap table game: the pure-luck party round. Twelve teeth, one of them
 * the trigger; players take turns pressing a tooth, whoever presses the
 * trigger loses the round. Bridges src/engine/crocsnap to the TableGame
 * contract; the touch UI is a ring of twelve big tooth buttons.
 *
 * The trigger index travels inside the synced state (it must be identical on
 * every client); the UI never shows it. Casual honesty is enough here.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { TEETH_COUNT, applyMove, createInitialState, getValidMoves, selectBotMove, type CrocSnapGameState } from '../../engine/crocsnap'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { CROC_COLORS, createCrocSnapView, toothAngle, type CrocAction } from '../views/crocsnap3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const IMG = { tooth: 'images/ui/disc.png', ring: 'images/ui/ring.png', yellow: 'images/ui/disc-yellow.png', red: 'images/ui/disc-red.png' }

interface Wire {
  t: string // 12 chars '0' open '1' pressed
  x: number // trigger index
  p: number
  s: 'p' | 'f'
  r: number
  e: string[]
  l: [number, string] | null
  n: number
}

function encode(s: CrocSnapGameState): string {
  const w: Wire = {
    t: s.teeth.map((t) => (t.pressed ? '1' : '0')).join(''),
    x: s.triggerIndex,
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    r: s.round,
    e: s.eliminatedPlayers,
    l: s.lastSnap ? [s.lastSnap.toothIndex, s.lastSnap.eliminatedPlayerId] : null,
    n: s.turnNumber
  }
  return JSON.stringify(w)
}

function decode(json: string): CrocSnapGameState {
  const w = JSON.parse(json) as Wire
  const teeth = []
  for (let i = 0; i < TEETH_COUNT; i++) teeth.push({ pressed: w.t[i] === '1' })
  const finished = w.s === 'f'
  const eliminated = Array.isArray(w.e) ? w.e : []
  return {
    status: finished ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: w.p === 1 ? 1 : 0,
    turnNumber: w.n,
    finishOrder: finished ? [...ENGINE_PLAYERS.map((p) => p.id).filter((id) => !eliminated.includes(id)), ...[...eliminated].reverse()] : [],
    teeth,
    triggerIndex: w.x,
    round: w.r,
    eliminatedPlayers: eliminated,
    lastSnap: w.l ? { toothIndex: w.l[0], eliminatedPlayerId: w.l[1] } : null
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

// ---------------------------------------------------------------- controls

/** Ring of twelve tooth buttons; open teeth are tappable on your turn. */
function Ring(props: { state: CrocSnapGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const radius = props.phone ? 150 : 118
  const btn = props.phone ? 64 : 52
  const size = radius * 2 + btn
  const items: ReactEcs.JSX.Element[] = []
  const snapAt = state.lastSnap && state.status === 'finished' ? state.lastSnap.toothIndex : -1
  for (let i = 0; i < TEETH_COUNT; i++) {
    const a = toothAngle(i)
    const cx = size / 2 + Math.sin(a) * radius
    const cy = size / 2 - Math.cos(a) * radius
    const pressed = state.teeth[i].pressed
    const open = !pressed && ctx.myTurn
    items.push(
      <UiEntity
        key={`t${i}`}
        uiTransform={{ positionType: 'absolute', position: { left: cx - btn / 2, top: cy - btn / 2 }, width: btn, height: btn, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block', opacity: pressed ? 0.45 : 1 }}
        uiBackground={{ texture: { src: IMG.tooth }, textureMode: 'stretch', color: i === snapAt ? CROC_COLORS.snap : pressed ? CROC_COLORS.pressed : CROC_COLORS.tooth }}
        onMouseDown={() => {
          if (open) ctx.act({ tooth: i } as CrocAction)
        }}
      >
        {open && <UiEntity uiTransform={{ width: btn - 6, height: btn - 6 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: UI.accentTint }} />}
      </UiEntity>
    )
  }
  return (
    <UiEntity uiTransform={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <UiEntity uiTransform={{ width: radius * 1.1, height: radius * 1.1 }} uiBackground={{ texture: { src: 'images/croc-face.png' }, textureMode: 'stretch' }} />
      {items}
    </UiEntity>
  )
}

function Controls(props: { state: CrocSnapGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const open = s.teeth.filter((t) => !t.pressed).length
  const hint = s.status === 'finished' ? 'SNAP! The trigger tooth' : props.ctx.myTurn ? 'Press a tooth' : ''
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${open} teeth left${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: UI.muted, textAlign: 'middle-center' }} />
      <Ring state={s} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const crocSnapGame: TableGame<CrocSnapGameState, CrocAction> = {
  id: 'crocsnap',
  label: 'Croc Snap',
  seatNames: ['Yellow', 'Red'],
  seatSprites: [IMG.yellow, IMG.red],
  seatColors: [UI.yellow, UI.red],

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
    const winnerId = s.finishOrder[0]
    return winnerId === 'A' ? 1 : winnerId === 'B' ? 2 : WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const tooth = Math.floor(Number(action?.tooth))
    const move = getValidMoves(s).find((m) => m.toothIndex === tooth)
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = selectBotMove(s, getValidMoves(s), difficulty)
    return m ? { tooth: m.toothIndex } : null
  },
  createView3D(root, onAction) {
    return createCrocSnapView(root, (tooth) => onAction({ tooth }))
  },
  Controls
}
