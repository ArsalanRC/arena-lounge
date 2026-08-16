/**
 * 3D representation of a Connect Four table.
 *
 * Everything is built from SDK primitives so the scene has zero external
 * assets to download on mobile: a wooden table, an upright frame made of two
 * alpha-tested planes (holes are see-through, like the real toy), a rim, 42
 * pooled disc entities, two seat pads on the floor, invisible per-column
 * colliders for desktop clicks, and a billboarded sign.
 *
 * `updateTableVisual` reconciles the visuals with the synced state and is
 * cheap enough to run every frame: it exits early unless something changed.
 */
import {
  Billboard,
  BillboardMode,
  CameraModeArea,
  CameraType,
  ColliderLayer,
  EasingFunction,
  Entity,
  Font,
  InputAction,
  Material,
  MaterialTransparencyMode,
  MeshCollider,
  MeshRenderer,
  TextAlignMode,
  TextShape,
  TextureWrapMode,
  Transform,
  Tween,
  VisibilityComponent,
  engine,
  pointerEventsSystem
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { COLS, ROWS } from '../engine/connectfour'
import { EMISSIVE_RED, EMISSIVE_YELLOW, PALETTE, SEAT_PAD_OFFSET } from './config'
import { CELL_COUNT, SEAT_A, SEAT_B, Status, Winner, cellCol, cellRow, type Seat } from './state'
import { boardOf, drop, local, mySeatAt, otherSeat, seatOf, sit, sitWithBot, inviteBot, toast, type Table } from './tables'
import { createTableSfx, play, playPersonal, type TableSfx } from './sfx'

// ---------------------------------------------------------------- geometry
/** Board plane size in metres (matches the pre-distorted texture). */
const BOARD_W = 1.2
const BOARD_H = 1.04
/** Bar-height table: a standing player in first person sees the board level. */
const TABLE_TOP_Y = 1.02
const BOARD_CENTER_Y = TABLE_TOP_Y + 0.05 + BOARD_H / 2
const CELL_PITCH = 0.16
const HALF_GAP = 0.035 // planes sit at z = ±HALF_GAP
const DISC_R = 0.132 // disc diameter in metres (sprite plane)

const BOARD_TOP = BOARD_CENTER_Y + BOARD_H / 2

function cellLocalPosition(index: number): Vector3 {
  const r = cellRow(index)
  const c = cellCol(index)
  const x = -BOARD_W / 2 + CELL_PITCH * (0.75 + c)
  const y = BOARD_TOP - CELL_PITCH * (0.75 + r)
  return Vector3.create(x, y, 0)
}

export interface TableVisual {
  table: Table
  discs: Entity[]
  sign: Entity
  padA: Entity
  padB: Entity
  camA: Entity
  camB: Entity
  sfx: TableSfx
  rendered: {
    round: number
    cells: number[]
    winKey: string
    signText: string
    signVisible: boolean
    /** round:moveCount of the last state we reacted to (sounds, cues). */
    moveKey: string
    myTurnKey: string
    seated: boolean
    /** Address in the opponent seat last frame (to notice them leaving). */
    oppAddr: string
  }
}

export const visuals: TableVisual[] = []

// ---------------------------------------------------------------- builders

function box(parent: Entity, pos: Vector3, scale: Vector3, color: Color4, rotY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: pos, scale, rotation: Quaternion.fromEulerDegrees(0, rotY, 0) })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: color, roughness: 0.85, metallic: 0 })
  return e
}

function woodBox(parent: Entity, pos: Vector3, scale: Vector3, tiling: Vector3 = Vector3.One()): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: pos, scale })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({
      src: 'images/wood.png',
      wrapMode: TextureWrapMode.TWM_REPEAT,
      tiling: { x: tiling.x, y: tiling.y }
    }),
    roughness: 0.7,
    metallic: 0
  })
  return e
}

function rugPlane(parent: Entity, size: number): void {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, 0.012, 0),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(size, size, 1)
  })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: 'images/rug.png' }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 1,
    metallic: 0,
    castShadows: false
  })
}

function boardPlane(parent: Entity, z: number): void {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, BOARD_CENTER_Y, z),
    scale: Vector3.create(BOARD_W, BOARD_H, 1)
  })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: 'images/board-face.png' }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.6,
    metallic: 0.05,
    castShadows: false
  })
}

/**
 * Discs are alpha-tested sprite planes (2 triangles) rather than cylinders:
 * 126 pooled cylinders alone blew the 4-parcel triangle budget, and the baked
 * sprite shading reads better than a flat primitive anyway. They sit in the
 * gap between the two frame planes, so they are only ever seen face-on.
 */
