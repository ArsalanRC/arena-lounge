/**
 * 3D representation of a lounge table (game-agnostic part).
 *
 * Builds the wooden bar table, rug, seat pads (with per-seat camera areas),
 * the little robot token, the floating sign and the spatial sound sources,
 * then hands the table root to the game plugin's `createView3D` for the game
 * itself. `updateTableVisual` reconciles everything with the synced state and
 * is cheap enough to run every frame: it exits early unless something changed.
 */
import {
  Billboard,
  BillboardMode,
  CameraModeArea,
  CameraType,
  ColliderLayer,
  Entity,
  Font,
  GltfContainer,
  InputAction,
  TextAlignMode,
  TextShape,
  Transform,
  VisibilityComponent,
  engine,
  pointerEventsSystem
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { SEAT_PAD_OFFSET } from './config'
import { localeInfo, seatLabel, t as L, uiLang } from './i18n'
import type { View3DHandle } from './games/types'
import { createTableSfx, play, playPersonal, type TableSfx } from './sfx'
import { SEAT_A, SEAT_B, Status, Winner, winsOf, type Seat } from './state'
import { act, boardOf, gameStateOf, inviteBot, lastActionOf, local, me, mySeatAt, occupiedSeats, otherSeats, seatOf, seatPadLocalOffset, seatsOf, sideOf, sit, sitWithBot, targetPlayers, toast, type Table } from './tables'
import { reportResult } from './leaderboard'
import { TABLE_TOP_Y, toTableLocal } from './views/shared'

export { TABLE_TOP_Y, box } from './views/shared'

export interface TableVisual {
  table: Table
  view: View3DHandle
  sign: Entity
  /** One camera area per physical seat (index = seat - 1). */
  cams: Entity[]
  sfx: TableSfx
  rendered: {
    round: number
    moveCount: number
    status: number
    winner: number
    signText: string
    signVisible: boolean
    myTurnKey: string
    seated: boolean
    /** Addresses in the other seats last frame, joined (to notice someone leaving). */
    oppAddr: string
  }
}

export const visuals: TableVisual[] = []

// ---------------------------------------------------------------- builders

/**
 * Camera area entity for a seat: gets a first-person CameraModeArea only
 * while the *local* player holds this seat (see updateTableVisual), so
 * bystanders who step on a pad keep their own camera. The pad itself is part
 * of models/table.glb.
 */
function makeCam(parent: Entity, seat: Seat): Entity {
  const cam = engine.addEntity()
  const off = seatPadLocalOffset(seat)
  Transform.create(cam, { parent, position: Vector3.create(off.x, 1.2, off.z) })
  return cam
}

/** Little robot token (models/robot.glb) with a pointer collider; returns the entity. */
function makeBotFigure(parent: Entity, at: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: at, rotation: Quaternion.fromEulerDegrees(0, 25, 0) })
  GltfContainer.create(e, { src: 'models/robot.glb', invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER, visibleMeshesCollisionMask: ColliderLayer.CL_NONE })
  return e
}

