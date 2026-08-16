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
import { boardOf, drop, seatOf, sit, type Table } from './tables'

// ---------------------------------------------------------------- geometry
/** Board plane size in metres (matches the pre-distorted texture). */
const BOARD_W = 1.2
const BOARD_H = 1.04
const BOARD_CENTER_Y = 1.3
const CELL_PITCH = 0.16
const HALF_GAP = 0.035 // planes sit at z = ±HALF_GAP
const DISC_R = 0.13 // disc diameter as scale (0.13 m)
const DISC_T = 0.06 // disc thickness
const TABLE_TOP_Y = 0.75

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
  rendered: {
    round: number
    cells: number[]
    winKey: string
    signText: string
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

function makeDisc(parent: Entity): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, -5, 0),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(DISC_R, DISC_T, DISC_R)
  })
  MeshRenderer.setCylinder(e, 0.5, 0.5)
  Material.setPbrMaterial(e, { albedoColor: PALETTE.yellow, roughness: 0.4, metallic: 0.1 })
  VisibilityComponent.create(e, { visible: false })
  return e
}

function makePad(parent: Entity, seat: Seat, color: Color4): Entity {
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
  return e
}

function makeSign(parent: Entity): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, 2.25, 0) })
  TextShape.create(e, {
    text: '',
    fontSize: 2.2,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: Color4.White(),
    outlineWidth: 0.12,
    outlineColor: Color3.Black(),
    width: 6,
    height: 1
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
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

  // table top + legs
  box(root, Vector3.create(0, TABLE_TOP_Y - 0.03, 0), Vector3.create(1.8, 0.06, 0.9), PALETTE.wood)
  for (const [x, z] of [
    [-0.8, -0.35],
    [0.8, -0.35],
    [-0.8, 0.35],
    [0.8, 0.35]
  ]) {
    box(root, Vector3.create(x, (TABLE_TOP_Y - 0.06) / 2, z), Vector3.create(0.08, TABLE_TOP_Y - 0.06, 0.08), PALETTE.woodDark)
  }
  // rug under the table
  const rug = engine.addEntity()
  Transform.create(rug, { parent: root, position: Vector3.create(0, 0.005, 0), scale: Vector3.create(4.4, 0.01, 4.4) })
  MeshRenderer.setCylinder(rug, 0.5, 0.5)
  Material.setPbrMaterial(rug, { albedoColor: PALETTE.rug, roughness: 1, metallic: 0 })

  // frame: two see-through planes, a rim and a foot
  boardPlane(root, -HALF_GAP)
  boardPlane(root, HALF_GAP)
  const rimT = 0.05
  const rimD = HALF_GAP * 2 + 0.01
  box(root, Vector3.create(0, BOARD_TOP + rimT / 2, 0), Vector3.create(BOARD_W + rimT * 2, rimT, rimD), PALETTE.frameDark)
  box(root, Vector3.create(-BOARD_W / 2 - rimT / 2, BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(BOARD_W / 2 + rimT / 2, BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.02, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.24), PALETTE.frameDark)
  box(root, Vector3.create(0, (TABLE_TOP_Y + BOARD_CENTER_Y - BOARD_H / 2) / 2 + 0.02, 0), Vector3.create(BOARD_W + 0.05, 0.02, rimD), PALETTE.frameDark)

  // discs (pooled, one per cell)
  const discs: Entity[] = []
  for (let i = 0; i < CELL_COUNT; i++) discs.push(makeDisc(root))

  // desktop click targets
  for (let c = 0; c < COLS; c++) makeColumnCollider(t, root, c)

  // seat pads
  const padA = makePad(root, SEAT_A, PALETTE.padYellow)
  const padB = makePad(root, SEAT_B, PALETTE.padRed)
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

  const sign = makeSign(root)

  const vis: TableVisual = {
    table: t,
    discs,
    sign,
    padA,
    padB,
    rendered: { round: -1, cells: new Array<number>(CELL_COUNT).fill(0), winKey: '', signText: '' }
  }
  visuals.push(vis)
  return vis
}

// ---------------------------------------------------------------- update

function discColor(v: number): Color4 {
  return v === 1 ? PALETTE.yellow : PALETTE.red
}

function setDisc(e: Entity, v: number, glow: boolean): void {
  Material.setPbrMaterial(e, {
    albedoColor: discColor(v),
    roughness: 0.4,
    metallic: 0.1,
    emissiveColor: glow ? (v === 1 ? EMISSIVE_YELLOW : EMISSIVE_RED) : Color3.Black(),
    emissiveIntensity: glow ? 2.5 : 0
  })
}

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

export function updateTableVisual(vis: TableVisual): void {
  const b = boardOf(vis.table)

  // sign
  const text = signTextFor(vis.table)
  if (text !== vis.rendered.signText) {
    vis.rendered.signText = text
    TextShape.getMutable(vis.sign).text = text
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
    }
  }
}

export function tableVisualsSystem(): void {
  for (const vis of visuals) updateTableVisual(vis)
}

/** Rows/cols exported for the UI mini board. */
export const GRID = { ROWS, COLS }
