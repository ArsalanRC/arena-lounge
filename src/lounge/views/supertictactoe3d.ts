/**
 * Super Tic Tac Toe on a table: upright 9x9 board (nine 3x3 sub-boards behind
 * thick grid lines), a lazy pool of 81 mark planes, a glowing frame that
 * follows the sub-board the next move must be played in, and big X / O
 * plates over sub-boards that are already won. Both faces show the marks.
 */
import { Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import type { SuperTTTGameState } from '../../engine/supertictactoe'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface SuperTTTAction {
  board: number
  cell: number
}

const BOARD = 1.0
const SUB = BOARD / 3
const CELL = SUB / 3
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
export const STTT_COLORS: [Color4, Color4] = [PALETTE.yellow, PALETTE.red]

/** Table-local centre of a cell (board 0..8 row-major, cell 0..8 row-major). */
export function sttCellLocal(board: number, cell: number): Vector3 {
  const bx = board % 3
  const by = Math.floor(board / 3)
  const cx = cell % 3
  const cy = Math.floor(cell / 3)
  const x = -BOARD / 2 + SUB * bx + CELL * (cx + 0.5)
  const y = CENTER_Y + BOARD / 2 - SUB * by - CELL * (cy + 0.5)
  return Vector3.create(x, y, 0)
}

function subCentre(board: number): Vector3 {
  return Vector3.create(-BOARD / 2 + SUB * ((board % 3) + 0.5), CENTER_Y + BOARD / 2 - SUB * (Math.floor(board / 3) + 0.5), 0)
}

function markMaterial(e: Entity, mark: 'X' | 'O', glow: boolean, alpha = 1): void {
  const tint = mark === 'X' ? STTT_COLORS[0] : STTT_COLORS[1]
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: mark === 'X' ? 'images/ui/mark-x.png' : 'images/ui/mark-o.png' }),
    albedoColor: Color4.create(tint.r, tint.g, tint.b, alpha),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(tint.r, tint.g, tint.b) : Color3.Black(),
    emissiveIntensity: glow ? 0.6 : 0
  })
}

export function createSuperTTTView(root: Entity, onAction: (a: SuperTTTAction) => void): View3DHandle {
  // board body + rim + foot
  box(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2), Color4.fromHexString('#e9dcc4ff'))
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + rim / 2, 0), Vector3.create(BOARD + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - rim / 2, 0), Vector3.create(BOARD, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)
  // thick lines between sub-boards, thin lines within (through the board so both faces show them)
  for (const k of [1, 2]) {
    box(root, Vector3.create(-BOARD / 2 + SUB * k, CENTER_Y, 0), Vector3.create(0.028, BOARD, HALF_T * 2 + 0.006), PALETTE.woodDark)
    box(root, Vector3.create(0, CENTER_Y + BOARD / 2 - SUB * k, 0), Vector3.create(BOARD, 0.028, HALF_T * 2 + 0.006), PALETTE.woodDark)
  }
  for (let k = 1; k < 9; k++) {
    if (k % 3 === 0) continue
    box(root, Vector3.create(-BOARD / 2 + CELL * k, CENTER_Y, 0), Vector3.create(0.008, BOARD, HALF_T * 2 + 0.004), Color4.fromHexString('#8c7b62ff'))
    box(root, Vector3.create(0, CENTER_Y + BOARD / 2 - CELL * k, 0), Vector3.create(BOARD, 0.008, HALF_T * 2 + 0.004), Color4.fromHexString('#8c7b62ff'))
  }
  // active-board frame (glowing), hidden between rounds
  const frame = engine.addEntity()
  Transform.create(frame, { parent: root, position: subCentre(4), scale: Vector3.create(SUB, SUB, HALF_T * 2 + 0.002) })
  MeshRenderer.setBox(frame)
  Material.setPbrMaterial(frame, { albedoColor: Color4.create(1, 1, 0.6, 0.35), transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND, emissiveColor: Color3.create(1, 0.9, 0.4), emissiveIntensity: 0.4, roughness: 1, metallic: 0, castShadows: false })
  VisibilityComponent.create(frame, { visible: false })

  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Place your mark', (local) => {
    const col = clampInt((local.x + BOARD / 2) / CELL, 0, 8)
    const row = clampInt((CENTER_Y + BOARD / 2 - local.y) / CELL, 0, 8)
    onAction({ board: Math.floor(row / 3) * 3 + Math.floor(col / 3), cell: (row % 3) * 3 + (col % 3) })
  })

  // 81 small marks + 9 big plates for won sub-boards, built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 90; i++) {
      const e = engine.addEntity()
      const big = i >= 81
      const size = big ? SUB * 0.8 : CELL * 0.72
      Transform.create(e, { parent: root, position: big ? subCentre(i - 81) : sttCellLocal(Math.floor(i / 9), i % 9), scale: Vector3.create(size, size, HALF_T * 2 + (big ? 0.02 : 0.01)) })
      MeshRenderer.setBox(e)
      markMaterial(e, 'X', false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  const rendered: Array<'X' | 'O' | null> = new Array(81).fill(null)
  const renderedMeta: Array<'X' | 'O' | 'drawn' | null> = new Array(9).fill(null)
  let renderedActive: number | null | undefined = undefined

  const reset = (): void => {
    if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
    rendered.fill(null)
    renderedMeta.fill(null)
    renderedActive = undefined
    VisibilityComponent.getMutable(frame).visible = false
  }

  return {
    reset,
    idle() {
      reset()
      pool.release()
    },
    update(raw) {
      const s = raw as SuperTTTGameState
      const marks = pool.get()
      for (let b = 0; b < 9; b++) {
        for (let c = 0; c < 9; c++) {
          const v = s.boards[b][c]
          const i = b * 9 + c
          if (v === rendered[i]) continue
          rendered[i] = v
          const e = marks[i]
          if (v === null) VisibilityComponent.getMutable(e).visible = false
          else {
            markMaterial(e, v, false, s.metaBoard[b] === null ? 1 : 0.55)
            VisibilityComponent.getMutable(e).visible = true
          }
        }
        const m = s.metaBoard[b]
        if (m !== renderedMeta[b]) {
          renderedMeta[b] = m
          const plate = marks[81 + b]
          if (m === 'X' || m === 'O') {
            markMaterial(plate, m, s.metaWinLine !== null && s.metaWinLine.includes(b))
            VisibilityComponent.getMutable(plate).visible = true
          } else VisibilityComponent.getMutable(plate).visible = false
        }
      }
      // active-board frame: shown while the game runs and a specific board is forced
      const active = s.status === 'playing' ? s.activeBoard : null
      if (active !== renderedActive) {
        renderedActive = active
        VisibilityComponent.getMutable(frame).visible = active !== null
        if (active !== null) Transform.getMutable(frame).position = subCentre(active)
      }
    }
  }
}
