/**
 * The lounge itself: floor, a low boundary, planters, lamp posts and the
 * welcome sign at spawn. Pure primitives, no downloads, mobile-cheap.
 */
import {
  Billboard,
  BillboardMode,
  ColliderLayer,
  Entity,
  Font,
  InputAction,
  Material,
  MeshCollider,
  MeshRenderer,
  TextAlignMode,
  TextShape,
  TextureWrapMode,
  Transform,
  engine,
  pointerEventsSystem
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { PALETTE, SCENE_SIZE, SPAWN } from './config'
import { local } from './tables'

function solid(pos: Vector3, scale: Vector3, color: Color4, opts: { collide?: boolean; rotY?: number; parent?: Entity } = {}): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position: pos,
    scale,
    rotation: Quaternion.fromEulerDegrees(0, opts.rotY ?? 0, 0),
    parent: opts.parent
  })
  MeshRenderer.setBox(e)
  if (opts.collide) MeshCollider.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: color, roughness: 0.9, metallic: 0 })
  return e
}

function cylinder(pos: Vector3, scale: Vector3, color: Color4, collide = false): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos, scale })
  MeshRenderer.setCylinder(e, 0.5, 0.5)
  if (collide) MeshCollider.setCylinder(e, 0.5, 0.5)
  Material.setPbrMaterial(e, { albedoColor: color, roughness: 0.9, metallic: 0 })
  return e
}

function texturedBox(pos: Vector3, scale: Vector3, src: string, tiling: [number, number], collide = false, rotY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos, scale, rotation: Quaternion.fromEulerDegrees(0, rotY, 0) })
  MeshRenderer.setBox(e)
  if (collide) MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src, wrapMode: TextureWrapMode.TWM_REPEAT, tiling: { x: tiling[0], y: tiling[1] } }),
    roughness: 0.85,
    metallic: 0
  })
  return e
}

function planter(x: number, z: number): void {
  cylinder(Vector3.create(x, 0.3, z), Vector3.create(0.9, 0.6, 0.9), PALETTE.pot, true)
  const leaves = engine.addEntity()
  Transform.create(leaves, { position: Vector3.create(x, 1.05, z), scale: Vector3.create(1.2, 1.0, 1.2) })
  MeshRenderer.setSphere(leaves)
  Material.setPbrMaterial(leaves, { albedoColor: PALETTE.plant, roughness: 1, metallic: 0 })
}

function lamp(x: number, z: number): void {
  cylinder(Vector3.create(x, 1.4, z), Vector3.create(0.12, 2.8, 0.12), PALETTE.woodDark, true)
  const bulb = engine.addEntity()
  Transform.create(bulb, { position: Vector3.create(x, 2.95, z), scale: Vector3.create(0.45, 0.45, 0.45) })
  MeshRenderer.setSphere(bulb)
  Material.setPbrMaterial(bulb, {
    albedoColor: PALETTE.lamp,
    emissiveColor: Color3.fromHexString('#ffc773'),
    emissiveIntensity: 3,
    roughness: 0.3,
    metallic: 0
  })
}

/** A post with a glowing "?" cube next to the spawn: tap to open How to play. */
function infoKiosk(x: number, z: number): void {
  cylinder(Vector3.create(x, 0.6, z), Vector3.create(0.14, 1.2, 0.14), PALETTE.woodDark, true)
  const cube = engine.addEntity()
  Transform.create(cube, { position: Vector3.create(x, 1.45, z), rotation: Quaternion.fromEulerDegrees(0, 45, 0), scale: Vector3.create(0.42, 0.42, 0.42) })
  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(cube, {
    albedoColor: PALETTE.frame,
    emissiveColor: Color3.fromHexString('#3fc1d9'),
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metallic: 0.2
  })
  const label = engine.addEntity()
  Transform.create(label, { position: Vector3.create(x, 1.45, z) })
  TextShape.create(label, {
    text: '?',
    fontSize: 4,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: Color4.White(),
    outlineWidth: 0.1,
    outlineColor: Color3.Black()
  })
  Billboard.create(label, { billboardMode: BillboardMode.BM_Y })
  const hint = engine.addEntity()
  Transform.create(hint, { position: Vector3.create(x, 2.0, z) })
  TextShape.create(hint, {
    text: 'How to play',
    fontSize: 1.4,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: Color4.White(),
    outlineWidth: 0.12,
    outlineColor: Color3.Black()
  })
  Billboard.create(hint, { billboardMode: BillboardMode.BM_Y })
  pointerEventsSystem.onPointerDown(
    { entity: cube, opts: { button: InputAction.IA_POINTER, hoverText: 'How to play', maxDistance: 10 } },
    () => {
      local.helpOpen = true
    }
  )
}

