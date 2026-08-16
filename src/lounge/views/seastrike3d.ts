/**
 * Sea Strike on a table: an upright board with the two tracking grids side by
 * side (left: red's shots at blue's fleet, right: blue's shots at red's), the
 * same on both faces (the back is mirrored). Shots are public information,
 * unshot ships are not, so the board only ever shows hits, misses and sunk
 * cells: one lazy pool of marker planes per grid and face. A tap on a grid
 * fires at that cell of that grid; the plugin checks whose grid it is.
 */
import { Entity, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import type { CellState, SeaStrikeGameState } from '../../engine/seastrike'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface SeaAction {
  fire: number
}

const N = 10
const GRID = 0.84
const CELL = GRID / N
const GAP = 0.1
const BOARD_W = GRID * 2 + GAP + 0.06
const BOARD_H = GRID + 0.16
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD_H / 2
const GRID_Y = CENTER_Y - 0.05
const HALF_T = 0.02
export const SEA_COLORS: [Color4, Color4] = [Color4.fromHexString('#e2453dff'), Color4.fromHexString('#3a7bd5ff')]

const HIT = Color4.fromHexString('#ff5a4dff')
const MISS = Color4.fromHexString('#cfe3ffff')
const SUNK = Color4.fromHexString('#7a1f18ff')

/** Grid centre x on the front face (grid 0 left, grid 1 right); the back face mirrors. */
function gridX(grid: 0 | 1, face: 0 | 1): number {
  const x = grid === 0 ? -(GRID / 2 + GAP / 2) : GRID / 2 + GAP / 2
  return face === 0 ? x : -x
}

/** Table-local centre of a cell of `grid` as seen on `face`. */
export function seaCellLocal(grid: 0 | 1, cell: number, face: 0 | 1): Vector3 {
  const row = Math.floor(cell / N)
  const col = cell % N
  const dx = -GRID / 2 + CELL * (col + 0.5)
  const x = gridX(grid, face) + (face === 0 ? dx : -dx)
  return Vector3.create(x, GRID_Y + GRID / 2 - CELL * (row + 0.5), face === 0 ? -HALF_T - 0.004 : HALF_T + 0.004)
}

function markerMaterial(e: Entity, state: CellState): void {
  const c = state === 'hit' ? HIT : state === 'sunk' ? SUNK : MISS
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: state === 'miss' ? 'images/ui/disc.png' : 'images/ui/ring.png' }),
    albedoColor: c,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    emissiveColor: state === 'miss' ? Color3.Black() : Color3.create(c.r, c.g, c.b),
    emissiveIntensity: state === 'miss' ? 0 : 0.5
  })
}

export function createSeaStrikeView(root: Entity, onTap: (grid: 0 | 1, cell: number) => void): View3DHandle {
  // board body with two water grids and their lines painted as thin boxes
  box(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD_W, BOARD_H, HALF_T * 2), PALETTE.woodDark)
  for (const grid of [0, 1] as const) {
    const gx = gridX(grid, 0)
    // one textured plane per face for the water + grid lines (a plane per grid instead of 18 line boxes)
    for (const face of [0, 1] as const) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(face === 0 ? gx : -gx, GRID_Y, face === 0 ? -HALF_T - 0.002 : HALF_T + 0.002), scale: Vector3.create(GRID, GRID, 1), rotation: Quaternion.fromEulerDegrees(0, face === 0 ? 0 : 180, 0) })
      MeshRenderer.setPlane(e)
      Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/sea-grid.png' }), roughness: 0.6, metallic: 0.1, castShadows: false })
    }
    // colour tab above each grid: whose shots these are
    box(root, Vector3.create(gx, GRID_Y + GRID / 2 + 0.06, 0), Vector3.create(GRID * 0.5, 0.05, HALF_T * 2 + 0.006), SEA_COLORS[grid])
  }
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.26), PALETTE.woodDark)
  const label = engine.addEntity()
  Transform.create(label, { parent: root, position: Vector3.create(0, CENTER_Y + BOARD_H / 2 + 0.16, 0) })
  TextShape.create(label, { text: '', fontSize: 1.0, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 3, height: 0.5 })

  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD_W, BOARD_H, HALF_T * 2 + 0.06), 'Fire', (local) => {
    const face: 0 | 1 = local.z <= 0 ? 0 : 1
    const xf = face === 0 ? local.x : -local.x // undo the mirror of the back face
    const grid: 0 | 1 = xf < 0 ? 0 : 1
    const gx = gridX(grid, 0)
    const col = clampInt((xf - gx + GRID / 2) / CELL, 0, N - 1)
    const row = clampInt((GRID_Y + GRID / 2 - local.y) / CELL, 0, N - 1)
    onTap(grid, row * N + col)
  })

  // markers: 100 per grid per face, built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 4 * N * N; i++) {
      const grid = (Math.floor(i / (N * N)) % 2) as 0 | 1
      const face = (i < 2 * N * N ? 0 : 1) as 0 | 1
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: seaCellLocal(grid, i % (N * N), face), scale: Vector3.create(CELL * 0.7, CELL * 0.7, 1) })
      MeshRenderer.setPlane(e)
      markerMaterial(e, 'miss')
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  const shown: CellState[] = new Array(4 * N * N).fill('empty')

  const reset = (): void => {
    if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
    shown.fill('empty')
    TextShape.getMutable(label).text = ''
  }
  return {
    reset,
    idle() {
      reset()
      pool.release()
    },
    update(raw) {
      const s = raw as SeaStrikeGameState
      const markers = pool.get()
      // grid 0 = red's shots = the state of blue's board (index 1); grid 1 = blue's shots = red's board (index 0)
      for (let face = 0; face < 2; face++) {
        for (let grid = 0; grid < 2; grid++) {
          const board = s.boards[grid === 0 ? 1 : 0]
          for (let cell = 0; cell < N * N; cell++) {
            const st = board.grid[cell]
            const publicState: CellState = st === 'hit' || st === 'miss' || st === 'sunk' ? st : 'empty'
            const idx = face * 2 * N * N + grid * N * N + cell
            if (publicState === shown[idx]) continue
            shown[idx] = publicState
            const e = markers[idx]
            if (publicState === 'empty') VisibilityComponent.getMutable(e).visible = false
            else {
              markerMaterial(e, publicState)
              VisibilityComponent.getMutable(e).visible = true
            }
          }
        }
      }
      const who = s.status === 'finished' ? '' : s.currentPlayerIndex === 0 ? 'red' : 'blue'
      TextShape.getMutable(label).text = who ? `${who} to fire` : ''
    }
  }
}
