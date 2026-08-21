/**
 * Reversi on a table: upright double-sided felt board with an 8x8 grid
 * texture, 64 pooled sprite discs (dark / light) and per-cell colliders so
 * desktop players can click a square. Seat B sees the board mirrored (they
 * stand behind it), which the UI mirrors as well.
 */
import { Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { spriteBox, spriteTexture } from '../atlas'
import type { ReversiGameState } from '../../engine/reversi'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface ReversiAction {
  r: number
  c: number
}

const N = 8
const BOARD = 1.0
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
const DISC = CELL * 0.8

function cellLocal(r: number, c: number): Vector3 {
  return Vector3.create(-BOARD / 2 + CELL * (c + 0.5), CENTER_Y + BOARD / 2 - CELL * (r + 0.5), 0)
}

function boardPlane(parent: Entity, z: number): void {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD, BOARD, 1) })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/reversi-board.png' }), roughness: 0.95, metallic: 0, castShadows: false })
}

function discMaterial(e: Entity, v: number, glow: boolean): void {
  const s3d = v === 1 ? 'disc-dark' : 'disc-light'
  spriteBox(e, s3d)
  Material.setPbrMaterial(e, {
    texture: spriteTexture(s3d),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.4,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? { r: 0.6, g: 0.9, b: 1 } : { r: 0, g: 0, b: 0 },
    emissiveIntensity: glow ? 0.6 : 0
  })
}

export function createReversiView(root: Entity, onAction: (a: ReversiAction) => void): View3DHandle {
  boardPlane(root, -HALF_T)
  boardPlane(root, HALF_T)
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + rim / 2, 0), Vector3.create(BOARD + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - rim / 2, 0), Vector3.create(BOARD, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)

  // one thin box per cell: the alpha-tested disc sprite shows on the front
  // and back faces (the felt planes are opaque, so nothing shows *through*
  // the board), and the sides are transparent. One entity instead of two.
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const e = engine.addEntity()
        Transform.create(e, { parent: root, position: cellLocal(r, c), scale: Vector3.create(DISC, DISC, HALF_T * 2 + 0.008) })
        discMaterial(e, 1, false)
        VisibilityComponent.create(e, { visible: false })
        out.push(e)
      }
    return out
  })
  // one click area for the whole board; the hit point picks the square
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Place disc', (local) => {
    const c = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const r = clampInt((CENTER_Y + BOARD / 2 - local.y) / CELL, 0, N - 1)
    onAction({ r, c })
  })

  const rendered = new Array<number>(N * N).fill(0)
  let lastIdx = -1

  const setCell = (i: number, v: number, glow: boolean): void => {
    const e = pool.get()[i]
    if (v === 0) VisibilityComponent.getMutable(e).visible = false
    else {
      discMaterial(e, v, glow)
      VisibilityComponent.getMutable(e).visible = true
    }
  }

  const reset = (): void => {
    if (pool.live) for (let i = 0; i < N * N; i++) if (rendered[i] !== 0) setCell(i, 0, false)
    rendered.fill(0)
    lastIdx = -1
  }

  return {
    reset,
    idle() {
      reset()
      pool.release()
    },
    update(raw) {
      const s = raw as ReversiGameState
      const newLast = s.lastMove ? s.lastMove.r * N + s.lastMove.c : -1
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          const i = r * N + c
          const cell = s.board[r][c]
          const v = cell === 'black' ? 1 : cell === 'white' ? 2 : 0
          const glow = i === newLast
          if (v !== rendered[i] || (glow && i !== lastIdx) || (!glow && i === lastIdx)) {
            rendered[i] = v
            setCell(i, v, glow)
          }
        }
      lastIdx = newLast
    }
  }
}