export function buildLounge(): void {
  const half = SCENE_SIZE / 2

  // floor: collider slab + tiled parquet on top
  solid(Vector3.create(half, -0.05, half), Vector3.create(SCENE_SIZE, 0.1, SCENE_SIZE), PALETTE.floor, { collide: true })
  const parquet = engine.addEntity()
  Transform.create(parquet, {
    position: Vector3.create(half, 0.002, half),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(SCENE_SIZE, SCENE_SIZE, 1)
  })
  MeshRenderer.setPlane(parquet)
  Material.setPbrMaterial(parquet, {
    texture: Material.Texture.Common({ src: 'images/floor.png', wrapMode: TextureWrapMode.TWM_REPEAT, tiling: { x: 10, y: 10 } }),
    roughness: 0.75,
    metallic: 0,
    castShadows: false
  })

  // low wooden boundary so nobody walks off the edge on a phone
  const wallH = 0.9
  const wallT = 0.3
  texturedBox(Vector3.create(half, wallH / 2, wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true)
  texturedBox(Vector3.create(half, wallH / 2, SCENE_SIZE - wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true)
  texturedBox(Vector3.create(wallT / 2, wallH / 2, half), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true, 90)
  texturedBox(Vector3.create(SCENE_SIZE - wallT / 2, wallH / 2, half), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true, 90)
  // cap rail on top of the wall
  solid(Vector3.create(half, wallH + 0.03, wallT / 2), Vector3.create(SCENE_SIZE, 0.06, wallT + 0.1), PALETTE.woodDark)
  solid(Vector3.create(half, wallH + 0.03, SCENE_SIZE - wallT / 2), Vector3.create(SCENE_SIZE, 0.06, wallT + 0.1), PALETTE.woodDark)
  solid(Vector3.create(wallT / 2, wallH + 0.03, half), Vector3.create(wallT + 0.1, 0.06, SCENE_SIZE), PALETTE.woodDark)
  solid(Vector3.create(SCENE_SIZE - wallT / 2, wallH + 0.03, half), Vector3.create(wallT + 0.1, 0.06, SCENE_SIZE), PALETTE.woodDark)

  // planters + lamps around the play area
  planter(3, 3)
  planter(29, 3)
  planter(3, 29)
  planter(29, 29)
  planter(half, 29.5)
  lamp(5.5, 24)
  lamp(26.5, 24)
  lamp(5.5, 12)
  lamp(26.5, 12)

  // info kiosk beside the spawn path
  infoKiosk(SPAWN.x - 3.2, SPAWN.z + 1.5)

  // welcome sign facing the spawn point
  const sign = engine.addEntity()
  Transform.create(sign, { position: Vector3.create(SPAWN.x, 3.2, SPAWN.z + 3.5) })
  TextShape.create(sign, {
    text: 'ARENA LOUNGE\nPick a table, take a seat, play a friend',
    fontSize: 3,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: Color4.White(),
    outlineWidth: 0.25,
    outlineColor: Color3.Black(),
    width: 12,
    height: 2
  })
  Billboard.create(sign, { billboardMode: BillboardMode.BM_Y })
}
