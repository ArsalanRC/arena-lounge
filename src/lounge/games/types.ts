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
import type ReactEcs from '@dcl/sdk/react-ecs'
import type { BotDifficulty } from '../../engine/types'

export type GameId = 'connectfour' | 'dotlines'

/** Seat numbers as stored in TableBoard.turn / winner (0 = nobody). */
export type SeatNo = 1 | 2

export const WIN_NONE = 0
export const WIN_DRAW = 3

export interface GameContext {
  /** Table root entity: a stable per-table key for plugin-local state. */
  root: Entity
  /** Seat of the local player at this table, 0 when spectating. */
  mySeat: 0 | SeatNo
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
}

export interface TableGame<S = unknown, A = unknown> {
  id: GameId
  /** Full name for cards and signs. */
  label: string
  /** Names of the two sides in seat order, e.g. ['Yellow', 'Red']. */
  seatNames: [string, string]
  /** UI sprite paths for the two sides (disc / chip images). */
  seatSprites: [string, string]

  /** A fresh state where `opening` moves first. */
  newGame(opening: SeatNo): S
  encode(state: S): string
  decode(json: string): S
  /** Seat to move, 0 once the game is over. */
  turnSeat(state: S): 0 | SeatNo
  finished(state: S): boolean
  /** 1 or 2 for a winning seat, WIN_DRAW for a draw, WIN_NONE while running. */
  winner(state: S): number
  /**
   * Apply an action for `seat`. Must validate fully (turn, legality) and
   * return null for anything illegal; never throw.
   */
  apply(state: S, action: A, seat: SeatNo): S | null
  botAction(state: S, difficulty: BotDifficulty): A | null

  /** Build the game's 3D presentation parented to the table root. */
  createView3D(root: Entity, onAction: (action: A) => void): View3DHandle
  /** Seated controller / spectator board. */
  Controls: (props: { state: S; ctx: GameContext; compact: boolean }) => ReactEcs.JSX.Element
}
