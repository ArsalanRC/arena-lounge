/**
 * Sound effects. All clips are tiny synthesised WAVs (tools/gen-sounds.py).
 *
 * AudioSource is a local (unsynced) component, so a sound triggered on this
 * client is heard only here; every client decides for itself when to play,
 * driven by the synced state it observes. Table sounds are spatial (attached
 * to the table), the personal cues are `global` so they are always audible.
 */
import { AudioSource, Entity, Transform, engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

const CLIPS = {
  drop: 'assets/Audio/drop.wav',
  win: 'assets/Audio/win.wav',
  lose: 'assets/Audio/lose.wav',
  turn: 'assets/Audio/turn.wav',
  sit: 'assets/Audio/sit.wav'
} as const

export type ClipName = keyof typeof CLIPS

function makeSource(clip: ClipName, opts: { parent?: Entity; position?: Vector3; global?: boolean; volume?: number }): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent: opts.parent, position: opts.position ?? Vector3.Zero() })
  AudioSource.create(e, {
    audioClipUrl: CLIPS[clip],
    playing: false,
    loop: false,
    volume: opts.volume ?? 1,
    global: opts.global ?? false
  })
  return e
}

/** Per-table spatial sources, created by table3d for each table root. */
export interface TableSfx {
  /** Played on every move (the Connect Four "disc lands" thunk). */
  move: Entity
  win: Entity
}

export function createTableSfx(root: Entity, at: Vector3): TableSfx {
  return {
    move: makeSource('drop', { parent: root, position: at, volume: 0.9 }),
    win: makeSource('win', { parent: root, position: at, volume: 0.8 })
  }
}

/** Personal cues for the local player. */
const personal: Partial<Record<ClipName, Entity>> = {}

export function setupPersonalSfx(): void {
  personal.turn = makeSource('turn', { global: true, volume: 0.7 })
  personal.sit = makeSource('sit', { global: true, volume: 0.6 })
  personal.lose = makeSource('lose', { global: true, volume: 0.6 })
}

export function play(entity: Entity | undefined): void {
  if (entity === undefined) return
  const src = AudioSource.getOrNull(entity)?.audioClipUrl
  if (!src) return
  AudioSource.playSound(entity, src, true)
}

export function playPersonal(clip: 'turn' | 'sit' | 'lose'): void {
  play(personal[clip])
}
