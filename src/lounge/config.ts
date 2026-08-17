/**
 * Scene layout + palette for Arena Lounge.
 *
 * The scene is a 3x3 parcel World (48 m x 48 m): the fenced 32 m lounge sits
 * in the middle of a garden ring, and the twisted tower rises over the plaza
 * with two more floors (game room, rooftop) reached by the elevator pads.
 * Every table is a self-contained group parented to a root entity, so table
 * geometry is authored in *local* metres and placed with `position` +
 * `rotationY` here.
 *
 * Local table frame: the Four in a Row board stands on the table facing -Z.
 * Seat A (yellow) is on the -Z side, seat B (red) on the +Z side.
 */
import { Color3, Color4, Vector3 } from '@dcl/sdk/math'
import type { GameId } from './games/types'

/** Scene edge length in metres (3x3 parcels). */
export const SCENE_SIZE = 48
/** The fenced lounge (parquet + wooden boundary) is centred in the scene. */
export const LOUNGE_SIZE = 32
export const LOUNGE_MIN = (SCENE_SIZE - LOUNGE_SIZE) / 2
export const LOUNGE_MAX = LOUNGE_MIN + LOUNGE_SIZE

/** Where new players appear (also mirrored in scene.json spawnPoints). */
export const SPAWN = Vector3.create(24, 0, 12.5)

export interface FloorDef {
  id: number
  /** Shown on the elevator panel. */
  name: string
  y: number
}

/** The tower's floors; the elevator pads teleport between them. */
export const FLOORS: FloorDef[] = [
  { id: 0, name: 'Lounge', y: 0 },
  { id: 1, name: 'Game room', y: 8 },
  { id: 2, name: 'Sky room', y: 16 },
  { id: 3, name: 'Rooftop', y: 24 }
]

/**
 * Elevator shafts (same x/z on every floor): one beside the entrance
 * (south-east of the plaza), one at the far side (north-west), both between
 * corners on every floor. Standing on a pad opens the floor panel.
 */
export const ELEVATORS: Vector3[] = [Vector3.create(29.5, 0, 17), Vector3.create(16.6, 0, 29)]
/** Standing within this distance of a pad opens the floor panel. */
export const ELEVATOR_RADIUS = 1.3

/** Fixed time of day for the skybox (seconds since midnight): 21:00, a lit lounge at night, DCL night stays readable. */
export const DUSK_TIME = 72000

/**
 * Real point lights (LightSource). Warm amber inside, teal at the entrance;
 * the client renders the few closest to the player and culls the rest, so
 * they are spread out: plaza, portal, game room, rooftop. Everything else that
 * looks lit is emissive (string lights, collars, rims, rug rings).
 */

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
  /** Zone the table belongs to (rug tint, banner). */
  zone: number
}

/** Centre of the round plaza the corners face (and the tower axis); the kiosk and sign live south of it. */
export const PLAZA = Vector3.create(24, 0, 24)

/** Point lights as offsets from the plaza centre (dx, dz) so the whole tower can move as one. */
const LIGHT_SPEC: Array<{ dx: number; y: number; dz: number; color: Color3; intensity: number; range: number }> = [
  { dx: 0, y: 5.6, dz: 0, color: Color3.create(1, 0.78, 0.5), intensity: 3200, range: 16 },
  { dx: 0, y: 6.5, dz: -14.3, color: Color3.create(0.55, 0.9, 1), intensity: 2400, range: 12 },
  { dx: -5.5, y: 4.2, dz: -9.5, color: Color3.create(1, 0.72, 0.42), intensity: 1200, range: 9 },
  { dx: 5.5, y: 4.2, dz: -9.5, color: Color3.create(1, 0.72, 0.42), intensity: 1200, range: 9 },
  { dx: 0, y: 13.5, dz: 6.5, color: Color3.create(1, 0.78, 0.5), intensity: 2600, range: 14 },
  { dx: 0, y: 13.5, dz: -6.5, color: Color3.create(1, 0.78, 0.5), intensity: 2600, range: 14 },
  { dx: 0, y: 21, dz: 4.5, color: Color3.create(1, 0.78, 0.5), intensity: 2400, range: 13 },
  { dx: 0, y: 21, dz: -4.5, color: Color3.create(1, 0.78, 0.5), intensity: 2400, range: 13 },
  { dx: 0, y: 28.5, dz: 0, color: Color3.create(1, 0.82, 0.55), intensity: 3000, range: 16 }
]
export const LIGHTS: Array<{ x: number; y: number; z: number; color: Color3; intensity: number; range: number }> = LIGHT_SPEC.map((l) => ({ x: PLAZA.x + l.dx, y: l.y, z: PLAZA.z + l.dz, color: l.color, intensity: l.intensity, range: l.range }))

