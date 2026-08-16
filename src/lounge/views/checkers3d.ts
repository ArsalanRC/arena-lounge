/**
 * Checkers on a table: upright checkerboard (texture) with a pool of 24 piece
 * boxes that slide between squares (Tween) as moves come in. Rank 0 (white's
 * back rank) is at the bottom of the board. Seat B stands behind the board
 * and sees it mirrored; the UI mirrors columns for seat B to match.
 */
import { EasingFunction, Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import type { CheckersGameState, CheckersPiece } from '../../engine/checkers'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface CheckersAction {
  from: number
  to: number
}

const N = 8
const BOARD = 1.0
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
const PIECE = CELL * 0.78

export const PIECE_SPRITES = {
  white: 'images/ui/disc-light.png',
  black: 'images/ui/disc-dark.png',
  whiteKing: 'images/ui/disc-light-king.png',
  blackKing: 'images/ui/disc-dark-king.png'
}

/** Square index -> table-local position (file left to right, rank bottom to top). */
export function squareLocal(sq: number): Vector3 {
  const file = sq % N
  const rank = Math.floor(sq / N)
  return Vector3.create(-BOARD / 2 + CELL * (file + 0.5), CENTER_Y - BOARD / 2 + CELL * (rank + 0.5), 0)
}

function spriteFor(p: CheckersPiece): string {
  return p.color === 'white' ? (p.type === 'king' ? PIECE_SPRITES.whiteKing : PIECE_SPRITES.white) : p.type === 'king' ? PIECE_SPRITES.blackKing : PIECE_SPRITES.black
}

function pieceMaterial(e: Entity, p: CheckersPiece, glow: boolean): void {
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: spriteFor(p) }),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.4,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(0.6, 0.9, 1) : Color3.Black(),
    emissiveIntensity: glow ? 0.6 : 0
  })
}

/** Selection shared by 3D taps and the UI (module-level, per table root). */
export const checkersSelection = new Map<Entity, number>()
export const checkersSelectionListeners = new Map<Entity, () => void>()
export function setCheckersSelection(root: Entity, sq: number | null): void {
  if (sq === null) checkersSelection.delete(root)
  else checkersSelection.set(root, sq)
  checkersSelectionListeners.get(root)?.()
}

export function createCheckersView(root: Entity, onTap: (sq: number) => void): View3DHandle {
  // board: textured planes on both faces + rim + foot
  for (const z of [-HALF_T, HALF_T]) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD, BOARD, 1) })
    MeshRenderer.setPlane(e)
    Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/checkers-board.png' }), roughness: 0.9, metallic: 0, castShadows: false })
  }
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD / 2 + rim / 2, 0), Vector3.create(BOARD + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD + rim * 2, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD / 2 - rim / 2, 0), Vector3.create(BOARD, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD + 0.2, 0.06, 0.26), PALETTE.woodDark)

  // piece pool
  const pool: Entity[] = []
  for (let i = 0; i < 24; i++) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, -5, 0), scale: Vector3.create(PIECE, PIECE, HALF_T * 2 + 0.01) })
    MeshRenderer.setBox(e)
    pieceMaterial(e, { color: 'white', type: 'man' }, false)
    VisibilityComponent.create(e, { visible: false })
    pool.push(e)
  }
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Move a piece', (local) => {
    const file = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const rank = clampInt((local.y - (CENTER_Y - BOARD / 2)) / CELL, 0, N - 1)
    onTap(rank * N + file)
  })

  const entityAt = new Map<number, Entity>()
  const spriteAt = new Map<number, string>()
  const free: Entity[] = [...pool]
  let selectedSq = -1

  const place = (sq: number, e: Entity, p: CheckersPiece, animateFrom: Vector3 | null): void => {
    entityAt.set(sq, e)
    spriteAt.set(sq, spriteFor(p))
    pieceMaterial(e, p, sq === selectedSq)
    VisibilityComponent.getMutable(e).visible = true
    const end = squareLocal(sq)
    if (animateFrom) {
      Transform.getMutable(e).position = animateFrom
      Tween.setMove(e, animateFrom, end, 350, EasingFunction.EF_EASEOUTQUAD)
    } else {
      Tween.deleteFrom(e)
      Transform.getMutable(e).position = end
    }
  }
  const release = (sq: number): void => {
    const e = entityAt.get(sq)
    if (!e) return
    entityAt.delete(sq)
    spriteAt.delete(sq)
    VisibilityComponent.getMutable(e).visible = false
    Tween.deleteFrom(e)
    free.push(e)
  }

  checkersSelectionListeners.set(root, () => {
    const sel = checkersSelection.get(root)
    const next = sel === undefined ? -1 : sel
    if (next === selectedSq) return
    const prev = selectedSq
    selectedSq = next
    for (const sq of [prev, next]) {
      const e = entityAt.get(sq)
      if (e === undefined) continue
      // re-apply material with/without glow; the piece type comes from the sprite we placed
      const spr = spriteAt.get(sq) ?? PIECE_SPRITES.white
      const p: CheckersPiece = { color: spr.includes('light') ? 'white' : 'black', type: spr.includes('king') ? 'king' : 'man' }
      pieceMaterial(e, p, sq === selectedSq)
    }
  })

  return {
    reset() {
      for (const sq of Array.from(entityAt.keys())) release(sq)
      setCheckersSelection(root, null)
    },
    update(raw, info) {
      const s = raw as CheckersGameState
      const last = s.lastMove
      // 1) slide the moved piece first so it keeps its entity
      if (info.animate && last && entityAt.has(last.from) && !entityAt.has(last.to) && s.board[last.to]) {
        const e = entityAt.get(last.from) as Entity
        entityAt.delete(last.from)
        spriteAt.delete(last.from)
        place(last.to, e, s.board[last.to] as CheckersPiece, squareLocal(last.from))
      }
      // 2) reconcile every square
      for (let sq = 0; sq < N * N; sq++) {
        const p = s.board[sq]
        const e = entityAt.get(sq)
        if (!p) {
          if (e) release(sq)
          continue
        }
        if (e) {
          if (spriteAt.get(sq) !== spriteFor(p)) place(sq, e, p, null)
          continue
        }
        const fresh = free.pop()
        if (fresh) place(sq, fresh, p, null)
      }
    }
  }
}
