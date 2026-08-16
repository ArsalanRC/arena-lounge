/**
 * The lounge itself: floor, a low boundary, planters, lamp posts and the
 * welcome sign at spawn. Pure primitives, no downloads, mobile-cheap.
 */
import {
  Billboard,
  BillboardMode,
  Entity,
  Font,
  Material,
  MeshCollider,
  MeshRenderer,
  TextAlignMode,
  TextShape,
  Transform,
  engine
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { PALETTE, SCENE_SIZE, SPAWN } from './config'

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

export function buildLounge(): void {
  const half = SCENE_SIZE / 2

  // floor: one big slab plus a lighter inner "parquet" square
  solid(Vector3.create(half, -0.05, half), Vector3.create(SCENE_SIZE, 0.1, SCENE_SIZE), PALETTE.floor, { collide: true })
  solid(Vector3.create(half, 0.003, half + 3), Vector3.create(22, 0.006, 20), PALETTE.floorTrim)

  // low boundary wall so nobody walks off the edge on a phone
  const wallH = 0.9
  const wallT = 0.3
  solid(Vector3.create(half, wallH / 2, wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), PALETTE.woodDark, { collide: true })
  solid(Vector3.create(half, wallH / 2, SCENE_SIZE - wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), PALETTE.woodDark, { collide: true })
  solid(Vector3.create(wallT / 2, wallH / 2, half), Vector3.create(wallT, wallH, SCENE_SIZE), PALETTE.woodDark, { collide: true })
  solid(Vector3.create(SCENE_SIZE - wallT / 2, wallH / 2, half), Vector3.create(wallT, wallH, SCENE_SIZE), PALETTE.woodDark, { collide: true })

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

  // welcome sign facing the spawn point
  const sign = engine.addEntity()
  Transform.create(sign, { position: Vector3.create(SPAWN.x, 3.2, SPAWN.z + 3.5) })
  TextShape.create(sign, {
    text: 'ARENA LOUNGE\nPick a table, take a seat, play a friend',
    fontSize: 3.2,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: PALETTE.cream,
    outlineWidth: 0.12,
    outlineColor: Color3.Black(),
    width: 12,
    height: 2
  })
  Billboard.create(sign, { billboardMode: BillboardMode.BM_Y })
}
