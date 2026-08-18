/**
 * Ludo on a table: the 15x15 board texture lies flat on the table top so up
 * to four players (one per side of the square table) look down at it, with
 * up to sixteen disc pieces that slide between cells as moves come in, a
 * floating dice readout above the centre and a tap map: a tap on a cell picks
 * the nearest own piece (the plugin decides what it means), a tap anywhere
 * while it is time to roll rolls. Row 0 of the texture is the far edge as
 * seen from seat A (in front of the table); the phone / desktop UI shows the
 * same orientation for everyone.
 */
import { Billboard, BillboardMode, EasingFunction, Entity, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ATLAS, spriteBox, type SpriteName } from '../atlas'
import type { LudoGameState } from '../../engine/ludo'
import { positionToXY } from '../../engine/ludo'
import type { PlayerColor } from '../../engine/types'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export type LudoAction = { roll: number } | { piece: number } | { skip: true }

const N = 15
const BOARD = 1.08
const CELL = BOARD / N
const BOARD_Y = TABLE_TOP_Y + 0.008
const PIECE = CELL * 0.86
const PIECE_H = 0.022

/** Lounge side order: side 1 red, 2 green (opposite), 3 blue, 4 yellow. */
export const LUDO_COLORS: PlayerColor[] = ['red', 'green', 'blue', 'yellow']
export const LUDO_SPRITES: SpriteName[] = ['disc-red', 'disc-green', 'disc-blue', 'disc-yellow']

/** Table-local centre of a board cell (row 0 at the far edge from seat A, col 0 on its left). */
export function cellLocal(row: number, col: number, jitter = 0): Vector3 {
  return Vector3.create(-BOARD / 2 + CELL * (col + 0.5) + jitter, BOARD_Y + PIECE_H / 2, BOARD / 2 - CELL * (row + 0.5) - jitter)
}

function pieceMaterial(e: Entity, color: PlayerColor, glow: boolean): void {
  spriteBox(e, LUDO_SPRITES[LUDO_COLORS.indexOf(color)])
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: ATLAS }),
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
  // the board: a plane lying on the table (a plane faces -z; tilted 90 degrees it faces up)
  const board = engine.addEntity()
  Transform.create(board, { parent: root, position: Vector3.create(0, BOARD_Y, 0), rotation: Quaternion.fromEulerDegrees(90, 0, 0), scale: Vector3.create(BOARD, BOARD, 1) })
  MeshRenderer.setPlane(board)
  Material.setPbrMaterial(board, { texture: Material.Texture.Common({ src: 'images/ludo-board.png' }), roughness: 0.9, metallic: 0, castShadows: false })
  const rim = 0.04
  const rimH = 0.03
  box(root, Vector3.create(0, TABLE_TOP_Y + rimH / 2, BOARD / 2 + rim / 2), Vector3.create(BOARD + rim * 2, rimH, rim), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + rimH / 2, -BOARD / 2 - rim / 2), Vector3.create(BOARD + rim * 2, rimH, rim), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD / 2 - rim / 2, TABLE_TOP_Y + rimH / 2, 0), Vector3.create(rim, rimH, BOARD), PALETTE.woodDark)
  box(root, Vector3.create(BOARD / 2 + rim / 2, TABLE_TOP_Y + rimH / 2, 0), Vector3.create(rim, rimH, BOARD), PALETTE.woodDark)

  const dice = engine.addEntity()
  Transform.create(dice, { parent: root, position: Vector3.create(0, TABLE_TOP_Y + 0.42, 0) })
  TextShape.create(dice, { text: '', fontSize: 1.0, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 3, height: 0.5 })
  Billboard.create(dice, { billboardMode: BillboardMode.BM_Y })

  // up to sixteen pieces: index = colourIndex * 4 + pieceIndex; built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 16; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(0, -5, 0), scale: Vector3.create(PIECE, PIECE_H + (i % 4) * 0.002, PIECE) })
      pieceMaterial(e, LUDO_COLORS[Math.floor(i / 4)], false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  boardHitArea(root, Vector3.create(0, BOARD_Y + 0.03, 0), Vector3.create(BOARD, 0.06, BOARD), 'Roll / move', (local) => {
    const col = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const row = clampInt((BOARD / 2 - local.z) / CELL, 0, N - 1)
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
      const inPlay = new Set(s.players.map((p) => p.color))
      const movable = new Set(s.turnPhase === 'move' ? s.validMoves.map((m) => `${m.color}:${m.pieceIndex}`) : [])
      for (let ci = 0; ci < LUDO_COLORS.length; ci++) {
        const color = LUDO_COLORS[ci]
        const positions = s.board.pieces[color]
        for (let pi = 0; pi < 4; pi++) {
          const idx = ci * 4 + pi
          const e = pieces[idx]
          if (!inPlay.has(color)) {
            VisibilityComponent.getMutable(e).visible = false
            continue
          }
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
      TextShape.getMutable(dice).text = s.status === 'finished' || s.finishOrder.length > 0 ? '' : s.hasRolled && s.currentDiceValue ? `${who} rolled ${s.currentDiceValue}` : `${who} to roll`
    }
  }
}