function makeSign(parent: Entity, y: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, y, 0) })
  TextShape.create(e, {
    text: '',
    fontSize: 1.7,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: Color4.White(),
    outlineWidth: 0.12,
    outlineColor: Color3.Black(),
    width: 6,
    height: 1
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
  VisibilityComponent.create(e, { visible: true })
  return e
}

/** Height of the sign above the table; games taller than Four in a Row can bump this. */
const SIGN_Y = TABLE_TOP_Y + 0.05 + 1.04 + 0.55

export function buildTableVisual(t: Table): TableVisual {
  const root = t.root

  // table top + apron + legs + the seat pads: one GLB on the root (models/table.glb,
  // or the square four-pad table4.glb); the pads' pointer collider is an invisible mesh inside it
  GltfContainer.create(root, { src: t.seats > 2 ? 'models/table4.glb' : 'models/table.glb', invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER, visibleMeshesCollisionMask: ColliderLayer.CL_NONE })

  // the game itself
  const view = t.game.createView3D(
    root,
    (action) => {
      act(t, action)
    },
    () => gameStateOf(t)
  )

  // seat pads: all look the same (chairs carry no colour, sides are dealt at
  // random per round); a tap on the GLB's pad collider picks the seat by the
  // hit point's side of the table (front / back, and left / right on four-pad tables)
  const cams = seatsOf(t).map((seat) => makeCam(root, seat))
  pointerEventsSystem.onPointerDown(
    { entity: root, opts: { button: InputAction.IA_POINTER, hoverText: 'Sit here', maxDistance: 8 } },
    (event) => {
      const p = event.hit?.position
      if (!p) return
      const l = toTableLocal(root, p)
      if (t.seats > 2 && Math.abs(l.x) > Math.abs(l.z)) sit(t, l.x < 0 ? 3 : 4)
      else sit(t, l.z < 0 ? SEAT_A : SEAT_B)
    }
  )

  // a tiny robot on the table corner: tap it to challenge the house bot
  const bot = makeBotFigure(root, Vector3.create(0.72, TABLE_TOP_Y, -0.28))
  pointerEventsSystem.onPointerDown(
    { entity: bot, opts: { button: InputAction.IA_POINTER, hoverText: 'Play the house bot', maxDistance: 8 } },
    () => {
      if (mySeatAt(t)) inviteBot(t)
      else sitWithBot(t)
    }
  )

  const sign = makeSign(root, SIGN_Y)

  const vis: TableVisual = {
    table: t,
    view,
    sign,
    cams,
    sfx: createTableSfx(root, Vector3.create(0, TABLE_TOP_Y + 0.6, 0)),
    rendered: {
      round: -1,
      moveCount: -1,
      status: -1,
      winner: -1,
      signText: '',
      signVisible: true,
      myTurnKey: '',
      seated: false,
      oppAddr: ''
    }
  }
  visuals.push(vis)
  return vis
}

// ---------------------------------------------------------------- update

/** Sign text in the viewer's UI language (signs are local entities, so every client renders its own). */
function signTextFor(t: Table): string {
  const b = boardOf(t)
  const a = seatOf(t, SEAT_A)
  const s = seatOf(t, SEAT_B)
  const str = L()
  const nameOf = (x: { name: string; bot: boolean }) => (x.bot ? str.houseBot : x.name)
  const title = `${str.table(t.def.id + 1)} · ${localeInfo(uiLang.code).games[t.game.id]?.name ?? t.game.label}`
  const seated = occupiedSeats(t)
  if (seated.length === 0) return `${title}\n${str.comePlay}`
  if (t.seats > 2) {
    const names = str.seatedList(seated.map((x) => nameOf(seatOf(t, x))))
    const score = seated.map((x) => winsOf(b, x)).join(':')
    if (b.status === Status.Playing) return `${title}\n${names}\n${str.toMove(nameOf(seatOf(t, b.turn as Seat)))} · ${score}`
    if (b.status === Status.Finished) {
      const line = b.winner === Winner.Draw ? str.drawShort : str.wins(nameOf(seatOf(t, b.winner as Seat)))
      return `${title}\n${names}\n${line} · ${score}`
    }
    const missing = targetPlayers(t) - seated.length
    return `${title}\n${names}\n${missing > 0 ? str.waitingForMore(missing) : str.oneSeatFree}`
  }
  if (b.status === Status.Playing) {
    const who = b.turn === SEAT_A ? nameOf(a) : nameOf(s)
    return `${title}\n${str.vs(nameOf(a), nameOf(s))}\n${str.toMove(who)} · ${b.winsA}:${b.winsB}`
  }
  if (b.status === Status.Finished) {
    const line = b.winner === Winner.Draw ? str.drawShort : str.wins(b.winner === SEAT_A ? nameOf(a) : nameOf(s))
    return `${title}\n${str.vs(nameOf(a), nameOf(s))}\n${line} · ${b.winsA}:${b.winsB}`
  }
  const waiting = a.addr === '' ? nameOf(s) : nameOf(a)
  return `${title}\n${str.waitingForRival(waiting)}\n${str.oneSeatFree}`
}

function setFirstPersonArea(cam: Entity, on: boolean): void {
  const has = CameraModeArea.getOrNull(cam) !== null
  if (on && !has) CameraModeArea.create(cam, { area: Vector3.create(1.8, 2.6, 1.8), mode: CameraType.CT_FIRST_PERSON })
  else if (!on && has) CameraModeArea.deleteFrom(cam)
}

export function updateTableVisual(vis: TableVisual): void {
  const t = vis.table
  const b = boardOf(t)
  const r = vis.rendered

  // first person only for the local player's own seat
  const mine = mySeatAt(t)
  vis.cams.forEach((cam, i) => setFirstPersonArea(cam, mine === i + 1))

  // sign (hidden for the local player while they are at this table: the UI
  // card / controller carries the same info and the sign would loom overhead)
  const text = signTextFor(t)
  if (text !== r.signText) {
    r.signText = text
    TextShape.getMutable(vis.sign).text = text
  }
  const signVisible = local.nearTableId !== t.def.id
  if (signVisible !== r.signVisible) {
    r.signVisible = signVisible
    VisibilityComponent.getMutable(vis.sign).visible = signVisible
  }

  // game state -> view; a fresh deal also tells the seated player which colour they got
  if (b.round !== r.round) {
    r.round = b.round
    r.moveCount = -1
    r.winner = -1
    vis.view.reset()
    if (mine && b.status === Status.Playing) toast(L().youPlaySide(seatLabel(t.game.seatNames[sideOf(t, mine) - 1])))
  }
  if (b.moveCount !== r.moveCount || b.status !== r.status || b.winner !== r.winner) {
    const state = gameStateOf(t)
    const animate = b.moveCount === r.moveCount + 1
    if (state !== null) {
      vis.view.update(state, { lastAction: lastActionOf(t), animate, round: b.round, winner: b.winner })
      if (animate) play(vis.sfx.move)
    } else {
      vis.view.reset()
      vis.view.idle?.()
    }
    if (b.winner !== r.winner && b.winner !== Winner.None) {
      if (b.winner !== Winner.Draw) play(vis.sfx.win)
      if (mine && b.winner !== mine && b.winner !== Winner.Draw) playPersonal('lose')
      // the leaderboard counts rounds against people: report my result once when a human sat with me
      if (mine && b.sides[mine - 1] > 0) {
        const rivals = otherSeats(t, mine)
          .map((x) => seatOf(t, x))
          .filter((sd, k) => sd.addr !== '' && !sd.bot && b.sides[otherSeats(t, mine)[k] - 1] > 0)
          .map((sd) => sd.addr)
        if (rivals.length > 0) {
          const outcome = b.winner === Winner.Draw ? 'draw' : b.winner === mine ? 'win' : 'loss'
          void reportResult(me.name, t.game.id, outcome, `${t.def.id}:${b.round}:${b.dealtAt}`, rivals)
        }
      }
    }
    r.moveCount = b.moveCount
    r.status = b.status
    r.winner = b.winner
  }

  // personal cues: sit click, "your move" ding, opponent left
  const seated = mine !== 0
  if (seated !== r.seated) {
    r.seated = seated
    if (seated) playPersonal('sit')
  }
  const turnKey = `${b.round}:${b.moveCount}:${b.turn}`
  if (turnKey !== r.myTurnKey) {
    r.myTurnKey = turnKey
    if (seated && b.status === Status.Playing && b.turn === mine) playPersonal('turn')
  }
  const others = seated ? otherSeats(t, mine as Seat).map((x) => seatOf(t, x).addr) : []
  const oppAddr = others.join('|')
  if (oppAddr !== r.oppAddr) {
    // a human in another seat became an empty seat (or a bot took their chair): say so
    const before = r.oppAddr === '' ? [] : r.oppAddr.split('|')
    const humanLeft = before.some((addr, i) => addr !== '' && addr !== 'bot' && (others[i] === '' || others[i] === 'bot'))
    if (seated && humanLeft && before.length === others.length) toast(L().opponentLeft)
    r.oppAddr = oppAddr
  }
}

export function tableVisualsSystem(): void {
  for (const vis of visuals) updateTableVisual(vis)
}
