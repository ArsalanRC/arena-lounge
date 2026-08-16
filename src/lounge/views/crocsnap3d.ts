/**
 * Croc Snap on a table: an upright croc face (textured disc, both sides) with
 * twelve tooth boxes around its rim. Pressed teeth sink in and darken; the
 * trigger tooth flashes red and a "SNAP!" label pops for a moment. Tapping
 * the disc maps the hit angle to the nearest tooth.
 */
import { Billboard, BillboardMode, ColliderLayer, Entity, Font, InputAction, Material, MaterialTransparencyMode, MeshCollider, MeshRenderer, TextAlignMode, TextShape, Transform, VisibilityComponent, engine, pointerEventsSystem } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import type { CrocSnapGameState } from '../../engine/crocsnap'
import { TEETH_COUNT } from '../../engine/crocsnap'
import { PALETTE } from '../config'
import type { View3DHandle } from '../games/types'
import { TABLE_TOP_Y, box, toTableLocal } from './shared'

export interface CrocAction {
  tooth: number
}

const R = 0.42 // tooth ring radius (table-local metres)
const CENTER_Y = TABLE_TOP_Y + 0.06 + 0.5
const TOOTH = 0.11
const HALF_T = 0.03
const SNAP_MS = 1600

export const CROC_COLORS = {
  tooth: Color4.fromHexString('#f7f1e6ff'),
  pressed: Color4.fromHexString('#5c5148ff'),
  snap: Color4.fromHexString('#e2453dff')
}

/** Angle of tooth i (radians, 0 = top, clockwise seen from seat A). */
export function toothAngle(i: number): number {
  return (i / TEETH_COUNT) * Math.PI * 2
}

/** Table-local centre of tooth i on the ring. */
export function toothLocal(i: number): Vector3 {
  const a = toothAngle(i)
  return Vector3.create(Math.sin(a) * R, CENTER_Y + Math.cos(a) * R, 0)
}

export function createCrocSnapView(root: Entity, onTap: (tooth: number) => void): View3DHandle {
  // face: textured planes front and back, a rim ring of the head colour, a foot
  for (const z of [-HALF_T, HALF_T]) {
    const e = engine.addEntity()
    Transform.create(e, { parent: root, position: Vector3.create(0, CENTER_Y, z), scale: Vector3.create(0.72, 0.72, 1), rotation: Quaternion.fromEulerDegrees(0, z > 0 ? 180 : 0, 0) })
    MeshRenderer.setPlane(e)
    Material.setPbrMaterial(e, {
      texture: Material.Texture.Common({ src: 'images/croc-face.png' }),
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
      alphaTest: 0.5,
      roughness: 0.8,
      metallic: 0,
      castShadows: false
    })
  }
  const neck = engine.addEntity()
  Transform.create(neck, { parent: root, position: Vector3.create(0, (TABLE_TOP_Y + CENTER_Y - R) / 2, 0), scale: Vector3.create(0.16, CENTER_Y - R - TABLE_TOP_Y, 0.06) })
  MeshRenderer.setBox(neck)
  Material.setPbrMaterial(neck, { albedoColor: PALETTE.woodDark, roughness: 0.9, metallic: 0 })
  box(root, Vector3.create(0, TABLE_TOP_Y + 0.03, 0), Vector3.create(0.6, 0.06, 0.26), PALETTE.woodDark)

  // teeth
  const teeth: Entity[] = []
  for (let i = 0; i < TEETH_COUNT; i++) {
    const e = engine.addEntity()
    const a = toothAngle(i)
    Transform.create(e, { parent: root, position: toothLocal(i), scale: Vector3.create(TOOTH, TOOTH * 1.3, HALF_T * 2 + 0.05), rotation: Quaternion.fromEulerDegrees(0, 0, (-a * 180) / Math.PI) })
    MeshRenderer.setBox(e)
    Material.setPbrMaterial(e, { albedoColor: CROC_COLORS.tooth, roughness: 0.5, metallic: 0 })
    teeth.push(e)
  }

  // one collider disc for taps
  const hit = engine.addEntity()
  Transform.create(hit, { parent: root, position: Vector3.create(0, CENTER_Y, 0), scale: Vector3.create(1.1, 1.1, HALF_T * 2 + 0.08) })
  MeshCollider.setBox(hit, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown({ entity: hit, opts: { button: InputAction.IA_POINTER, hoverText: 'Press a tooth', maxDistance: 6, showHighlight: false } }, (event) => {
    const p = event.hit?.position
    if (!p) return
    const l = toTableLocal(root, p)
    const a = Math.atan2(l.x, l.y - CENTER_Y) // 0 = top, clockwise
    const i = ((Math.round((a / (Math.PI * 2)) * TEETH_COUNT) % TEETH_COUNT) + TEETH_COUNT) % TEETH_COUNT
    onTap(i)
  })

  // SNAP! label
  const snapLabel = engine.addEntity()
  Transform.create(snapLabel, { parent: root, position: Vector3.create(0, CENTER_Y + R + 0.35, 0) })
  TextShape.create(snapLabel, { text: 'SNAP!', fontSize: 3, font: Font.F_SANS_SERIF, textAlign: TextAlignMode.TAM_MIDDLE_CENTER, textColor: Color4.fromHexString('#ff5a4dff'), outlineWidth: 0.2, outlineColor: Color3.Black(), width: 3, height: 1 })
  Billboard.create(snapLabel, { billboardMode: BillboardMode.BM_Y })
  VisibilityComponent.create(snapLabel, { visible: false })
  let snapUntil = 0

  const setTooth = (i: number, pressed: boolean, snap: boolean): void => {
    const e = teeth[i]
    const t = Transform.getMutable(e)
    t.scale = pressed ? Vector3.create(TOOTH * 0.8, TOOTH, HALF_T * 2 + 0.01) : Vector3.create(TOOTH, TOOTH * 1.3, HALF_T * 2 + 0.05)
    Material.setPbrMaterial(e, {
      albedoColor: snap ? CROC_COLORS.snap : pressed ? CROC_COLORS.pressed : CROC_COLORS.tooth,
      emissiveColor: snap ? Color3.fromHexString('#ff3b2e') : Color3.Black(),
      emissiveIntensity: snap ? 1.5 : 0,
      roughness: 0.5,
      metallic: 0
    })
  }

  engine.addSystem(() => {
    if (snapUntil && Date.now() > snapUntil) {
      snapUntil = 0
      VisibilityComponent.getMutable(snapLabel).visible = false
    }
  })

  return {
    reset() {
      for (let i = 0; i < TEETH_COUNT; i++) setTooth(i, false, false)
      VisibilityComponent.getMutable(snapLabel).visible = false
      snapUntil = 0
    },
    update(raw, info) {
      const s = raw as CrocSnapGameState
      const snapAt = s.lastSnap ? s.lastSnap.toothIndex : -1
      for (let i = 0; i < TEETH_COUNT; i++) {
        // after a snap the engine deals fresh teeth for the next round; keep the
        // snapped tooth red for a moment so everyone sees what happened
        const pressed = s.teeth[i]?.pressed === true
        setTooth(i, pressed || (i === snapAt && info.animate), i === snapAt && info.animate)
      }
      if (snapAt >= 0 && info.animate) {
        VisibilityComponent.getMutable(snapLabel).visible = true
        snapUntil = Date.now() + SNAP_MS
      }
    }
  }
}
