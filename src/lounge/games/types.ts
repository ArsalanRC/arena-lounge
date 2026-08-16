/**
 * The contract a game must fulfil to be hosted on a lounge table.
 *
 * Tables are game-agnostic: seats, turn timer, bot driving, series score and
 * networking live in tables.ts and only talk to a game through this
 * interface. The engine state itself travels as a JSON string inside the
 * synced TableBoard component, so any pure engine from src/engine can be
 * hosted without touching the sync layer.
 *
 * Presentation is split the same way: `View3D` builds the physical game on
 * top of the shared table geometry, `Controls` renders the seated player's
 * touch controller (and the read-only spectator board).
 */
import type { Entity } from '@dcl/sdk/ecs'
import type { Color4 } from '@dcl/sdk/math'
import type ReactEcs from '@dcl/sdk/react-ecs'
import type { BotDifficulty } from '../../engine/types'

/** Hosted games plus the ids reserved for the game-room corners (banner until the plugin lands). */
export type GameId = 'connectfour' | 'dotlines' | 'reversi' | 'tictactoe' | 'matchpairs' | 'checkers' | 'chess' | 'backgammon' | 'crocsnap' | 'ludo' | 'supertictactoe' | 'snakesladders' | 'seastrike' | 'diceroyale'

/** Game side numbers (1 = the game's first colour); most games use 1..2, Ludo up to 4. */
export type SeatNo = 1 | 2 | 3 | 4

export const WIN_NONE = 0
/** Must stay clear of the side numbers (state.ts Winner.Draw). */
export const WIN_DRAW = 9

export interface GameContext {
  /** Table root entity: a stable per-table key for plugin-local state. */
  root: Entity
  /**
   * The game side the local player plays at this table: 1 = the game's first
   * side (yellow / white / X / red), 2 = the second and so on, 0 when
   * spectating. Sides are dealt at random and rotate per round; the physical
   * chair is separate (see `behind`).
   */
  mySeat: 0 | SeatNo
  /** True when the local player sits behind the upright board (physical seat B) and sees it mirrored left-right. */
  behind: boolean
  /** True when the local player may act right now. */
  myTurn: boolean
  /** Send an action for the local player; returns false if rejected. */
  act: (action: unknown) => boolean
}

export interface View3DHandle {
  /** Reconcile visuals with a freshly decoded state; called on every change. */
  update(state: unknown, info: { lastAction: unknown; animate: boolean; round: number; winner: number }): void
  /** Called on a fresh round (or when the table resets) before update(). */
  reset(): void
  /**
   * Called when the table has no game running (nobody seated, or waiting for
   * the second player): a good moment to release pooled piece entities, see
   * views/shared.ts LazyPool. update() must rebuild what it needs.
   */
  idle?(): void
}

export interface TableGame<S = unknown, A = unknown> {
  id: GameId
  /** Full name for cards and signs. */
  label: string
  /** Names of the sides in side order, e.g. ['Yellow', 'Red'] (as many as `seats`). */
  seatNames: string[]
  /** UI sprite paths for the sides (disc / chip images). */
  seatSprites: string[]
  /** Optional tints applied to seatSprites in chips (for white sprites). */
  seatSpriteTints?: Color4[]
  /** Button tints for the sides (seat buttons, turn colour). */
  seatColors: Color4[]
  /**
   * Physical seats at the table (default 2). A multi-seat game gets a square
   * table with a pad on every side; the first seated player picks how many
   * play (2..seats) and the round starts when that many are seated.
   */
  seats?: number

  /**
   * A fresh state where side `opening` moves first (the lounge always passes
   * 1: the game's own first mover; chairs get sides at random) for `players`
   * sides (2 unless the game seats more).
   */
  newGame(opening: SeatNo, players: number): S
  encode(state: S): string
  decode(json: string): S
  /** Seat to move, 0 once the game is over. */
  turnSeat(state: S): 0 | SeatNo
  finished(state: S): boolean
  /** The winning side (1..seats), WIN_DRAW for a draw, WIN_NONE while running. */
  winner(state: S): number
  /**
   * Apply an action for `seat`. Must validate fully (turn, legality) and
   * return null for anything illegal; never throw.
   */
  apply(state: S, action: A, seat: SeatNo): S | null
  botAction(state: S, difficulty: BotDifficulty): A | null
  /**
   * Optional: an action the game wants applied on its own after a delay,
   * e.g. flipping mismatched cards back. Applied for the seat to move by the
   * client driving that seat (the human sharing the table when it is a bot).
   */
  pending?(state: S): { delayMs: number; action: A } | null

  /**
   * Build the game's 3D presentation parented to the table root. `getState`
   * returns the current decoded state (null while waiting) so 3D taps can
   * resolve multi-step input such as select-then-move.
   */
  createView3D(root: Entity, onAction: (action: A) => void, getState: () => S | null): View3DHandle
  /**
   * Seated controller / spectator board. `phone` asks for the phone layout:
   * touch targets of 56+ units and at most ~520 units of height (the phone
   * canvas is 1600x720). Games with a strip mode (see `hasStrip`) render the
   * strip on the phone unless `fullBoard` is set.
   */
  Controls: (props: { state: S; ctx: GameContext; phone: boolean; fullBoard: boolean }) => ReactEcs.JSX.Element
  /**
   * True when the phone controller is a compact strip rather than the board
   * itself, so the UI offers a "Show board" toggle. Games whose controller is
   * the board leave it unset.
   */
  hasStrip?: boolean
}