export interface ZoneDef {
  id: number
  gameId: GameId
  /** Zone centre on the ring around the plaza (y = floor height). */
  position: Vector3
  /** Rug tint (multiplies the neutral rug texture). */
  rug: Color4
  /** Banner colour. */
  banner: Color4
  /** Number of tables in the corner (side by side along the tangent). */
  tables: number
  /** Index into FLOORS. */
  floor: number
}

/** Point on the ring around the plaza at `deg` (0 = north, clockwise seen from above) and radius `r`, on floor `f`. */
function ring(deg: number, r: number, f: number): Vector3 {
  const t = (deg * Math.PI) / 180
  return Vector3.create(PLAZA.x + Math.sin(t) * r, FLOORS[f].y, PLAZA.z + Math.cos(t) * r)
}

/**
 * Ground floor: six corners around the plaza, entrance (spawn) to the south.
 * Game room (floor 1): four corners on the annular slab. Empty corners are
 * reserved for games that are not built yet: they show a "coming soon"
 * banner and get their rug + tables only once the plugin exists.
 */
export const ZONES: ZoneDef[] = [
  { id: 0, gameId: 'connectfour', position: Vector3.create(14.02, 0, 18.69), rug: Color4.fromHexString('#3f8fa3ff'), banner: Color4.fromHexString('#1f4e5fff'), tables: 2, floor: 0 },
  { id: 1, gameId: 'dotlines', position: Vector3.create(13.19, 0, 26.06), rug: Color4.fromHexString('#d9c08aff'), banner: Color4.fromHexString('#a5843dff'), tables: 1, floor: 0 },
  { id: 2, gameId: 'matchpairs', position: Vector3.create(18.08, 0, 33.15), rug: Color4.fromHexString('#a68bd6ff'), banner: Color4.fromHexString('#6b4fa3ff'), tables: 1, floor: 0 },
  { id: 3, gameId: 'checkers', position: Vector3.create(29.92, 0, 33.15), rug: Color4.fromHexString('#c46b6bff'), banner: Color4.fromHexString('#7a2e2eff'), tables: 1, floor: 0 },
  { id: 4, gameId: 'reversi', position: Vector3.create(34.81, 0, 26.06), rug: Color4.fromHexString('#6fae7cff'), banner: Color4.fromHexString('#2f6b46ff'), tables: 1, floor: 0 },
  { id: 5, gameId: 'tictactoe', position: Vector3.create(33.62, 0, 18.88), rug: Color4.fromHexString('#e0917aff'), banner: Color4.fromHexString('#b8523aff'), tables: 1, floor: 0 },
  { id: 6, gameId: 'chess', position: ring(0, 9.3, 1), rug: Color4.fromHexString('#8f5d8aff'), banner: Color4.fromHexString('#5a2f57ff'), tables: 1, floor: 1 },
  { id: 7, gameId: 'backgammon', position: ring(90, 9.3, 1), rug: Color4.fromHexString('#a6743fff'), banner: Color4.fromHexString('#6b4423ff'), tables: 1, floor: 1 },
  { id: 8, gameId: 'crocsnap', position: ring(180, 9.3, 1), rug: Color4.fromHexString('#4f9d6bff'), banner: Color4.fromHexString('#2c5e3fff'), tables: 1, floor: 1 },
  { id: 9, gameId: 'ludo', position: ring(270, 9.3, 1), rug: Color4.fromHexString('#d9a441ff'), banner: Color4.fromHexString('#8a6420ff'), tables: 1, floor: 1 },
  { id: 10, gameId: 'supertictactoe', position: ring(45, 9.3, 1), rug: Color4.fromHexString('#e0917aff'), banner: Color4.fromHexString('#b8523aff'), tables: 1, floor: 1 },
  { id: 11, gameId: 'snakesladders', position: ring(225, 9.3, 1), rug: Color4.fromHexString('#7fb069ff'), banner: Color4.fromHexString('#3f7a3aff'), tables: 1, floor: 1 },
  { id: 12, gameId: 'seastrike', position: ring(0, 7.6, 2), rug: Color4.fromHexString('#4f7fb0ff'), banner: Color4.fromHexString('#1f4e7fff'), tables: 1, floor: 2 },
  { id: 13, gameId: 'diceroyale', position: ring(180, 7.6, 2), rug: Color4.fromHexString('#9b6fd0ff'), banner: Color4.fromHexString('#5a3a8aff'), tables: 1, floor: 2 }
]