function makeDisc(parent: Entity): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, -5, 0),
    scale: Vector3.create(DISC_R, DISC_R, 1)
  })
  MeshRenderer.setPlane(e)
  applyDiscMaterial(e, 1, false)
  VisibilityComponent.create(e, { visible: false })
  return e
}

function applyDiscMaterial(e: Entity, v: number, glow: boolean): void {
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: v === 1 ? 'images/ui/disc-yellow.png' : 'images/ui/disc-red.png' }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    // a touch of self-illumination keeps discs vivid in shade; winners glow
    emissiveColor: v === 1 ? EMISSIVE_YELLOW : EMISSIVE_RED,
    emissiveIntensity: glow ? 0.45 : 0.12
  })
}

function makePad(parent: Entity, seat: Seat, color: Color4): { pad: Entity; cam: Entity } {
  const e = engine.addEntity()
  const z = seat === SEAT_A ? -SEAT_PAD_OFFSET : SEAT_PAD_OFFSET
  Transform.create(e, {
    parent,
    position: Vector3.create(0, 0.015, z),
    scale: Vector3.create(1.0, 0.03, 1.0)
  })
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

function makeSign(parent: Entity): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, BOARD_CENTER_Y + BOARD_H / 2 + 0.55, 0) })
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

function makeColumnCollider(t: Table, parent: Entity, col: number): void {
  const e = engine.addEntity()
  const x = -BOARD_W / 2 + CELL_PITCH * (0.75 + col)
  Transform.create(e, {
    parent,
    position: Vector3.create(x, BOARD_CENTER_Y, 0),
    scale: Vector3.create(CELL_PITCH * 0.95, BOARD_H, 0.16)
  })
  MeshCollider.setBox(e, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity: e,
      opts: { button: InputAction.IA_POINTER, hoverText: 'Drop here', maxDistance: 6, showHighlight: false }
    },
    () => {
      drop(t, col)
    }
  )
}

