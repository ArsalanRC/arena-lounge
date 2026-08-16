/**
 * Scene layout + palette for Arena Lounge.
 *
 * The scene is a 2x2 parcel World (32 m x 32 m). Every table is a self-
 * contained group parented to a root entity, so table geometry is authored in
 * *local* metres and placed with `position` + `rotationY` here.
 *
 * Local table frame: the Connect Four board stands on the table facing -Z.
 * Seat A (yellow) is on the -Z side, seat B (red) on the +Z side.
 */
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import type { GameId } from './games/types'

/** Scene edge length in metres (2x2 parcels). */
export const SCENE_SIZE = 32

/** Where new players appear (also mirrored in scene.json spawnPoints). */
export const SPAWN = Vector3.create(16, 0, 10)

export interface TableDef {
  /** 0-based table index, also used to derive the network sync id. */
  id: number
  /** Which game plugin this table hosts. */
  gameId: GameId
  /** Human label shown on the floating sign. */
  label: string
  position: Vector3
  /** Rotation around Y in degrees; 0 = board faces -Z (towards spawn). */
  rotationY: number
}

/** Three tables in a shallow arc north of the spawn point. */
export const TABLES: TableDef[] = [
  { id: 0, gameId: 'connectfour', label: 'Table 1', position: Vector3.create(9.5, 0, 19), rotationY: 35 },
  { id: 1, gameId: 'connectfour', label: 'Table 2', position: Vector3.create(16, 0, 21.5), rotationY: 0 },
  { id: 2, gameId: 'dotlines', label: 'Table 3', position: Vector3.create(22.5, 0, 19), rotationY: -35 }
]

/** Base network sync id for table entities (table i uses SYNC_TABLE_BASE + i). */
export const SYNC_TABLE_BASE = 100

/** Gameplay tunables. */
export const TURN_LIMIT_MS = 60_000 // a player has 60 s per move
export const SEAT_STALE_MS = 30_000 // seat with no heartbeat for 30 s is freed
export const HEARTBEAT_MS = 5_000
export const BOT_THINK_MS = 700 // small delay so the bot feels like a player
export const AUTO_STAND_DISTANCE = 7 // metres from the table before auto-stand
export const AUTO_STAND_AFTER_MS = 8_000
export const NEAR_TABLE_DISTANCE = 4.5 // metres: shows the table UI / seat buttons
export const AFK_MS = 150_000 // idle at a table (when it is on you to act) frees the seat

/** Distance from a table centre to each seat pad centre (local Z). */
export const SEAT_PAD_OFFSET = 1.8

// ---------------------------------------------------------------- palette
export const PALETTE = {
  floor: Color4.fromHexString('#2b2320ff'),
  floorTrim: Color4.fromHexString('#3d322cff'),
  rug: Color4.fromHexString('#7a4636ff'),
  rugRing: Color4.fromHexString('#a35a3fff'),
  wood: Color4.fromHexString('#5a3e2bff'),
  woodDark: Color4.fromHexString('#3a2a1eff'),
  frame: Color4.fromHexString('#1f4e5fff'),
  frameDark: Color4.fromHexString('#173b48ff'),
  yellow: Color4.fromHexString('#f5c518ff'),
  red: Color4.fromHexString('#e2453dff'),
  padYellow: Color4.fromHexString('#c9a012ff'),
  padRed: Color4.fromHexString('#b8362fff'),
  cream: Color4.fromHexString('#f2e8d5ff'),
  lamp: Color4.fromHexString('#ffd9a0ff'),
  plant: Color4.fromHexString('#3f7d4eff'),
  pot: Color4.fromHexString('#8b5a3cff')
}

export const EMISSIVE_YELLOW = Color3.fromHexString('#f5c518')
export const EMISSIVE_RED = Color3.fromHexString('#ff5a4d')

// ---------------------------------------------------------------- UI colours
export const UI = {
  panel: Color4.create(0.09, 0.08, 0.08, 0.86),
  panelSoft: Color4.create(0.16, 0.14, 0.13, 0.9),
  text: Color4.fromHexString('#f7f1e6ff'),
  muted: Color4.fromHexString('#c9bfb2ff'),
  accent: Color4.fromHexString('#2f8fa3ff'),
  accentSoft: Color4.fromHexString('#256f80ff'),
  /** Tint applied to the pill sprite when showing a toast. */
  accentTint: Color4.fromHexString('#7fd0e0ff'),
  danger: Color4.fromHexString('#a33a33ff'),
  yellow: Color4.fromHexString('#f5c518ff'),
  red: Color4.fromHexString('#e2453dff'),
  boardBg: Color4.fromHexString('#1f4e5fff'),
  hole: Color4.fromHexString('#0f2a33ff'),
  win: Color4.fromHexString('#ffffffff')
}
