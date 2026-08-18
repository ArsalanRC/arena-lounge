/**
 * Four in a Row on a table: upright frame made of two alpha-tested planes
 * (holes are see-through, like the real toy), a rim, 42 pooled sprite-plane
 * discs with a drop tween, invisible per-column colliders for desktop clicks.
 *
 * Geometry is authored in table-local metres on top of the shared table
 * (see table3d.ts for TABLE_TOP_Y); the frame stands on the table top.
 */
import { EasingFunction, Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { ATLAS, spritePlane } from '../atlas'
import { COLS, ROWS, type ConnectFourGameState } from '../../engine/connectfour'
import { EMISSIVE_RED, EMISSIVE_YELLOW, PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

const BOARD_W = 1.2
const BOARD_H = 1.04
export const C4_BOARD_CENTER_Y = TABLE_TOP_Y + 0.05 + BOARD_H / 2
const CELL_PITCH = 0.16
const HALF_GAP = 0.035 // planes sit at z = ±HALF_GAP
const DISC_R = 0.132 // disc diameter in metres (sprite plane)
const BOARD_TOP = C4_BOARD_CENTER_Y + BOARD_H / 2
const CELL_COUNT = ROWS * COLS

export interface C4Action {
  col: number
}

function cellLocalPosition(row: number, col: number): Vector3 {
  const x = -BOARD_W / 2 + CELL_PITCH * (0.75 + col)
  const y = BOARD_TOP - CELL_PITCH * (0.75 + row)
  return Vector3.create(x, y, 0)
}

function boardPlane(parent: Entity, z: number): void {
  const e = engine.addEntity()
  Transform.create(e, {
    parent,
    position: Vector3.create(0, C4_BOARD_CENTER_Y, z),
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
function applyDiscMaterial(e: Entity, v: number, glow: boolean): void {
  spritePlane(e, v === 1 ? 'disc-yellow' : 'disc-red')
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: ATLAS }),
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

function makeDisc(parent: Entity): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, -5, 0), scale: Vector3.create(DISC_R, DISC_R, 1) })
  applyDiscMaterial(e, 1, false)
  VisibilityComponent.create(e, { visible: false })
  return e
}

function cellValue(state: ConnectFourGameState, row: number, col: number): number {
  const v = state.board[row][col]
  return v === 'yellow' ? 1 : v === 'red' ? 2 : 0
}

export function createConnectFourView(root: Entity, onAction: (a: C4Action) => void): View3DHandle {
  // frame: two see-through planes, a rim, a foot and a shelf
  boardPlane(root, -HALF_GAP)
  boardPlane(root, HALF_GAP)
  const rimT = 0.05
  const rimD = HALF_GAP * 2 + 0.01
  box(root, Vector3.create(0, BOARD_TOP + rimT / 2, 0), Vector3.create(BOARD_W + rimT * 2, rimT, rimD), PALETTE.frameDark)
  box(root, Vector3.create(-BOARD_W / 2 - rimT / 2, C4_BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(BOARD_W / 2 + rimT / 2, C4_BOARD_CENTER_Y, 0), Vector3.create(rimT, BOARD_H + rimT * 2, rimD), PALETTE.frameDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.26), PALETTE.frameDark)
  box(root, Vector3.create(0, C4_BOARD_CENTER_Y - BOARD_H / 2 - 0.01, 0), Vector3.create(BOARD_W + 0.05, 0.02, rimD), PALETTE.frameDark)

  // discs exist only while a round runs (see LazyPool)
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < CELL_COUNT; i++) out.push(makeDisc(root))
    return out
  })
  // one click area for the whole frame; the hit x picks the column
  boardHitArea(root, Vector3.create(0, C4_BOARD_CENTER_Y, 0), Vector3.create(BOARD_W, BOARD_H, 0.16), 'Drop here', (local) => {
    onAction({ col: clampInt((local.x + BOARD_W / 2 - CELL_PITCH * 0.25) / CELL_PITCH, 0, COLS - 1) })
  })

  const rendered = new Array<number>(CELL_COUNT).fill(0)
  let renderedWinKey = ''

  const hideAll = () => {
    if (pool.live) {
      const discs = pool.get()
      for (let i = 0; i < CELL_COUNT; i++) {
        if (rendered[i] !== 0) {
          VisibilityComponent.getMutable(discs[i]).visible = false
          Tween.deleteFrom(discs[i])
        }
      }
    }
    rendered.fill(0)
    renderedWinKey = ''
  }

  return {
    reset: hideAll,
    idle() {
      hideAll()
      pool.release()
    },
    update(raw, info) {
      const discs = pool.get()
      const state = raw as ConnectFourGameState
      const last = info.lastAction as C4Action | null
      const lastRow = state.lastMove?.row ?? -1
      const lastCol = last?.col ?? state.lastMove?.column ?? -1
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c
          const v = cellValue(state, r, c)
          if (v === rendered[i]) continue
          rendered[i] = v
          const disc = discs[i]
          if (v === 0) {
            VisibilityComponent.getMutable(disc).visible = false
            Tween.deleteFrom(disc)
            continue
          }
          applyDiscMaterial(disc, v, false)
          VisibilityComponent.getMutable(disc).visible = true
          const end = cellLocalPosition(r, c)
          if (info.animate && r === lastRow && c === lastCol) {
            const start = Vector3.create(end.x, BOARD_TOP + 0.25, 0)
            Transform.getMutable(disc).position = start
            Tween.setMove(disc, start, end, 380, EasingFunction.EF_EASEOUTBOUNCE)
          } else {
            Tween.deleteFrom(disc)
            Transform.getMutable(disc).position = end
          }
        }
      }
      // winning line glow
      const win = state.winningCells ?? []
      const winKey = win.map(([r, c]) => r * COLS + c).join(',')
      if (winKey !== renderedWinKey) {
        if (renderedWinKey !== '') {
          for (const idx of renderedWinKey.split(',')) {
            const i = Number(idx)
            if (rendered[i] !== 0) applyDiscMaterial(discs[i], rendered[i], false)
          }
        }
        renderedWinKey = winKey
        for (const [r, c] of win) {
          const i = r * COLS + c
          if (rendered[i] !== 0) applyDiscMaterial(discs[i], rendered[i], true)
        }
      }
    }
  }
}

/** Keep the sign above the frame. */
export const C4_SIGN_Y = BOARD_TOP + 0.55
