/**
 * Ludo on a table: upright 15x15 board texture with eight disc pieces (four
 * red, four green) that slide between cells as moves come in, a dice readout
 * above the board and a tap map: a tap on a cell picks the nearest own piece
 * (the plugin decides what it means), a tap anywhere while it is time to
 * roll rolls. Seat B looks from behind and sees the mirror image; the UI
 * shows both players the same orientation as the texture (red bottom-left).
 */
import { EasingFunction, Entity, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import type { LudoGameState } from '../../engine/ludo'
import { positionToXY } from '../../engine/ludo'
import type { PlayerColor } from '../../engine/types'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export type LudoAction = { roll: number } | { piece: number } | { skip: true }

const N = 15
const BOARD = 1.0
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
const PIECE = CELL * 0.9

export const LUDO_COLORS: [PlayerColor, PlayerColor] = ['red', 'green']
export const LUDO_SPRITES: [string, string] = ['images/ui/disc-red.png', 'images/ui/disc-green.png']

/** Table-local centre of a board cell (row 0 at the top). */
export function cellLocal(row: number, col: number, jitter = 0): Vector3 {
  return Vector3.create(-BOARD / 2 + CELL * (col + 0.5) + jitter, CENTER_Y + BOARD / 2 - CELL * (row + 0.5) - jitter, 0)
}

function pieceMaterial(e: Entity, color: PlayerColor, glow: boolean): void {
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: color === 'red' ? LUDO_SPRITES[0] : LUDO_SPRITES[1] }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.4,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(1, 1, 1) : Color3.Black(),
    emissiveIntensity: glow ? 0.18 : 0
  })
}

export function createLudoView(root: Entity, onTap: (row: number, col: number) => void): View3DHandle {
  for (const z of [-HALF_T, HALF_T]) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD, BOARD, 1) })
    MeshRenderer.setPlane(e)
    Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/ludo-board.png' }), roughness: 0.9, metallic: 0, castShadows: false })
  }
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + rim / 2, 0), Vector3.create(BOARD + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - rim / 2, 0), Vector3.create(BOARD, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)

  const dice = engine.addEntity()
  Transform.create(dice, { parent: root, position: Vector3.create(0, CENTER_Y + BOARD / 2 + 0.16, 0) })
  TextShape.create(dice, { text: '', fontSize: 1.1, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 3, height: 0.5 })

  // eight pieces: index = colourIndex * 4 + pieceIndex; built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 8; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(0, -5, 0), scale: Vector3.create(PIECE, PIECE, HALF_T * 2 + 0.012 + (i % 4) * 0.002) })
      MeshRenderer.setBox(e)
      pieceMaterial(e, LUDO_COLORS[Math.floor(i / 4)], false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Roll / move', (local) => {
    const col = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const row = clampInt((CENTER_Y + BOARD / 2 - local.y) / CELL, 0, N - 1)
    onTap(row, col)
  })

  const lastPos = new Map<number, number>() // piece entity index -> relative position
  return {
    reset() {
      if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
      lastPos.clear()
      TextShape.getMutable(dice).text = ''
    },
    idle() {
      lastPos.clear()
      pool.release()
    },
    update(raw, info) {
      const pieces = pool.get()
      const s = raw as LudoGameState
      const movable = new Set(s.turnPhase === 'move' ? s.validMoves.map((m) => `${m.color}:${m.pieceIndex}`) : [])
      for (let ci = 0; ci < 2; ci++) {
        const color = LUDO_COLORS[ci]
        const positions = s.board.pieces[color]
        for (let pi = 0; pi < 4; pi++) {
          const idx = ci * 4 + pi
          const e = pieces[idx]
          const pos = positions[pi]
          const { row, col } = positionToXY(pos, color, pi)
          // pieces sharing a cell fan out a little
          const sharing = positions.filter((p, j) => p === pos && j < pi && pos >= 0).length
          const target = cellLocal(row, col, sharing * 0.012)
          const prev = lastPos.get(idx)
          VisibilityComponent.getMutable(e).visible = true
          pieceMaterial(e, color, movable.has(`${color}:${pi}`))
          if (info.animate && prev !== undefined && prev !== pos) {
            const from = Transform.get(e).position
            Tween.setMove(e, Vector3.create(from.x, from.y, from.z), target, 400, EasingFunction.EF_EASEOUTQUAD)
          } else {
            Tween.deleteFrom(e)
            Transform.getMutable(e).position = target
          }
          lastPos.set(idx, pos)
        }
      }
      const who = s.players[s.currentPlayerIndex]?.color ?? ''
      TextShape.getMutable(dice).text = s.status === 'finished' ? '' : s.hasRolled && s.currentDiceValue ? `${who} rolled ${s.currentDiceValue}` : `${who} to roll`
    }
  }
}
