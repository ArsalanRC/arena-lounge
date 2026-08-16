/**
 * Dice Royale duel on a table: five die-face planes in a row on an upright
 * felt board (both faces, so both seats read them), a live scoreboard above
 * (side A total : side B total, turn n/13, rolls left). A tap on the board
 * rolls (the plugin decides whether the tapping player may). Holds and
 * category picks happen in the UI.
 */
import { Entity, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import type { DiceFace } from '../../engine/diceroyale'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box } from './shared'

const BOARD_W = 1.1
const BOARD_H = 0.6
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD_H / 2
const HALF_T = 0.02
const DIE = 0.16
const FELT = Color4.fromHexString('#3a5a3aff')

/** The plugin's duel state as the view needs it. */
export interface DuelView {
  dice: DiceFace[]
  held: boolean[]
  rolled: boolean
  totalA: number
  totalB: number
  turnA: number
  turnB: number
  rollsLeft: number
  side: number
  finished: boolean
}

function dieMaterial(e: Entity, face: DiceFace, held: boolean): void {
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: `images/ui/die-${face}.png` }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    emissiveColor: held ? Color3.create(1, 0.85, 0.3) : Color3.Black(),
    emissiveIntensity: held ? 0.5 : 0
  })
}

export function createDiceRoyaleView(root: Entity, onTap: () => void): View3DHandle {
  box(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD_W, BOARD_H, HALF_T * 2), FELT)
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD_H / 2 + rim / 2, 0), Vector3.create(BOARD_W + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD_W / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD_H + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD_W / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD_H + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD_H / 2 - rim / 2, 0), Vector3.create(BOARD_W, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.26), PALETTE.woodDark)
  const board = engine.addEntity()
  Transform.create(board, { parent: root, position: Vector3.create(0, CENTER_Y + BOARD_H / 2 + 0.22, 0) })
  TextShape.create(board, { text: '', fontSize: 0.7, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 3, height: 0.6 })
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD_W, BOARD_H, HALF_T * 2 + 0.06), 'Roll', () => onTap())

  // five dice, each a thin box so both faces show the sprite
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 5; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(-0.4 + i * 0.2, CENTER_Y, 0), scale: Vector3.create(DIE, DIE, HALF_T * 2 + 0.012) })
      MeshRenderer.setBox(e)
      dieMaterial(e, 1, false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })
  const shown: string[] = ['', '', '', '', '']

  return {
    reset() {
      if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
      shown.fill('')
      TextShape.getMutable(board).text = ''
    },
    idle() {
      pool.release()
    },
    update(raw) {
      const v = raw as { view: DuelView }
      const d = v.view
      const dice = pool.get()
      for (let i = 0; i < 5; i++) {
        const key = `${d.dice[i]}:${d.held[i] ? 1 : 0}:${d.rolled ? 1 : 0}`
        VisibilityComponent.getMutable(dice[i]).visible = d.rolled
        if (key !== shown[i]) {
          shown[i] = key
          dieMaterial(dice[i], d.dice[i], d.held[i])
        }
      }
      TextShape.getMutable(board).text = d.finished ? `${d.totalA} : ${d.totalB}` : `${d.totalA} : ${d.totalB}   ·   ${d.side === 1 ? 'A' : 'B'} turn ${d.side === 1 ? d.turnA : d.turnB}/13   ·   ${d.rollsLeft} rolls left`
    }
  }
}
