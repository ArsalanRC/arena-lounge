/**
 * Dot Lines (dots and boxes) on a table: an upright double-sided board so
 * both seats look at it face-on. Player B sees it mirrored, which the UI
 * mirrors too (see games/dotlines.tsx). Dots are tappable in 3D as well:
 * tap one dot, then a neighbour, to draw the edge between them.
 */
import { Entity, Material, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import type { DotLinesGameState } from '../../engine/dotlines'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface DotAction {
  o: 'h' | 'v'
  r: number
  c: number
}

const ROWS = 5
const COLS = 5
const BOARD = 1.0 // metres, square
const PITCH = BOARD / (ROWS + 1) // dot spacing (leaves a half-cell margin)
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02

/** 0/1 = seat colours (unused for now), 2 = neutral dark line. */
const LINE_COLORS: Color4[] = [PALETTE.yellow, PALETTE.red, Color4.fromHexString('#2b2320ff')]
const BOX_TINTS: Color4[] = [Color4.fromHexString('#f0d27aff'), Color4.fromHexString('#e89a90ff')]

function dotLocal(r: number, c: number): Vector3 {
  const x = -BOARD / 2 + PITCH * (0.5 + c)
  const y = CENTER_Y + BOARD / 2 - PITCH * (0.5 + r)
  return Vector3.create(x, y, 0)
}

function backingPlane(parent: Entity, z: number): void {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD + 0.06, BOARD + 0.06, 1) })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, { albedoColor: PALETTE.cream, roughness: 0.95, metallic: 0, castShadows: false })
}

/** One thin box per claimed square, poking out of both faces of the board. */
function fillBox(parent: Entity, at: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(at.x, at.y, 0), scale: Vector3.create(PITCH * 0.86, PITCH * 0.86, HALF_T * 2 + 0.006) })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: BOX_TINTS[0], roughness: 1, metallic: 0, castShadows: false })
  VisibilityComponent.create(e, { visible: false })
  return e
}

/** Selection shared by 3D taps and the UI (module-level, per table root). */
export const dotSelection = new Map<Entity, { r: number; c: number }>()
/** Views subscribe here to refresh their highlight when the selection moves. */
export const selectionListeners = new Map<Entity, () => void>()

function setSelection(root: Entity, sel: { r: number; c: number } | null): void {
  if (sel) dotSelection.set(root, sel)
  else dotSelection.delete(root)
  selectionListeners.get(root)?.()
}

/** Resolve a two-tap gesture into an edge action, or update the selection. */
export function tapDot(root: Entity, r: number, c: number, act: (a: DotAction) => boolean): void {
  const sel = dotSelection.get(root)
  if (!sel) {
    setSelection(root, { r, c })
    return
  }
  if (sel.r === r && sel.c === c) {
    setSelection(root, null)
    return
  }
  const dr = Math.abs(sel.r - r)
  const dc = Math.abs(sel.c - c)
  if (dr + dc === 1) {
    const action: DotAction =
      dr === 0 ? { o: 'h', r, c: Math.min(sel.c, c) } : { o: 'v', r: Math.min(sel.r, r), c }
    setSelection(root, null)
    if (!act(action)) setSelection(root, { r, c })
    return
  }
  setSelection(root, { r, c })
}