/** Games that have a plugin today; zones for other games stay empty until then. */
export const BUILT_GAMES: GameId[] = ['connectfour', 'dotlines', 'reversi', 'tictactoe', 'matchpairs', 'checkers', 'chess', 'crocsnap', 'backgammon', 'ludo', 'supertictactoe', 'snakesladders', 'seastrike', 'diceroyale']

/** Yaw (degrees) so that a table's front (-Z) points at `target`. */
export function yawToward(from: Vector3, target: Vector3): number {
  return (Math.atan2(-(target.x - from.x), -(target.z - from.z)) * 180) / Math.PI
}

function buildTables(): TableDef[] {
  const out: TableDef[] = []
  let n = 0
  for (const z of ZONES) {
    if (!BUILT_GAMES.includes(z.gameId)) continue
    const yaw = yawToward(z.position, PLAZA)
    // tangent direction (perpendicular to the line towards the plaza) for side-by-side tables
    const t = (yaw * Math.PI) / 180
    const tx = Math.cos(t)
    const tz = -Math.sin(t)
    for (let i = 0; i < z.tables; i++) {
      const off = (i - (z.tables - 1) / 2) * 3.4
      const pos = Vector3.create(z.position.x + tx * off, z.position.y, z.position.z + tz * off)
      out.push({ id: n, gameId: z.gameId, label: `Table ${n + 1}`, position: pos, rotationY: yawToward(pos, PLAZA), zone: z.id })
      n++
    }
  }
  return out
}

/** Tables actually present in the scene (derived from ZONES + BUILT_GAMES). */
export const TABLES: TableDef[] = buildTables()

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

/**
 * Dev aid: preview the phone layout in the desktop Explorer (1600x720 virtual
 * canvas, compact controller, phone panel placement). Flip it locally while
 * tuning the mobile UI; never commit `true`.
 */
export const DEBUG_MOBILE_UI = false

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
  /** Seat pads are neutral: colours are dealt at random each round. */
  pad: Color4.fromHexString('#b89a70ff'),
  cream: Color4.fromHexString('#f2e8d5ff'),
  lamp: Color4.fromHexString('#ffd9a0ff'),
  plant: Color4.fromHexString('#3f7d4eff'),
  pot: Color4.fromHexString('#8b5a3cff'),
  lawn: Color4.fromHexString('#4a7d3fff'),
  path: Color4.fromHexString('#b8a284ff'),
  column: Color4.fromHexString('#6b4a33ff')
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