export function buildTableVisual(t: Table): TableVisual {
  const root = t.root

  // table top (wood) + legs + apron
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
  // woven rug under the table
  rugPlane(root, 4.6)

  // frame: two see-through planes, a rim and a foot
  boardPlane(root, -HALF_GAP)
  boardPlane(root, HALF_GAP)
  const rimT = 0.05
  const rimD = HALF_GAP * 2 + 0.01
  box(root, Vector3.create(0, BOARD_TOP + rimT / 2, 0), Vector3.create(BOARD_W + rimT * 2, rimT, rimD), PALETTE.frameDark)
  box(root, Vector3.create(-BOARD_W / 2 - rimT / 2, BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(BOARD_W / 2 + rimT / 2, BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.26), PALETTE.frameDark)
  box(root, Vector3.create(0, BOARD_CENTER_Y - BOARD_H / 2 - 0.01, 0), Vector3.create(BOARD_W + 0.05, 0.02, rimD), PALETTE.frameDark)

  // discs (pooled, one per cell)
  const discs: Entity[] = []
  for (let i = 0; i < CELL_COUNT; i++) discs.push(makeDisc(root))

  // desktop click targets
  for (let c = 0; c < COLS; c++) makeColumnCollider(t, root, c)

  // seat pads
  const { pad: padA, cam: camA } = makePad(root, SEAT_A, PALETTE.padYellow)
  const { pad: padB, cam: camB } = makePad(root, SEAT_B, PALETTE.padRed)
  pointerEventsSystem.onPointerDown(
    { entity: padA, opts: { button: InputAction.IA_POINTER, hoverText: 'Sit here (Yellow)', maxDistance: 8 } },
    () => {
      sit(t, SEAT_A)
    }
  )
  pointerEventsSystem.onPointerDown(
    { entity: padB, opts: { button: InputAction.IA_POINTER, hoverText: 'Sit here (Red)', maxDistance: 8 } },
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

  const sign = makeSign(root)

  const vis: TableVisual = {
    table: t,
    discs,
    sign,
    padA,
    padB,
    camA,
    camB,
    sfx: createTableSfx(root, Vector3.create(0, BOARD_CENTER_Y, 0)),
    rendered: {
      round: -1,
      cells: new Array<number>(CELL_COUNT).fill(0),
      winKey: '',
      signText: '',
      signVisible: true,
      moveKey: '',
      myTurnKey: '',
      seated: false,
      oppAddr: ''
    }
  }
  visuals.push(vis)
  return vis
}

// ---------------------------------------------------------------- update

const setDisc = applyDiscMaterial

function signTextFor(t: Table): string {
  const b = boardOf(t)
  const a = seatOf(t, SEAT_A)
  const s = seatOf(t, SEAT_B)
  const title = t.def.label
  if (a.addr === '' && s.addr === '') return `${title}\nOpen table · come play`
  if (b.status === Status.Playing) {
    const who = b.turn === SEAT_A ? a.name : s.name
    return `${title}\n${a.name} vs ${s.name}\n${who} to move · ${b.winsA}:${b.winsB}`
  }
  if (b.status === Status.Finished) {
    const line =
      b.winner === Winner.Draw ? 'Draw!' : `${b.winner === SEAT_A ? a.name : s.name} wins!`
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
  const b = boardOf(vis.table)

  // first person only for the local player's own seat
  const mine = mySeatAt(vis.table)
  setFirstPersonArea(vis.camA, mine === SEAT_A)
  setFirstPersonArea(vis.camB, mine === SEAT_B)

  // sign (hidden for the local player while they are at this table: the UI
  // card / controller carries the same info and the sign would loom overhead)
  const text = signTextFor(vis.table)
  if (text !== vis.rendered.signText) {
    vis.rendered.signText = text
    TextShape.getMutable(vis.sign).text = text
  }
  const signVisible = local.nearTableId !== vis.table.def.id
  if (signVisible !== vis.rendered.signVisible) {
    vis.rendered.signVisible = signVisible
    VisibilityComponent.getMutable(vis.sign).visible = signVisible
  }

  // fresh round: hide everything
  if (b.round !== vis.rendered.round) {
    vis.rendered.round = b.round
    vis.rendered.winKey = ''
    for (let i = 0; i < CELL_COUNT; i++) {
      if (vis.rendered.cells[i] !== 0) {
        VisibilityComponent.getMutable(vis.discs[i]).visible = false
        Tween.deleteFrom(vis.discs[i])
      }
      vis.rendered.cells[i] = 0
    }
  }

  // discs
  const cells = b.cells
  const animate = b.lastCell >= 0
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = cells[i] ?? 0
    if (v === vis.rendered.cells[i]) continue
    vis.rendered.cells[i] = v
    const disc = vis.discs[i]
    if (v === 0) {
      VisibilityComponent.getMutable(disc).visible = false
      Tween.deleteFrom(disc)
      continue
    }
    setDisc(disc, v, false)
    VisibilityComponent.getMutable(disc).visible = true
    const end = cellLocalPosition(i)
    if (animate && i === b.lastCell) {
      const start = Vector3.create(end.x, BOARD_TOP + 0.25, 0)
      Transform.getMutable(disc).position = start
      Tween.setMove(disc, start, end, 380, EasingFunction.EF_EASEOUTBOUNCE)
      play(vis.sfx.drop)
    } else {
      Tween.deleteFrom(disc)
      Transform.getMutable(disc).position = end
    }
  }

  // winning line glow
  const winKey = b.winCells.join(',')
  if (winKey !== vis.rendered.winKey) {
    // clear previous glow
    if (vis.rendered.winKey !== '') {
      for (const idx of vis.rendered.winKey.split(',')) {
        const i = Number(idx)
        if (vis.rendered.cells[i] !== 0) setDisc(vis.discs[i], vis.rendered.cells[i], false)
      }
    }
    vis.rendered.winKey = winKey
    if (winKey !== '') {
      for (const i of b.winCells) {
        if (vis.rendered.cells[i] !== 0) setDisc(vis.discs[i], vis.rendered.cells[i], true)
      }
      play(vis.sfx.win)
      if (mine && b.winner !== mine) playPersonal('lose')
    }
  }

  // personal cues: sit click, "your move" ding
  const seated = mine !== 0
  if (seated !== vis.rendered.seated) {
    vis.rendered.seated = seated
    if (seated) playPersonal('sit')
  }
  const turnKey = `${b.round}:${b.moveCount}:${b.turn}`
  if (turnKey !== vis.rendered.myTurnKey) {
    vis.rendered.myTurnKey = turnKey
    if (seated && b.status === Status.Playing && b.turn === mine) playPersonal('turn')
  }
  const oppAddr = seated ? seatOf(vis.table, otherSeat(mine as Seat)).addr : ''
  if (oppAddr !== vis.rendered.oppAddr) {
    const wasHuman = vis.rendered.oppAddr !== '' && vis.rendered.oppAddr !== 'bot'
    if (seated && wasHuman && oppAddr === '') toast('Your opponent left the table')
    vis.rendered.oppAddr = oppAddr
  }
}

export function tableVisualsSystem(): void {
  for (const vis of visuals) updateTableVisual(vis)
}

/** Rows/cols exported for the UI mini board. */
export const GRID = { ROWS, COLS }
