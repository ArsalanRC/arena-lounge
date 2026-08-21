/**
 * Backgammon on a table: upright board (points texture, both faces) with a
 * pool of 30 checker discs stacked on the points and the bar; borne-off
 * checkers are counted on the side trays. One collider maps taps to a point,
 * the bar or the off tray. Point 0 (white's ace) is bottom right, point 12
 * top left, as on the texture (white's perspective; seat B sees the mirror
 * from behind, which is black's natural view).
 */
import { ColliderLayer, Entity, Font, InputAction, Material, MaterialTransparencyMode, MeshCollider, MeshRenderer, TextAlignMode, TextShape, Transform, VisibilityComponent, engine, pointerEventsSystem } from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import { spriteBox, spriteTexture, type SpriteName } from '../atlas'
import type { BackgammonColor, BackgammonGameState } from '../../engine/backgammon'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { LazyPool, TABLE_TOP_Y, box, toTableLocal } from './shared'

/** Roll (dice chosen by the acting client), move a checker, or pass when stuck. */
export type BgAction = { roll: [number, number] } | { from: number | 'bar'; to: number | 'off'; pips: number } | { pass: true }
export type BgTarget = number | 'bar' | 'off'

const BOARD_W = 1.0
const BOARD_H = 0.8
const BAR_W = 0.08
const PW = (BOARD_W - BAR_W) / 12
const CENTER_Y = TABLE_TOP_Y + 0.06 + BOARD_H / 2
const HALF_T = 0.02
const DISC = 0.068
const STEP = 0.07

export const BG_SPRITES: [SpriteName, SpriteName] = ['disc-light', 'disc-dark']

/** Column (0..11, left to right in white's view) and row (top/bottom) of a point. */
export function pointColumn(p: number): { col: number; top: boolean } {
  return p >= 12 ? { col: p - 12, top: true } : { col: 11 - p, top: false }
}

function columnX(col: number): number {
  return -BOARD_W / 2 + col * PW + PW / 2 + (col >= 6 ? BAR_W : 0)
}

/** Table-local centre of the k-th checker on a point (stacks compress past five). */
export function checkerLocal(p: number, k: number): Vector3 {
  const { col, top } = pointColumn(p)
  const off = k < 5 ? k * STEP : 4 * STEP + (k - 4) * 0.018
  const y = top ? CENTER_Y + BOARD_H / 2 - DISC / 2 - off : CENTER_Y - BOARD_H / 2 + DISC / 2 + off
  return Vector3.create(columnX(col), y, 0)
}

function barLocal(color: BackgammonColor, k: number): Vector3 {
  // white waits on the lower half of the bar, black on the upper half
  const y = color === 'white' ? CENTER_Y - 0.06 - k * 0.04 : CENTER_Y + 0.06 + k * 0.04
  return Vector3.create(0, y, 0)
}

function discMaterial(e: Entity, color: BackgammonColor, glow: boolean): void {
  const s3d = color === 'white' ? BG_SPRITES[0] : BG_SPRITES[1]
  spriteBox(e, s3d)
  Material.setPbrMaterial(e, {
    texture: spriteTexture(s3d),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 0.4,
    metallic: 0,
    castShadows: false,
    emissiveColor: glow ? Color3.create(0.6, 0.9, 1) : Color3.Black(),
    emissiveIntensity: glow ? 0.6 : 0
  })
}

/** Selected source (point index or 'bar') per table root, shared by 3D taps and the UI. */
export const bgSelection = new Map<Entity, number | 'bar'>()
const listeners = new Map<Entity, () => void>()
export function setBgSelection(root: Entity, from: number | 'bar' | null): void {
  if (from === null) bgSelection.delete(root)
  else bgSelection.set(root, from)
  listeners.get(root)?.()
}

