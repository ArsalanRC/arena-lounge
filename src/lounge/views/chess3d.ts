/**
 * Chess on a table: upright chequered board (the checkers texture, same
 * geometry) with a pool of 32 piece planes that slide between squares
 * (Tween) as moves come in; castling slides the rook too, promotions swap
 * the sprite. Rank 0 (white's back rank) is at the bottom of the board. Seat
 * B stands behind the board and sees it mirrored; the UI mirrors columns for
 * seat B to match.
 */
import { EasingFunction, Entity, Material, MaterialTransparencyMode, MeshRenderer, Transform, Tween, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import { spriteBox, spriteTexture, type SpriteName } from '../atlas'
import type { ChessGameState, ChessPiece } from '../../engine/chess'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, boardHitArea, box, clampInt } from './shared'

export interface ChessAction {
  from: number
  to: number
}

const N = 8
const BOARD = 1.0
const CELL = BOARD / N
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD / 2
const HALF_T = 0.02
const PIECE = CELL * 0.86

/** Atlas sprite of a piece: chess-{w|b}{K|Q|R|B|N|P}. */
export function chessSprite(p: ChessPiece): SpriteName {
  return `chess-${p.color === 'white' ? 'w' : 'b'}${p.type}` as SpriteName
}
export const CHESS_SEAT_SPRITES: [SpriteName, SpriteName] = ['chess-wK', 'chess-bK']

/** Square index -> table-local position (file left to right, rank bottom to top). */
export function chessSquareLocal(sq: number): Vector3 {
  const file = sq % N
  const rank = Math.floor(sq / N)
  return Vector3.create(-BOARD / 2 + CELL * (file + 0.5), CENTER_Y - BOARD / 2 + CELL * (rank + 0.5), 0)
}

function pieceMaterial(e: Entity, sprite: SpriteName, glow: boolean): void {
  const s3d = sprite
  spriteBox(e, s3d)
  Material.setPbrMaterial(e, {
    texture: spriteTexture(s3d),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.5,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(0.6, 0.9, 1) : Color3.Black(),
    emissiveIntensity: glow ? 0.6 : 0
  })
}

/** Selection shared by 3D taps and the UI (module-level, per table root). */
export const chessSelection = new Map<Entity, number>()
const selectionListeners = new Map<Entity, () => void>()
export function setChessSelection(root: Entity, sq: number | null): void {
  if (sq === null) chessSelection.delete(root)
  else chessSelection.set(root, sq)
  selectionListeners.get(root)?.()
}

export function createChessView(root: Entity, onTap: (sq: number) => void): View3DHandle {
  // board: textured planes on both faces + rim + foot (same build as checkers)
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

  // piece pool: thin boxes so both faces show the sprite (seat B looks from behind); built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 32; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(0, -5, 0), scale: Vector3.create(PIECE, PIECE, HALF_T * 2 + 0.01) })
      pieceMaterial(e, CHESS_SEAT_SPRITES[0], false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    free.length = 0
    free.push(...out)
    return out
  })
  boardHitArea(root, Vector3.create(0, CENTER_Y, 0), Vector3.create(BOARD, BOARD, HALF_T * 2 + 0.06), 'Move a piece', (local) => {
    const file = clampInt((local.x + BOARD / 2) / CELL, 0, N - 1)
    const rank = clampInt((local.y - (CENTER_Y - BOARD / 2)) / CELL, 0, N - 1)
    onTap(rank * N + file)
  })

  const entityAt = new Map<number, Entity>()
  const spriteAt = new Map<number, SpriteName>()
  const free: Entity[] = []
  let selectedSq = -1

  const place = (sq: number, e: Entity, p: ChessPiece, animateFrom: Vector3 | null): void => {
    entityAt.set(sq, e)
    spriteAt.set(sq, chessSprite(p))
    pieceMaterial(e, chessSprite(p), sq === selectedSq)
    VisibilityComponent.getMutable(e).visible = true
    const end = chessSquareLocal(sq)
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
  /** Slide the piece on `from` to `to` (which must be empty in our map) keeping its entity. */
  const slide = (from: number, to: number, p: ChessPiece): void => {
    const e = entityAt.get(from)
    if (!e || entityAt.has(to)) return
    entityAt.delete(from)
    spriteAt.delete(from)
    place(to, e, p, chessSquareLocal(from))
  }

  selectionListeners.set(root, () => {
    const sel = chessSelection.get(root)
    const next = sel === undefined ? -1 : sel
    if (next === selectedSq) return
    const prev = selectedSq
    selectedSq = next
    for (const sq of [prev, next]) {
      const e = entityAt.get(sq)
      const spr = spriteAt.get(sq)
      if (e === undefined || spr === undefined) continue
      pieceMaterial(e, spr, sq === selectedSq)
    }
  })

  return {
    reset() {
      for (const sq of Array.from(entityAt.keys())) release(sq)
      setChessSelection(root, null)
    },
    idle() {
      entityAt.clear()
      spriteAt.clear()
      free.length = 0
      pool.release()
    },
    update(raw, info) {
      pool.get()
      const s = raw as ChessGameState
      const last = s.lastMove
      if (info.animate && last) {
        // captured piece (also en passant, where the victim sits behind `to`) disappears first
        if (last.isEnPassant) {
          const victim = last.to + (s.board[last.to]?.color === 'white' ? -N : N)
          release(victim)
        } else if (entityAt.has(last.to)) release(last.to)
        const moved = s.board[last.to]
        if (moved) slide(last.from, last.to, moved)
        if (last.isCastling) {
          const rank = Math.floor(last.to / N) * N
          const [rFrom, rTo] = last.isCastling === 'kingside' ? [rank + 7, rank + 5] : [rank, rank + 3]
          const rook = s.board[rTo]
          if (rook) slide(rFrom, rTo, rook)
        }
      }
      // reconcile every square (promotion swaps the sprite through place())
      for (let sq = 0; sq < N * N; sq++) {
        const p = s.board[sq]
        const e = entityAt.get(sq)
        if (!p) {
          if (e) release(sq)
          continue
        }
        if (e) {
          if (spriteAt.get(sq) !== chessSprite(p)) place(sq, e, p, null)
          continue
        }
        const fresh = free.pop()
        if (fresh) place(sq, fresh, p, null)
      }
    }
  }
}
