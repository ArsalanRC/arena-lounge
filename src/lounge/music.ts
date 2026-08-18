/**
 * Background music: one global, looping AudioSource with the lounge loop from
 * tools/gen-music.py (an original synthesised track, so no licence questions).
 * Local only: every visitor can switch it off in the "?" panel.
 */
import { AudioSource, Entity, Transform, engine } from '@dcl/sdk/ecs'

export const music = { on: true, entity: null as Entity | null }

export function setupMusic(): void {
  const e = engine.addEntity()
  Transform.create(e)
  AudioSource.create(e, { audioClipUrl: 'assets/Audio/lounge-loop.ogg', playing: true, loop: true, volume: 0.3, global: true })
  music.entity = e
}

export function toggleMusic(): void {
  music.on = !music.on
  if (music.entity !== null) AudioSource.getMutable(music.entity).playing = music.on
}
