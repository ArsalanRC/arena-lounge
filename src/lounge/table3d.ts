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
  InputAction,
  Material,
  MaterialTransparencyMode,
  MeshCollider,
  MeshRenderer,
  TextAlignMode,
  TextShape,
  Transform,
  VisibilityComponent,
  engine,
  pointerEventsSystem
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { PALETTE, SEAT_PAD_OFFSET } from './config'
import type { View3DHandle } from './games/types'
import { createTableSfx, play, playPersonal, type TableSfx } from './sfx'
import { SEAT_A, SEAT_B, Status, Winner, type Seat } from './state'
import { act, boardOf, gameStateOf, inviteBot, lastActionOf, local, mySeatAt, otherSeat, seatOf, sit, sitWithBot, toast, type Table } from './tables'
import { TABLE_TOP_Y, box, woodBox } from './views/shared'

export { TABLE_TOP_Y, box } from './views/shared'

export interface TableVisual {
  table: Table
  view: View3DHandle
  sign: Entity
  padA: Entity
  padB: Entity
  camA: Entity
  camB: Entity
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
    /** Address in the opponent seat last frame (to notice them leaving). */
    oppAddr: string
  }
}

export const visuals: TableVisual[] = []

// ---------------------------------------------------------------- builders

function makePad(parent: Entity, seat: Seat, color: Color4): { pad: Entity; cam: Entity } {
  const e = engine.addEntity()
  const z = seat === SEAT_A ? -SEAT_PAD_OFFSET : SEAT_PAD_OFFSET
  Transform.create(e, { parent, position: Vector3.create(0, 0.015, z), scale: Vector3.create(1.0, 0.03, 1.0) })
  MeshRenderer.setCylinder(e, 0.5, 0.5)
  MeshCollider.setCylinder(e, 0.5, 0.5, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(e, { albedoColor: color, roughness: 0.9, metallic: 0 })
  // Camera area entity: gets a first-person CameraModeArea only while the
  // *local* player holds this seat (see updateTableVisual), so bystanders who
  // step on a pad keep their own camera.
  const cam = engine.addEntity()
  Transform.create(cam, { parent, position: Vector3.create(0, 1.2, z) })
  return { pad: e, cam }
}

/** Little three-box robot with glowing eyes; returns the clickable body. */
function makeBotFigure(parent: Entity, at: Vector3): Entity {
  const body = engine.addEntity()
  Transform.create(body, {
    parent,
    position: Vector3.create(at.x, at.y + 0.11, at.z),
    rotation: Quaternion.fromEulerDegrees(0, 25, 0),
    scale: Vector3.create(0.16, 0.2, 0.12)
  })
  MeshRenderer.setBox(body)
  MeshCollider.setBox(body, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(body, { albedoColor: PALETTE.frameDark, roughness: 0.4, metallic: 0.5 })
  const head = engine.addEntity()
  Transform.create(head, { parent: body, position: Vector3.create(0, 0.78, 0), scale: Vector3.create(0.85, 0.55, 0.9) })
  MeshRenderer.setBox(head)
  Material.setPbrMaterial(head, { albedoColor: PALETTE.frame, roughness: 0.4, metallic: 0.5 })
  for (const x of [-0.25, 0.25]) {
    const eye = engine.addEntity()
    Transform.create(eye, { parent: head, position: Vector3.create(x, 0.05, -0.55), scale: Vector3.create(0.22, 0.28, 0.14) })
    MeshRenderer.setBox(eye)
    Material.setPbrMaterial(eye, {
      albedoColor: Color4.fromHexString('#9ff0ffff'),
      emissiveColor: Color3.fromHexString('#7fe6ff'),
      emissiveIntensity: 2,
      roughness: 0.2,
      metallic: 0
    })
  }
  const antenna = engine.addEntity()
  Transform.create(antenna, { parent: head, position: Vector3.create(0, 0.75, 0), scale: Vector3.create(0.08, 0.5, 0.08) })
  MeshRenderer.setCylinder(antenna, 0.5, 0.5)
  Material.setPbrMaterial(antenna, { albedoColor: PALETTE.frameDark, roughness: 0.4, metallic: 0.5 })
  const tip = engine.addEntity()
  Transform.create(tip, { parent: head, position: Vector3.create(0, 1.05, 0), scale: Vector3.create(0.24, 0.35, 0.24) })
  MeshRenderer.setBox(tip)
  Material.setPbrMaterial(tip, {
    albedoColor: PALETTE.red,
    emissiveColor: Color3.fromHexString('#ff6a5e'),
    emissiveIntensity: 1.2,
    roughness: 0.3,
    metallic: 0
  })
  return body
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

/** Height of the sign above the table; games taller than Connect Four can bump this. */
const SIGN_Y = TABLE_TOP_Y + 0.05 + 1.04 + 0.55

export function buildTableVisual(t: Table): TableVisual {
  const root = t.root

  // table top (wood) + apron + legs
  woodBox(root, Vector3.create(0, TABLE_TOP_Y - 0.03, 0), Vector3.create(1.8, 0.06, 0.9), Vector3.create(2, 1, 1))
  box(root, Vector3.create(0, TABLE_TOP_Y - 0.1, 0), Vector3.create(1.6, 0.08, 0.7), PALETTE.woodDark)
  for (const [x, z] of [
    [-0.78, -0.33],
    [0.78, -0.33],
    [-0.78, 0.33],
    [0.78, 0.33]
  ]) {
    box(root, Vector3.create(x, (TABLE_TOP_Y - 0.06) / 2, z), Vector3.create(0.09, TABLE_TOP_Y - 0.06, 0.09), PALETTE.woodDark)
  }

  // the game itself
  const view = t.game.createView3D(root, (action) => {
    act(t, action)
  })

  // seat pads
  const { pad: padA, cam: camA } = makePad(root, SEAT_A, PALETTE.padYellow)
  const { pad: padB, cam: camB } = makePad(root, SEAT_B, PALETTE.padRed)
  const [nameA, nameB] = t.game.seatNames
  pointerEventsSystem.onPointerDown(
    { entity: padA, opts: { button: InputAction.IA_POINTER, hoverText: `Sit here (${nameA})`, maxDistance: 8 } },
    () => {
      sit(t, SEAT_A)
    }
  )
  pointerEventsSystem.onPointerDown(
    { entity: padB, opts: { button: InputAction.IA_POINTER, hoverText: `Sit here (${nameB})`, maxDistance: 8 } },
    () => {
      sit(t, SEAT_B)
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
    padA,
    padB,
    camA,
    camB,
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

function signTextFor(t: Table): string {
  const b = boardOf(t)
  const a = seatOf(t, SEAT_A)
  const s = seatOf(t, SEAT_B)
  const title = `${t.def.label} · ${t.game.label}`
  if (a.addr === '' && s.addr === '') return `${title}\nOpen table · come play`
  if (b.status === Status.Playing) {
    const who = b.turn === SEAT_A ? a.name : s.name
    return `${title}\n${a.name} vs ${s.name}\n${who} to move · ${b.winsA}:${b.winsB}`
  }
  if (b.status === Status.Finished) {
    const line = b.winner === Winner.Draw ? 'Draw!' : `${b.winner === SEAT_A ? a.name : s.name} wins!`
    return `${title}\n${a.name} vs ${s.name}\n${line} · ${b.winsA}:${b.winsB}`
  }
  const waiting = a.addr === '' ? s.name : a.name
  return `${title}\n${waiting} is waiting for a rival\nOne seat free`
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
  setFirstPersonArea(vis.camA, mine === SEAT_A)
  setFirstPersonArea(vis.camB, mine === SEAT_B)

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

  // game state -> view
  if (b.round !== r.round) {
    r.round = b.round
    r.moveCount = -1
    r.winner = -1
    vis.view.reset()
  }
  if (b.moveCount !== r.moveCount || b.status !== r.status || b.winner !== r.winner) {
    const state = gameStateOf(t)
    const animate = b.moveCount === r.moveCount + 1
    if (state !== null) {
      vis.view.update(state, { lastAction: lastActionOf(t), animate, round: b.round, winner: b.winner })
      if (animate) play(vis.sfx.move)
    } else {
      vis.view.reset()
    }
    if (b.winner !== r.winner && b.winner !== Winner.None) {
      if (b.winner !== Winner.Draw) play(vis.sfx.win)
      if (mine && b.winner !== mine && b.winner !== Winner.Draw) playPersonal('lose')
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
  const oppAddr = seated ? seatOf(t, otherSeat(mine as Seat)).addr : ''
  if (oppAddr !== r.oppAddr) {
    const wasHuman = r.oppAddr !== '' && r.oppAddr !== 'bot'
    if (seated && wasHuman && oppAddr === '') toast('Your opponent left the table')
    r.oppAddr = oppAddr
  }
}

export function tableVisualsSystem(): void {
  for (const vis of visuals) updateTableVisual(vis)
}
