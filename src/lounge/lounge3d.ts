/**
 * The lounge itself: parquet floor, wooden boundary, a round plaza with the
 * info kiosk and welcome sign, benches, and one "corner" per game with a
 * tinted rug, a banner pole and planters as dividers. Pure primitives, no
 * downloads, mobile-cheap. Tables are built by table3d on top of this.
 */
import {
  Billboard,
  BillboardMode,
  ColliderLayer,
  Entity,
  Font,
  InputAction,
  Material,
  MaterialTransparencyMode,
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
import { BUILT_GAMES, PALETTE, PLAZA, SCENE_SIZE, SPAWN, ZONES, yawToward, type ZoneDef } from './config'
import { GAME_NAMES } from './games/registry'
import { local } from './tables'

// ---------------------------------------------------------------- primitives

function solid(pos: Vector3, scale: Vector3, color: Color4, opts: { collide?: boolean; rotY?: number; parent?: Entity } = {}): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos, scale, rotation: Quaternion.fromEulerDegrees(0, opts.rotY ?? 0, 0), parent: opts.parent })
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

/** Round rug: the neutral rug texture tinted by `tint`, lying flat. */
export function rug(pos: Vector3, size: number, tint: Color4, y = 0.012): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(pos.x, y, pos.z), rotation: Quaternion.fromEulerDegrees(90, 0, 0), scale: Vector3.create(size, size, 1) })
  MeshRenderer.setPlane(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({ src: 'images/rug.png' }),
    albedoColor: tint,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST,
    alphaTest: 0.5,
    roughness: 1,
    metallic: 0,
    castShadows: false
  })
  return e
}

function label(pos: Vector3, text: string, fontSize: number, color = Color4.White(), width = 8): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos })
  TextShape.create(e, {
    text,
    fontSize,
    font: Font.F_SANS_SERIF,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textColor: color,
    outlineWidth: 0.2,
    outlineColor: Color3.Black(),
    width,
    height: 2
  })
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
  return e
}

// ---------------------------------------------------------------- furniture

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

/** A bench facing `toward`, made of a seat plank and two legs. */
function bench(pos: Vector3, toward: Vector3): void {
  const yaw = yawToward(pos, toward)
  const root = engine.addEntity()
  Transform.create(root, { position: pos, rotation: Quaternion.fromEulerDegrees(0, yaw, 0) })
  solid(Vector3.create(0, 0.42, 0), Vector3.create(1.8, 0.08, 0.5), PALETTE.wood, { parent: root, collide: true })
  solid(Vector3.create(-0.7, 0.2, 0), Vector3.create(0.12, 0.4, 0.44), PALETTE.woodDark, { parent: root })
  solid(Vector3.create(0.7, 0.2, 0), Vector3.create(0.12, 0.4, 0.44), PALETTE.woodDark, { parent: root })
}

/** Banner pole with a coloured cloth and the game name, marking a corner. */
function zoneBanner(z: ZoneDef): void {
  // pole stands on the outer side of the corner (away from the plaza)
  const away = Vector3.normalize(Vector3.subtract(z.position, PLAZA))
  const pos = Vector3.add(z.position, Vector3.scale(away, 2.6))
  cylinder(Vector3.create(pos.x, 1.7, pos.z), Vector3.create(0.12, 3.4, 0.12), PALETTE.woodDark, true)
  const cloth = engine.addEntity()
  Transform.create(cloth, {
    position: Vector3.create(pos.x, 2.35, pos.z),
    rotation: Quaternion.fromEulerDegrees(0, yawToward(pos, PLAZA), 0),
    scale: Vector3.create(0.9, 1.7, 1)
  })
  MeshRenderer.setPlane(cloth)
  Material.setPbrMaterial(cloth, { albedoColor: z.banner, roughness: 0.9, metallic: 0, castShadows: false })
  const built = BUILT_GAMES.includes(z.gameId)
  label(Vector3.create(pos.x, 3.75, pos.z), built ? GAME_NAMES[z.gameId] : `${GAME_NAMES[z.gameId]}\ncoming soon`, built ? 2.2 : 1.6, Color4.White(), 8)
}

