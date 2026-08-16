/**
 * Match Pairs on a table: a 4x4 grid of card boxes on an upright board.
 * Face-down cards are plain; a revealed card shows its symbol (a tinted
 * shape sprite) on both faces through the alpha-tested box trick. Claimed
 * pairs stay revealed and take their owner's tint on the card body.
 */
import { Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { SYMBOL_POOL, type MatchPairsGameState } from '../../engine/matchpairs'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface PairsAction {
  flip?: number
  resolve?: true
}

export const ROWS = 4
export const COLS = 4
const BOARD = 1.0
const CELL = BOARD / COLS
const CENTER_Y = TABLE_TOP_Y + 0.08 + BOARD / 2
const HALF_T = 0.02

/** Symbol i (0..7): shape = i % 4, colour = i < 4 ? warm : cool. */
export const SHAPE_SPRITES = ['images/ui/disc.png', 'images/ui/pixel.png', 'images/ui/mark-o.png', 'images/ui/mark-x.png']
export const SYMBOL_TINTS: [Color4, Color4] = [PALETTE.yellow, Color4.fromHexString('#3fc1d9ff')]
export const OWNER_TINTS: [Color4, Color4] = [Color4.fromHexString('#f2d98cff'), Color4.fromHexString('#e8a29aff')]
const CARD_BACK = Color4.fromHexString('#2f4858ff')

export function symbolSprite(sym: number): string {
  return SHAPE_SPRITES[sym % 4]
}
export function symbolTint(sym: number): Color4 {
  return SYMBOL_TINTS[sym < 4 ? 0 : 1]
}

function cellLocal(i: number): Vector3 {
  const r = Math.floor(i / COLS)
  const c = i % COLS
  return Vector3.create(-BOARD / 2 + CELL * (c + 0.5), CENTER_Y + BOARD / 2 - CELL * (r + 0.5), 0)
}

export function createMatchPairsView(root: Entity, onAction: (a: PairsAction) => void): View3DHandle {
  box(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD + 0.06, BOARD + 0.06, HALF_T * 2), PALETTE.cream)
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + 0.03 + rim / 2, 0), Vector3.create(BOARD + 0.06 + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-(BOARD + 0.06) / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create((BOARD + 0.06) / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + 0.06 + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - 0.03 - rim / 2, 0), Vector3.create(BOARD + 0.06, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)

  // card bodies + symbol overlays
  const bodies: Entity[] = []
  const symbols: Entity[] = []
  for (let i = 0; i < ROWS * COLS; i++) {
    const at = cellLocal(i)
    const body = engine.addEntity()
    Transform.create(body, { parent: root, position: at, scale: Vector3.create(CELL * 0.86, CELL * 0.86, HALF_T * 2 + 0.006) })
    MeshRenderer.setBox(body)
    Material.setPbrMaterial(body, { albedoColor: CARD_BACK, roughness: 0.6, metallic: 0.05 })
    bodies.push(body)
    const sym = engine.addEntity()
    Transform.create(sym, { parent: root, position: at, scale: Vector3.create(CELL * 0.6, CELL * 0.6, HALF_T * 2 + 0.014) })
    MeshRenderer.setBox(sym)
    Material.setPbrMaterial(sym, {
      texture: Material.Texture.Common({ src: SHAPE_SPRITES[0] }),
      albedoColor: SYMBOL_TINTS[0],
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
      alphaTest: 0.5,
      roughness: 0.5,
      metallic: 0,
      castShadows: false
    })
    VisibilityComponent.create(sym, { visible: false })
    symbols.push(sym)
  }
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Flip a card', (local) => {
    const c = clampInt((local.x + BOARD / 2) / CELL, 0, COLS - 1)
    const r = clampInt((CENTER_Y + BOARD / 2 - local.y) / CELL, 0, ROWS - 1)
    onAction({ flip: r * COLS + c })
  })

  // rendered cache: 0 hidden, 1 face-up, 2 matched by A, 3 matched by B
  const shown = new Array<number>(ROWS * COLS).fill(0)
  const shownSym = new Array<number>(ROWS * COLS).fill(-1)

  const setCard = (i: number, mode: number, sym: number): void => {
    if (mode === shown[i] && sym === shownSym[i]) return
    shown[i] = mode
    shownSym[i] = sym
    const bodyColor = mode === 2 ? OWNER_TINTS[0] : mode === 3 ? OWNER_TINTS[1] : mode === 1 ? PALETTE.cream : CARD_BACK
    Material.setPbrMaterial(bodies[i], { albedoColor: bodyColor, roughness: 0.6, metallic: 0.05 })
    VisibilityComponent.getMutable(symbols[i]).visible = mode !== 0
    if (mode !== 0)
      Material.setPbrMaterial(symbols[i], {
        texture: Material.Texture.Common({ src: symbolSprite(sym) }),
        albedoColor: symbolTint(sym),
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
        alphaTest: 0.5,
        roughness: 0.5,
        metallic: 0,
        castShadows: false
      })
  }

  return {
    reset() {
      for (let i = 0; i < ROWS * COLS; i++) setCard(i, 0, -1)
    },
    update(raw) {
      const s = raw as MatchPairsGameState
      for (let i = 0; i < s.cards.length && i < ROWS * COLS; i++) {
        const card = s.cards[i]
        const sym = symbolIndex(card.symbol)
        const mode = card.matched ? (card.matchedBy === 'B' ? 3 : 2) : card.flipped ? 1 : 0
        setCard(i, mode, sym)
      }
    }
  }
}

/** Index of an engine symbol glyph in the pool (the deck uses the first 8). */
export function symbolIndex(symbol: string): number {
  const i = SYMBOL_POOL.indexOf(symbol)
  return i < 0 ? 0 : i
}
