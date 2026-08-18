/**
 * Snakes & Ladders on a table: upright 10x10 board texture (numbers, snakes,
 * ladders drawn from the engine's layout), two disc pieces that slide square
 * by square, a die readout above the board. A tap on the board rolls.
 */
import { EasingFunction, Entity, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import { ATLAS, spriteBox, type SpriteName } from '../atlas'
import type { SnakesLaddersGameState } from '../../engine/snakesladders'
import { squareToCoords } from '../../engine/snakesladders'
import type { PlayerColor } from '../../engine/types'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box } from './shared'

export type SnakesAction = { roll: number }

const N = 10
const BOARD = 1.0
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
const PIECE = CELL * 0.62

export const SNAKES_COLORS: [PlayerColor, PlayerColor] = ['red', 'blue']
export const SNAKES_SPRITES: [SpriteName, SpriteName] = ['disc-red', 'disc-blue']

/** Table-local centre of a square (0 = off board, below the first row); the two pieces sit side by side. */
export function squareLocal(square: number, side: 0 | 1): Vector3 {
  const dx = side === 0 ? -CELL * 0.2 : CELL * 0.2
  if (square <= 0) return Vector3.create(-BOARD / 2 - 0.08 + dx * 0.5, CENTER_Y - BOARD / 2 + CELL * 0.5, 0)
  const { row, col } = squareToCoords(square)
  return Vector3.create(-BOARD / 2 + CELL * (col + 0.5) + dx, CENTER_Y + BOARD / 2 - CELL * (row + 0.5), 0)
}

function pieceMaterial(e: Entity, side: 0 | 1): void {
  spriteBox(e, SNAKES_SPRITES[side])
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: ATLAS }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.4,
    metallic: 0,
    castShadows: false
  })
}

export function createSnakesView(root: Entity, onTap: () => void): View3DHandle {
  for (const z of [-HALF_T, HALF_T]) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD, BOARD, 1) })
    MeshRenderer.setPlane(e)
    Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/snakes-board.png' }), roughness: 0.9, metallic: 0, castShadows: false })
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
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Roll', () => onTap())

  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 2; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: squareLocal(0, i as 0 | 1), scale: Vector3.create(PIECE, PIECE, HALF_T * 2 + 0.012 + i * 0.004) })
      pieceMaterial(e, i as 0 | 1)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  const lastPos: [number, number] = [-1, -1]

  return {
    reset() {
      if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
      lastPos[0] = -1
      lastPos[1] = -1
      TextShape.getMutable(dice).text = ''
    },
    idle() {
      pool.release()
    },
    update(raw, info) {
      const s = raw as SnakesLaddersGameState
      const pieces = pool.get()
      for (let i = 0; i < 2; i++) {
        const pos = s.positions[SNAKES_COLORS[i]]
        const e = pieces[i]
        VisibilityComponent.getMutable(e).visible = true
        if (pos !== lastPos[i]) {
          const target = squareLocal(pos, i as 0 | 1)
          if (info.animate && lastPos[i] >= 0) {
            const from = Transform.get(e).position
            Tween.setMove(e, Vector3.create(from.x, from.y, from.z), target, 500, EasingFunction.EF_EASEOUTQUAD)
          } else {
            Tween.deleteFrom(e)
            Transform.getMutable(e).position = target
          }
          lastPos[i] = pos
        }
      }
      const who = s.players[s.currentPlayerIndex]?.color ?? ''
      TextShape.getMutable(dice).text = s.status === 'finished' ? '' : s.hasRolled && s.currentDiceValue ? `${who} rolled ${s.currentDiceValue}` : `${who} to roll`
    }
  }
}
