/**
 * Tic Tac Toe on a table: a small upright cream board with a painted grid
 * and one pooled thin box per cell whose alpha-tested texture switches
 * between the X and O sprites. Visible from both sides.
 */
import { Entity, Material, MaterialTransparencyMode, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import { spriteBox, spriteTexture } from '../atlas'
import type { TTTGameState } from '../../engine/tictactoe'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface TTTAction {
  cell: number
}

const N = 3
const BOARD = 0.9
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.08 + BOARD / 2
const HALF_T = 0.02
export const TTT_COLORS: [Color4, Color4] = [PALETTE.yellow, PALETTE.red]

function cellLocal(i: number): Vector3 {
  const r = Math.floor(i / N)
  const c = i % N
  return Vector3.create(-BOARD / 2 + CELL * (c + 0.5), CENTER_Y + BOARD / 2 - CELL * (r + 0.5), 0)
}

function markMaterial(e: Entity, mark: 'X' | 'O', glow: boolean): void {
  const tint = mark === 'X' ? TTT_COLORS[0] : TTT_COLORS[1]
  const s3d = mark === 'X' ? 'mark-x' : 'mark-o'
  spriteBox(e, s3d)
  Material.setPbrMaterial(e, {
    texture: spriteTexture(s3d),
    albedoColor: tint,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(tint.r, tint.g, tint.b) : Color3.Black(),
    emissiveIntensity: glow ? 0.6 : 0
  })
}

export function createTicTacToeView(root: Entity, onAction: (a: TTTAction) => void): View3DHandle {
  // board body + rim + foot
  box(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD + 0.06, BOARD + 0.06, HALF_T * 2), PALETTE.cream)
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + 0.03 + rim / 2, 0), Vector3.create(BOARD + 0.06 + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-(BOARD + 0.06) / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create((BOARD + 0.06) / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - 0.03 - rim / 2, 0), Vector3.create(BOARD + 0.06, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)
  // grid lines (through the board so both faces show them)
  for (const k of [1, 2]) {
    box(root, Vector3.create(-BOARD / 2 + CELL * k, CENTER_Y, 0), Vector3.create(0.03, BOARD, HALF_T * 2 + 0.006), PALETTE.woodDark)
    box(root, Vector3.create(0, CENTER_Y + BOARD / 2 - CELL * k, 0), Vector3.create(BOARD, 0.03, HALF_T * 2 + 0.006), PALETTE.woodDark)
  }
  // marks, built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < N * N; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: cellLocal(i), scale: Vector3.create(CELL * 0.72, CELL * 0.72, HALF_T * 2 + 0.01) })
      markMaterial(e, 'X', false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Place your mark', (local) => {
    const c = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const r = clampInt((CENTER_Y + BOARD / 2 - local.y) / CELL, 0, N - 1)
    onAction({ cell: r * N + c })
  })

  const rendered: Array<'X' | 'O' | null> = new Array(N * N).fill(null)
  let winKey = ''

  const reset = (): void => {
    if (pool.live) {
      const marks = pool.get()
      for (let i = 0; i < N * N; i++) if (rendered[i] !== null) VisibilityComponent.getMutable(marks[i]).visible = false
    }
    rendered.fill(null)
    winKey = ''
  }

  return {
    reset,
    idle() {
      reset()
      pool.release()
    },
    update(raw) {
      const marks = pool.get()
      const s = raw as TTTGameState
      const win = new Set(s.winLine ?? [])
      const key = (s.winLine ?? []).join(',')
      const winChanged = key !== winKey
      for (let i = 0; i < N * N; i++) {
        const v = s.board[i]
        if (v === rendered[i] && !(winChanged && (win.has(i) || winKey.split(',').includes(String(i))))) continue
        rendered[i] = v
        if (v === null) VisibilityComponent.getMutable(marks[i]).visible = false
        else {
          markMaterial(marks[i], v, win.has(i))
          VisibilityComponent.getMutable(marks[i]).visible = true
        }
      }
      winKey = key
    }
  }
}