/** A post with a glowing "?" cube: tap to open How to play. */
function infoKiosk(x: number, z: number): void {
  cylinder(Vector3.create(x, 0.6, z), Vector3.create(0.14, 1.2, 0.14), PALETTE.woodDark, true)
  const cube = engine.addEntity()
  Transform.create(cube, { position: Vector3.create(x, 1.45, z), rotation: Quaternion.fromEulerDegrees(0, 45, 0), scale: Vector3.create(0.42, 0.42, 0.42) })
  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(cube, { albedoColor: PALETTE.frame, emissiveColor: Color3.fromHexString('#3fc1d9'), emissiveIntensity: 0.8, roughness: 0.3, metallic: 0.2 })
  label(Vector3.create(x, 1.45, z), '?', 4, Color4.White(), 2)
  label(Vector3.create(x, 2.05, z), 'How to play', 1.4, Color4.White(), 4)
  pointerEventsSystem.onPointerDown({ entity: cube, opts: { button: InputAction.IA_POINTER, hoverText: 'How to play', maxDistance: 10 } }, () => {
    local.helpOpen = true
  })
}

// ---------------------------------------------------------------- scene

export function buildLounge(): void {
  const half = SCENE_SIZE / 2

  // floor: collider slab + tiled parquet on top
  solid(Vector3.create(half, -0.05, half), Vector3.create(SCENE_SIZE, 0.1, SCENE_SIZE), PALETTE.floor, { collide: true })
  const parquet = engine.addEntity()
  Transform.create(parquet, { position: Vector3.create(half, 0.002, half), rotation: Quaternion.fromEulerDegrees(90, 0, 0), scale: Vector3.create(SCENE_SIZE, SCENE_SIZE, 1) })
  MeshRenderer.setPlane(parquet)
  Material.setPbrMaterial(parquet, {
    texture: Material.Texture.Common({ src: 'images/floor.png', wrapMode: TextureWrapMode.TWM_REPEAT, tiling: { x: 10, y: 10 } }),
    roughness: 0.75,
    metallic: 0,
    castShadows: false
  })

  // low wooden boundary so nobody walks off the edge on a phone, with a cap rail
  const wallH = 0.9
  const wallT = 0.3
  texturedBox(Vector3.create(half, wallH / 2, wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true)
  texturedBox(Vector3.create(half, wallH / 2, SCENE_SIZE - wallT / 2), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true)
  texturedBox(Vector3.create(wallT / 2, wallH / 2, half), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true, 90)
  texturedBox(Vector3.create(SCENE_SIZE - wallT / 2, wallH / 2, half), Vector3.create(SCENE_SIZE, wallH, wallT), 'images/wood.png', [8, 1], true, 90)
  solid(Vector3.create(half, wallH + 0.03, wallT / 2), Vector3.create(SCENE_SIZE, 0.06, wallT + 0.1), PALETTE.woodDark)
  solid(Vector3.create(half, wallH + 0.03, SCENE_SIZE - wallT / 2), Vector3.create(SCENE_SIZE, 0.06, wallT + 0.1), PALETTE.woodDark)
  solid(Vector3.create(wallT / 2, wallH + 0.03, half), Vector3.create(wallT + 0.1, 0.06, SCENE_SIZE), PALETTE.woodDark)
  solid(Vector3.create(SCENE_SIZE - wallT / 2, wallH + 0.03, half), Vector3.create(wallT + 0.1, 0.06, SCENE_SIZE), PALETTE.woodDark)

  // the plaza: a big warm rug, a tree in the middle as the landmark, four
  // benches facing in, lamps at the corners
  rug(PLAZA, 9.5, Color4.fromHexString('#e3c9a3ff'), 0.008)
  cylinder(Vector3.create(PLAZA.x, 0.35, PLAZA.z), Vector3.create(1.6, 0.7, 1.6), PALETTE.pot, true)
  cylinder(Vector3.create(PLAZA.x, 2.0, PLAZA.z), Vector3.create(0.32, 3.4, 0.32), PALETTE.woodDark, true)
  for (const [dx, dy, dz, r] of [[0, 3.9, 0, 3.0], [-1.1, 3.3, 0.6, 2.0], [1.0, 3.5, -0.7, 2.1], [0.4, 4.6, 0.9, 1.7]]) {
    const leaves = engine.addEntity()
    Transform.create(leaves, { position: Vector3.create(PLAZA.x + dx, dy, PLAZA.z + dz), scale: Vector3.create(r, r * 0.8, r) })
    MeshRenderer.setSphere(leaves)
    Material.setPbrMaterial(leaves, { albedoColor: PALETTE.plant, roughness: 1, metallic: 0 })
  }
  for (const [x, z] of [[PLAZA.x - 3.6, PLAZA.z + 2.6], [PLAZA.x + 3.6, PLAZA.z + 2.6], [PLAZA.x - 3.6, PLAZA.z - 2.6], [PLAZA.x + 3.6, PLAZA.z - 2.6]]) {
    bench(Vector3.create(x, 0, z), PLAZA)
  }
  lamp(PLAZA.x, PLAZA.z + 7)
  lamp(PLAZA.x - 6.5, PLAZA.z)
  lamp(PLAZA.x + 6.5, PLAZA.z)

  // corners: rug + banner (planters between neighbours on the ring)
  for (const z of ZONES) {
    if (BUILT_GAMES.includes(z.gameId)) rug(z.position, z.tables > 1 ? 8.4 : 5.6, z.rug)
    zoneBanner(z)
  }
  for (let i = 0; i < ZONES.length; i++) {
    const a = ZONES[i].position
    const b = ZONES[(i + 1) % ZONES.length].position
    // skip the gap between the two southern corners: that is the entrance
    if (Vector3.distance(a, b) > 14) continue
    const mid = Vector3.scale(Vector3.add(a, b), 0.5)
    const away = Vector3.normalize(Vector3.subtract(mid, PLAZA))
    const p = Vector3.add(mid, Vector3.scale(away, 1.2))
    planter(p.x, p.z)
  }
  planter(2.6, 2.6)
  planter(SCENE_SIZE - 2.6, 2.6)
  planter(2.6, SCENE_SIZE - 2.6)
  planter(SCENE_SIZE - 2.6, SCENE_SIZE - 2.6)

  // entrance: a wooden gateway over the path with the welcome sign, kiosk beside it
  const gz = SPAWN.z + 3.4
  cylinder(Vector3.create(SPAWN.x - 3.2, 1.7, gz), Vector3.create(0.22, 3.4, 0.22), PALETTE.woodDark, true)
  cylinder(Vector3.create(SPAWN.x + 3.2, 1.7, gz), Vector3.create(0.22, 3.4, 0.22), PALETTE.woodDark, true)
  solid(Vector3.create(SPAWN.x, 3.5, gz), Vector3.create(6.9, 0.22, 0.3), PALETTE.woodDark)
  for (const x of [SPAWN.x - 3.2, SPAWN.x + 3.2]) {
    const lantern = engine.addEntity()
    Transform.create(lantern, { position: Vector3.create(x, 3.75, gz), scale: Vector3.create(0.36, 0.36, 0.36) })
    MeshRenderer.setSphere(lantern)
    Material.setPbrMaterial(lantern, { albedoColor: PALETTE.lamp, emissiveColor: Color3.fromHexString('#ffc773'), emissiveIntensity: 3, roughness: 0.3, metallic: 0 })
  }
  label(Vector3.create(SPAWN.x, 4.35, gz), 'ARENA LOUNGE', 3.4, Color4.White(), 10)
  label(Vector3.create(SPAWN.x, 2.95, gz), 'Pick a table, take a seat, play a friend', 1.5, PALETTE.cream, 10)
  infoKiosk(SPAWN.x - 4.6, SPAWN.z + 1.6)
}