export function createDotLinesView(root: Entity, onAction: (a: DotAction) => void): View3DHandle {
  backingPlane(root, -HALF_T)
  backingPlane(root, HALF_T)
  // rim + foot
  const rim = 0.04
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + 0.03 + rim / 2, 0), Vector3.create(BOARD + 0.06 + rim * 2, rim, HALF_T * 2 + 0.01), PALETTE.woodDark)
  box(root, Vector3.create(-(BOARD + 0.06) / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, HALF_T * 2 + 0.01), PALETTE.woodDark)
  box(root, Vector3.create((BOARD + 0.06) / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, HALF_T * 2 + 0.01), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - 0.03 - rim / 2, 0), Vector3.create(BOARD + 0.06, rim, HALF_T * 2 + 0.01), PALETTE.woodDark)

  // dots (visual only; one click area below maps a hit to the nearest dot)
  const dots: Entity[] = []
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: dotLocal(r, c), scale: Vector3.create(0.045, 0.045, HALF_T * 2 + 0.03) })
      MeshRenderer.setBox(e)
      Material.setPbrMaterial(e, { albedoColor: PALETTE.woodDark, roughness: 0.6, metallic: 0.1 })
      dots.push(e)
    }
  }
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Connect dots', (local) => {
    const c = clampInt((local.x + BOARD / 2) / PITCH, 0, COLS)
    const r = clampInt((CENTER_Y + BOARD / 2 - local.y) / PITCH, 0, ROWS)
    tapDot(root, r, c, (a) => {
      onAction(a)
      return true
    })
  })

  // lines and box fills exist only while a round runs (LazyPool); dots stay, they are the board
  interface Marks {
    hLines: Entity[][]
    vLines: Entity[][]
    fills: Entity[][]
    all: Entity[]
  }
  const buildMarks = (): Marks => {
    const all: Entity[] = []
    const hLines: Entity[][] = []
    for (let r = 0; r <= ROWS; r++) {
      hLines.push([])
      for (let c = 0; c < COLS; c++) {
        const a = dotLocal(r, c)
        const e = engine.addEntity()
        Transform.create(e, { parent: root, position: Vector3.create(a.x + PITCH / 2, a.y, 0), scale: Vector3.create(PITCH, 0.03, HALF_T * 2 + 0.02) })
        MeshRenderer.setBox(e)
        Material.setPbrMaterial(e, { albedoColor: LINE_COLORS[0], roughness: 0.5, metallic: 0 })
        VisibilityComponent.create(e, { visible: false })
        hLines[r].push(e)
        all.push(e)
      }
    }
    const vLines: Entity[][] = []
    for (let r = 0; r < ROWS; r++) {
      vLines.push([])
      for (let c = 0; c <= COLS; c++) {
        const a = dotLocal(r, c)
        const e = engine.addEntity()
        Transform.create(e, { parent: root, position: Vector3.create(a.x, a.y - PITCH / 2, 0), scale: Vector3.create(0.03, PITCH, HALF_T * 2 + 0.02) })
        MeshRenderer.setBox(e)
        Material.setPbrMaterial(e, { albedoColor: LINE_COLORS[0], roughness: 0.5, metallic: 0 })
        VisibilityComponent.create(e, { visible: false })
        vLines[r].push(e)
        all.push(e)
      }
    }
    const fills: Entity[][] = []
    for (let r = 0; r < ROWS; r++) {
      fills.push([])
      for (let c = 0; c < COLS; c++) {
        const a = dotLocal(r, c)
        const e = fillBox(root, Vector3.create(a.x + PITCH / 2, a.y - PITCH / 2, 0))
        fills[r].push(e)
        all.push(e)
      }
    }
    return { hLines, vLines, fills, all }
  }
  const pool = new LazyPool<Marks>(() => [buildMarks()], () => root)
  const marks = (): Marks => pool.get()[0]
  const releaseMarks = (): void => {
    if (!pool.live) return
    for (const e of marks().all) engine.removeEntity(e)
    pool.releaseHandled()
  }

  const drawnH: number[][] = []
  for (let r = 0; r <= ROWS; r++) drawnH.push(new Array<number>(COLS).fill(0))
  const drawnV: number[][] = []
  for (let r = 0; r < ROWS; r++) drawnV.push(new Array<number>(COLS + 1).fill(0))
  const owned: number[][] = []
  for (let r = 0; r < ROWS; r++) owned.push(new Array<number>(COLS).fill(-1))
  const selectedScale = Vector3.create(0.07, 0.07, HALF_T * 2 + 0.05)
  const normalScale = Vector3.create(0.045, 0.045, HALF_T * 2 + 0.03)
  let selectedIdx = -1
  selectionListeners.set(root, () => {
    const sel = dotSelection.get(root)
    const idx = sel ? sel.r * (COLS + 1) + sel.c : -1
    if (idx === selectedIdx) return
    if (selectedIdx >= 0) Transform.getMutable(dots[selectedIdx]).scale = normalScale
    if (idx >= 0) Transform.getMutable(dots[idx]).scale = selectedScale
    selectedIdx = idx
  })

  const setLine = (e: Entity, owner: number, visible: boolean): void => {
    VisibilityComponent.getMutable(e).visible = visible
    if (visible) Material.setPbrMaterial(e, { albedoColor: LINE_COLORS[owner] ?? PALETTE.cream, roughness: 0.5, metallic: 0 })
  }

  const reset = (): void => {
    if (pool.live) {
      const m = marks()
      for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) if (drawnH[r][c]) setLine(m.hLines[r][c], 0, false)
      for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS; c++) if (drawnV[r][c]) setLine(m.vLines[r][c], 0, false)
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (owned[r][c] >= 0) VisibilityComponent.getMutable(m.fills[r][c]).visible = false
    }
    for (const row of drawnH) row.fill(0)
    for (const row of drawnV) row.fill(0)
    for (const row of owned) row.fill(-1)
    setSelection(root, null)
  }

  return {
    reset,
    idle() {
      reset()
      releaseMarks()
    },
    update(raw) {
      const { hLines, vLines, fills } = marks()
      const s = raw as DotLinesGameState
      // Lines are neutral in the engine; colour them by whoever drew them is
      // not recorded, so we colour by box ownership only and keep lines dark.
      for (let r = 0; r <= ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const on = s.horizontalLines[r][c] ? 1 : 0
          if (on !== drawnH[r][c]) {
            drawnH[r][c] = on
            setLine(hLines[r][c], 2, on === 1)
          }
        }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c <= COLS; c++) {
          const on = s.verticalLines[r][c] ? 1 : 0
          if (on !== drawnV[r][c]) {
            drawnV[r][c] = on
            setLine(vLines[r][c], 2, on === 1)
          }
        }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const o = s.boxes[r][c].ownerIndex
          const ownerIdx = o === null ? -1 : o
          if (ownerIdx !== owned[r][c]) {
            owned[r][c] = ownerIdx
            const e = fills[r][c]
            VisibilityComponent.getMutable(e).visible = ownerIdx >= 0
            if (ownerIdx >= 0) Material.setPbrMaterial(e, { albedoColor: BOX_TINTS[ownerIdx], roughness: 1, metallic: 0, castShadows: false })
          }
        }
    }
  }
}
