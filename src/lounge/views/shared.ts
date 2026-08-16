/** Small primitive builders shared by the table and the game views. */
import { Entity, Material, MeshRenderer, TextureWrapMode, Transform, engine } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

/** Bar-height table: a standing player in first person sees the board level. */
export const TABLE_TOP_Y = 1.02

export function box(parent: Entity, pos: Vector3, scale: Vector3, color: Color4, rotY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: pos, scale, rotation: Quaternion.fromEulerDegrees(0, rotY, 0) })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: color, roughness: 0.85, metallic: 0 })
  return e
}

export function woodBox(parent: Entity, pos: Vector3, scale: Vector3, tiling: Vector3 = Vector3.One()): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: pos, scale })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, {
    texture: Material.Texture.Common({
      src: 'images/wood.png',
      wrapMode: TextureWrapMode.TWM_REPEAT,
      tiling: { x: tiling.x, y: tiling.y }
    }),
    roughness: 0.7,
    metallic: 0
  })
  return e
}