export function createBackgammonView(root: Entity, onTap: (target: BgTarget) => void): View3DHandle {
  for (const z of [-HALF_T, HALF_T]) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(BOARD_W, BOARD_H, 1) })
    MeshRenderer.setPlane(e)
    Material.setPbrMaterial(e, { texture: Material.Texture.Common({ src: 'images/backgammon-board.png' }), roughness: 0.9, metallic: 0, castShadows: false })
  }
  const rim = 0.04
  const depth = HALF_T * 2 + 0.01
  box(root, Vector3.create(0, CENTER_Y + BOARD_H / 2 + rim / 2, 0), Vector3.create(BOARD_W + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, CENTER_Y - BOARD_H / 2 - rim / 2, 0), Vector3.create(BOARD_W + rim * 2, rim, depth), PALETTE.woodDark)
  box(root, Vector3.create(-BOARD_W / 2 - rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD_H, depth), PALETTE.woodDark)
  box(root, Vector3.create(BOARD_W / 2 + rim / 2, CENTER_Y, 0), Vector3.create(rim, BOARD_H, depth), PALETTE.woodDark)
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(BOARD_W + 0.2, 0.06, 0.26), PALETTE.woodDark)
  // off trays right of the board: white's below (its home is bottom right), black's above
  const trayX = BOARD_W / 2 + rim + 0.09
  box(root, Vector3.create(trayX, CENTER_Y - BOARD_H / 4, 0), Vector3.create(0.14, BOARD_H / 2 - 0.04, depth), PALETTE.wood)
  box(root, Vector3.create(trayX, CENTER_Y + BOARD_H / 4, 0), Vector3.create(0.14, BOARD_H / 2 - 0.04, depth), PALETTE.wood)
  const trayLabel = (y: number): Entity => {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(trayX, y, -HALF_T - 0.02) })
    TextShape.create(e, { text: '', fontSize: 1.2, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 1, height: 0.5 })
    return e
  }
  const offWhite = trayLabel(CENTER_Y - BOARD_H / 4)
  const offBlack = trayLabel(CENTER_Y + BOARD_H / 4)
  // dice readout above the board
  const dice = engine.addEntity()
  Transform.create(dice, { parent: root, position: Vector3.create(0, CENTER_Y + BOARD_H / 2 + 0.16, 0) })
  TextShape.create(dice, { text: '', fontSize: 1.0, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.White(), outlineWidth: 0.15, outlineColor: Color3.Black(), width: 3, height: 0.5 })

  // checker pool, built while a round runs
  const pool = new LazyPool(() => {
    const out: Entity[] = []
    for (let i = 0; i < 30; i++) {
      const e = engine.addEntity()
      Transform.create(e, { parent: root, position: Vector3.create(0, -5, 0), scale: Vector3.create(DISC, DISC, HALF_T * 2 + 0.01) })
      discMaterial(e, 'white', false)
      VisibilityComponent.create(e, { visible: false })
      out.push(e)
    }
    return out
  })

  // taps: board (points + bar) and the trays (off)
  const hit = engine.addEntity()
  Transform.create(hit, { parent: root, position: Vector3.create(0, CENTER_Y, 0), scale: Vector3.create(BOARD_W, BOARD_H, HALF_T * 2 + 0.06) })
  MeshCollider.setBox(hit, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown({ entity: hit, opts: { button: InputAction.IA_POINTER, hoverText: 'Move a checker', maxDistance: 6, showHighlight: false } }, (event) => {
    const p = event.hit?.position
    if (!p) return
    const l = toTableLocal(root, p)
    if (Math.abs(l.x) < BAR_W / 2) {
      onTap('bar')
      return
    }
    const xx = l.x + BOARD_W / 2 - (l.x > 0 ? BAR_W : 0)
    const col = Math.max(0, Math.min(11, Math.floor(xx / PW)))
    const top = l.y > CENTER_Y
    onTap(top ? 12 + col : 11 - col)
  })
  const trays = engine.addEntity()
  Transform.create(trays, { parent: root, position: Vector3.create(trayX, CENTER_Y, 0), scale: Vector3.create(0.16, BOARD_H, HALF_T * 2 + 0.06) })
  MeshCollider.setBox(trays, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown({ entity: trays, opts: { button: InputAction.IA_POINTER, hoverText: 'Bear off', maxDistance: 6, showHighlight: false } }, () => onTap('off'))

  let selected: number | 'bar' | null = null
  const placed: Array<{ e: Entity; key: string }> = []
  listeners.set(root, () => {
    selected = bgSelection.get(root) ?? null
    for (const { e, key } of placed) {
      const [kind, idx, color] = key.split(':')
      discMaterial(e, color as BackgammonColor, (kind === 'p' && selected === Number(idx)) || (kind === 'bar' && selected === 'bar'))
    }
  })

  const layout = (s: BackgammonGameState): void => {
    const discs = pool.get()
    let n = 0
    placed.length = 0
    const put = (pos: Vector3, color: BackgammonColor, key: string): void => {
      const e = discs[n++]
      if (!e) return
      Transform.getMutable(e).position = pos
      VisibilityComponent.getMutable(e).visible = true
      const glow = (key.startsWith('p:') && selected === Number(key.split(':')[1])) || (key.startsWith('bar') && selected === 'bar')
      discMaterial(e, color, glow)
      placed.push({ e, key })
    }
    for (let p = 0; p < 24; p++) {
      const pt = s.points[p]
      if (!pt.owner) continue
      for (let k = 0; k < pt.count; k++) put(checkerLocal(p, k), pt.owner, `p:${p}:${pt.owner}`)
    }
    for (const c of ['white', 'black'] as BackgammonColor[]) for (let k = 0; k < s.bar[c]; k++) put(barLocal(c, k), c, `bar:0:${c}`)
    for (let i = n; i < discs.length; i++) VisibilityComponent.getMutable(discs[i]).visible = false
    TextShape.getMutable(offWhite).text = s.off.white ? `${s.off.white}` : ''
    TextShape.getMutable(offBlack).text = s.off.black ? `${s.off.black}` : ''
    TextShape.getMutable(dice).text = s.dice ? `${s.dice[0]} · ${s.dice[1]}   (${s.remainingPips.join(' ')} left)` : ''
  }

  return {
    reset() {
      if (pool.live) for (const e of pool.get()) VisibilityComponent.getMutable(e).visible = false
      TextShape.getMutable(offWhite).text = ''
      TextShape.getMutable(offBlack).text = ''
      TextShape.getMutable(dice).text = ''
      setBgSelection(root, null)
    },
    idle() {
      placed.length = 0
      pool.release()
    },
    update(raw) {
      layout(raw as BackgammonGameState)
    }
  }
}
