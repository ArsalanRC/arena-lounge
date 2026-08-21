/**
 * Sprite atlas helpers. Every UI sprite in images/ui/*.png is packed into one
 * sheet (images/ui/atlas.png, tools/gen-atlas.py writes atlas.gen.ts with the
 * pixel rects), so the client fetches one texture instead of ~36 and the
 * mobile texture budget stays small.
 *
 * UV convention: v = 0 is the bottom of the image, v = 1 the top (what the
 * client applies to planes, boxes and UI backgrounds); the pixel rects count
 * rows from the top, so v is flipped here. Corner order for the client is
 * bottom-left, bottom-right, top-right, top-left.
 */
import { MeshRenderer, type Entity } from '@dcl/sdk/ecs'
import { ATLAS_SIZE, SPRITES, type SpriteName } from './atlas.gen'
import { phone } from './device'

export type { SpriteName } from './atlas.gen'
export const ATLAS = 'images/ui/atlas.png'

/** [u0, v0, u1, v1] of a sprite (v0 bottom edge, v1 top edge). */
export function spriteRect(name: SpriteName): [number, number, number, number] {
  const [x, y, w, h] = SPRITES[name]
  const [W, H] = ATLAS_SIZE
  return [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H]
}

/** Eight UVs for a UI background or one plane face: bottom-left, bottom-right, top-right, top-left. */
export function spriteUvs(name: SpriteName): number[] {
  const [u0, v0, u1, v1] = spriteRect(name)
  return [u0, v0, u1, v0, u1, v1, u0, v1]
}

/** Plane showing the sprite on both faces (the back face mirrored so it reads the same from behind). */
export function spritePlane(entity: Entity, name: SpriteName): void {
  const [u0, v0, u1, v1] = spriteRect(name)
  MeshRenderer.setPlane(entity, [u0, v0, u1, v0, u1, v1, u0, v1, u1, v0, u0, v0, u0, v1, u1, v1])
}

/** Box showing the sprite on all six faces (thin boxes double as two-sided sprites). */
export function spriteBox(entity: Entity, name: SpriteName): void {
  const face = spriteUvs(name)
  const uvs: number[] = []
  for (let i = 0; i < 6; i++) uvs.push(...face)
  MeshRenderer.setBox(entity, uvs)
}

/** UI background props for a sprite (stretch mode, optional tint). The mobile client ignores
 * custom uvs on UiBackground (docs: build-for-mobile missing features; live 21 Aug: every
 * board sprite invisible on the phone), so phones read the sprite's own file instead
 * (images/ui/sprites/, tools/gen-sprite-files.py) and only load what a table actually shows. */
export function uiSprite(name: SpriteName, color?: { r: number; g: number; b: number; a: number }): { texture: { src: string }; textureMode: 'stretch'; uvs?: number[]; color?: { r: number; g: number; b: number; a: number } } {
  if (phone()) return { texture: { src: `images/ui/sprites/${name}.png` }, textureMode: 'stretch', color }
  return { texture: { src: ATLAS }, textureMode: 'stretch', uvs: spriteUvs(name), color }
}
