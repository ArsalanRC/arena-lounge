/** Small primitive builders shared by the table and the game views. */
import { ColliderLayer, Entity, InputAction, Material, MeshCollider, MeshRenderer, TextureWrapMode, Transform, engine, pointerEventsSystem } from '@dcl/sdk/ecs'
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

/**
 * Convert a scene-space point (e.g. a pointer hit) into the table's local
 * frame. Table roots only ever carry a position and a rotation around Y.
 */
export function toTableLocal(root: Entity, p: { x: number; y: number; z: number }): Vector3 {
  const tr = Transform.get(root)
  const q = tr.rotation
  const yaw = Quaternion.toEulerAngles(Quaternion.create(q.x, q.y, q.z, q.w)).y
  const t = (yaw * Math.PI) / 180
  const dx = p.x - tr.position.x
  const dz = p.z - tr.position.z
  // inverse of the Y rotation: x' = x cos + z sin ; z' = -x sin + z cos
  return Vector3.create(dx * Math.cos(t) - dz * Math.sin(t), p.y - tr.position.y, dx * Math.sin(t) + dz * Math.cos(t))
}

/**
 * One invisible box collider covering a whole board; the callback receives
 * the hit point in table-local coordinates so views can map it to a cell.
 * Replaces one-collider-per-cell (entity budget).
 */
export function boardHitArea(root: Entity, centre: Vector3, size: Vector3, hoverText: string, onHit: (local: Vector3) => void): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent: root, position: centre, scale: size })
  MeshCollider.setBox(e, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    { entity: e, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 6, showHighlight: false } },
    (event) => {
      const p = event.hit?.position
      if (!p) return
      onHit(toTableLocal(root, p))
    }
  )
  return e
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(v)))
}

/**
 * Entities a game view only needs while a round is running (pieces, discs,
 * lines): built on first use, removed when the table goes idle. The client
 * counts every mesh renderer against the mobile budget, visible or not, so
 * idle tables should cost nothing beyond their board.
 */
export class LazyPool<T = Entity> {
  private items: T[] | null = null
  constructor(private readonly build: () => T[], private readonly entityOf: (item: T) => Entity = (item) => item as unknown as Entity) {}
  /** The pool, built if needed. */
  get(): T[] {
    if (this.items === null) this.items = this.build()
    return this.items
  }
  get live(): boolean {
    return this.items !== null
  }
  /** Remove every pooled entity; the next get() rebuilds. */
  release(): void {
    if (this.items === null) return
    for (const item of this.items) engine.removeEntity(this.entityOf(item))
    this.items = null
  }
  /** Forget the items without touching entities (the caller removed them itself). */
  releaseHandled(): void {
    this.items = null
  }
}
