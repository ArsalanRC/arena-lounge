/**
 * Screen-space UI: the mobile-first controller (game-agnostic part).
 *
 * On phones, tapping a 3D object means aiming the crosshair and pressing the
 * interaction button, which is slow for a board game. Screen UI is tapped
 * directly, so the UI is the controller and the 3D table is the shared show.
 *
 * Layers, top to bottom of the file:
 *  - Hint    top centre, one quiet line for onboarding; hidden whenever a
 *            card, controller or panel is showing (it would repeat them)
 *  - Toast   top centre below the hint, tinted, short-lived feedback
 *  - Card    near a table: seat buttons, or the live board when both seats
 *            are taken (spectating)
 *  - Elevator  on a pad: floor picker (Lounge / Game room / Rooftop)
 *  - Controller  seated: the game's own controls + status; a right-docked
 *            column on desktop, a three-column bar along the bottom on phones
 *  - Help    "How to play": one tab per game, rules overview in the chosen
 *            language, lounge tips, language picker behind a toggle
 *
 * Visuals come from pre-shaded sprites packed into one atlas (see atlas.ts,
 * built by tools/gen-atlas.py) because mobile has no borderRadius /
 * nine-slice; every panel and button is a stretched rounded texture.
 * React hooks are not available in React-ECS; the renderer runs every frame
 * and reads module state + synced components.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Input, ReactEcsRenderer, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { isStateSyncronized } from '@dcl/sdk/network'
import { isMobile } from '@dcl/sdk/platform'
import { uiSprite, type SpriteName } from './atlas'
import { DEBUG_MOBILE_UI, FLOORS, TURN_LIMIT_MS, UI } from './config'
import { botSettings } from './games/botSettings'
import { board, leaderboardEnabled, refreshLeaderboard } from './leaderboard'
import { feedbackEnabled, sendFeedback } from './feedback'
import { music, toggleMusic } from './music'
import { getGame } from './games/registry'
import type { GameContext, GameId } from './games/types'
import { LOCALES, localeInfo, t as L, uiLang } from './i18n'
import { SEAT_A, SEAT_B, Status, Winner, winsOf, type Seat } from './state'
import {
  act,
  boardOf,
  dismissBot,
  findMySeat,
  gameStateOf,
  getTable,
  inviteBot,
  local,
  me,
  mySeatAt,
  otherSeat,
  amHost,
  occupiedSeats,
  seatsOf,
  setPlayers,
  targetPlayers,
  botAt,
  rematch,
  rideTo,
  seatOf,
  sideOf,
  sitAnywhere,
  sitWithBot,
  stand,
  tables,
  type Table
} from './tables'

export function setupUi(): void {
  // Phones get a 1600x720 virtual canvas (the SDK overrides any 16:9 request
  // with it); desktop keeps 1920x1080. The debug flag emulates the phone canvas.
  const size = DEBUG_MOBILE_UI ? { virtualWidth: 1600, virtualHeight: 720 } : { virtualWidth: 1920, virtualHeight: 1080 }
  ReactEcsRenderer.setUiRenderer(LoungeUi, size)
}

/** True on the phone client (or when the phone layout is being emulated). */
function phone(): boolean {
  return DEBUG_MOBILE_UI || isMobile()
}

// ---------------------------------------------------------------- tokens

const WHITE = Color4.White()
const BTN_H = 52
const T = { title: 26, body: 20, small: 17, status: 22 }

type Margin = UiTransformProps['margin']
type Width = UiTransformProps['width']

function seatTint(t: Table, seat: Seat): Color4 {
  return t.game.seatColors[seat - 1]
}

/** Black text on light tints, cream on dark ones. */
function textOn(c: Color4): Color4 {
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  return lum > 0.55 ? Color4.Black() : UI.text
}

// ---------------------------------------------------------------- atoms

function Btn(props: {
  key?: string
  label: string
  onClick: () => void
  color?: Color4
  textColor?: Color4
  width?: Width
  fontSize?: number
  margin?: Margin
  quiet?: boolean
}) {
  const w = props.width ?? 'auto'
  return (
    <UiEntity
      uiTransform={{
        width: w,
        minWidth: typeof w === 'number' ? Math.min(w, 120) : 120,
        height: BTN_H,
        margin: props.margin ?? 4,
        padding: { left: 16, right: 16 },
        justifyContent: 'center',
        alignItems: 'center',
        pointerFilter: 'block'
      }}
      uiBackground={uiSprite('button', props.color ?? (props.quiet ? UI.panelSoft : UI.accent))}
      uiText={{ value: props.label, fontSize: props.fontSize ?? 20, color: props.textColor ?? (props.quiet ? UI.muted : UI.text), textAlign: 'middle-center' }}
      onMouseDown={props.onClick}
    />
  )
}

/** Centred single line of text. Needs an explicit height: with height 'auto'
 *  the renderer ignores textAlign and draws the text top-left. */
function Text(props: { value: string; size?: number; color?: Color4; margin?: Margin; width?: Width }) {
  const size = props.size ?? T.body
  return (
    <UiEntity
      uiTransform={{ width: props.width ?? '100%', height: Math.round(size * 1.45), margin: props.margin ?? 0, justifyContent: 'center', alignItems: 'center' }}
      uiText={{ value: props.value, fontSize: size, color: props.color ?? UI.text, textAlign: 'middle-center' }}
    />
  )
}

/** Left-aligned wrapped paragraph. */
function Para(props: { value: string; size?: number; color?: Color4; margin?: Margin; rtl?: boolean }) {
  return (
    <UiEntity
      uiTransform={{ width: '96%', height: 'auto', margin: props.margin ?? 0 }}
      uiText={{ value: props.value, fontSize: props.size ?? 18, color: props.color ?? UI.text, textAlign: props.rtl ? 'top-right' : 'top-left' }}
    />
  )
}

function Chip(props: { key?: string; sprite: SpriteName; label: string; reverse?: boolean; tint?: Color4; dim?: boolean; small?: boolean }) {
  const d = props.small ? 20 : 26
  const disc = <UiEntity uiTransform={{ width: d, height: d, margin: props.reverse ? { left: 6 } : { right: 6 } }} uiBackground={uiSprite(props.sprite, props.tint ?? WHITE)} />
  const label = <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: props.label, fontSize: props.small ? 15 : 19, color: props.dim ? UI.muted : UI.text }} />
  return (
    <UiEntity uiTransform={{ width: 'auto', height: 30, flexDirection: 'row', alignItems: 'center' }}>
      {props.reverse ? label : disc}
      {props.reverse ? disc : label}
    </UiEntity>
  )
}

function Row(props: { children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]; height?: number; margin?: Margin; wrap?: boolean }) {
  return (
    <UiEntity uiTransform={{ width: '100%', height: props.height ?? 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: props.margin ?? 0, flexWrap: props.wrap ? 'wrap' : 'nowrap' }}>
      {props.children}
    </UiEntity>
  )
}

/** Rounded dark panel; `place` positions it absolutely ('auto' width hugs the content). */
function Panel(props: { children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]; width: Width; place: UiTransformProps; padding?: number }) {
  return (
    <UiEntity
      uiTransform={{ ...props.place, width: props.width, height: 'auto', padding: props.padding ?? 16, flexDirection: 'column', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={uiSprite('panel')}
    >
      {props.children}
    </UiEntity>
  )
}

/** Segmented control: equal-width options, one active. */
function Segmented(props: { options: Array<{ key: string; label: string }>; active: string; onPick: (key: string) => void; width?: number; fontSize?: number }) {
  return (
    <UiEntity uiTransform={{ width: 'auto', height: 40, flexDirection: 'row', alignItems: 'center' }}>
      {props.options.map((o) => (
        <UiEntity
          key={o.key}
          uiTransform={{ width: props.width ?? 92, height: 40, margin: 2, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={uiSprite('button', props.active === o.key ? UI.accent : UI.panelSoft)}
          uiText={{ value: o.label, fontSize: props.fontSize ?? 16, color: props.active === o.key ? UI.text : UI.muted, textAlign: 'middle-center' }}
          onMouseDown={() => props.onPick(o.key)}
        />
      ))}
    </UiEntity>
  )
}

function secondsLeft(updatedAt: number): number {
  return Math.max(0, Math.ceil((TURN_LIMIT_MS - (Date.now() - updatedAt)) / 1000))
}

function contextFor(t: Table): GameContext {
  const chair = mySeatAt(t)
  const b = boardOf(t)
  return {
    root: t.root,
    mySeat: chair === 0 ? 0 : sideOf(t, chair),
    behind: chair === SEAT_B,
    myTurn: chair !== 0 && b.status === Status.Playing && b.turn === chair,
    act: (action) => act(t, action)
  }
}

/** Seat holder's name; the house bot's name is localised per viewer. */
function displayName(s: { name: string; bot: boolean }): string {
  return s.bot ? L().houseBot : s.name
}

/** "Table 5 · Checkers" with the table word and the game name in the UI language. */
function tableTitle(tb: Table): string {
  return `${L().table(tb.def.id + 1)} · ${localeInfo(uiLang.code).games[tb.game.id]?.name ?? tb.game.label}`
}

const bottomCentre = (width: number, bottom: number): UiTransformProps => ({ positionType: 'absolute', position: { bottom, left: '50%' }, margin: { left: -width / 2 } })
const rightMiddle = (width: number, halfHeight: number): UiTransformProps => ({ positionType: 'absolute', position: { right: 36, top: '50%' }, margin: { top: -halfHeight } })

// ---------------------------------------------------------------- hint + toast

function visibleTableCard(): Table | undefined {
  if (local.elevatorOpen) return undefined
  const t = local.nearTableId >= 0 ? getTable(local.nearTableId) : undefined
  if (!t || !me.ready || mySeatAt(t) || local.dismissedTableId === t.def.id) return undefined
  return t
}

function hintText(): string {
  if (!me.ready) return L().loadingProfile
  if (!isStateSyncronized() && !local.offline) return L().connecting
  if (findMySeat() || visibleTableCard() || local.helpOpen) return ''
  if (!local.hasEverSat) return L().walkUp
  return ''
}

function Hint() {
  const value = hintText()
  if (!value) return null
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 16, left: '50%' }, margin: { left: -260 }, width: 520, height: 52, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={uiSprite('pill', WHITE)}
      uiText={{ value, fontSize: T.body, color: UI.muted, textAlign: 'middle-center' }}
    />
  )
}

function Toast() {
  if (local.toast.until <= Date.now()) return null
  const top = hintText() ? 76 : 16
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top, left: '50%' }, margin: { left: -260 }, width: 520, height: 56, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={uiSprite('pill', UI.accentTint)}
      uiText={{ value: local.toast.text, fontSize: T.body, color: Color4.Black(), textAlign: 'middle-center' }}
    />
  )
}

// ---------------------------------------------------------------- table card

/** Easy / Medium / Hard for the house bot (a local setting, read at every bot move). */
function DifficultyPicker(props: { width: number; fontSize: number }) {
  const str = L()
  return (
    <Segmented
      options={[{ key: 'easy', label: str.easy }, { key: 'medium', label: str.medium }, { key: 'hard', label: str.hard }]}
      active={botSettings.difficulty}
      onPick={(k) => (botSettings.difficulty = k as typeof botSettings.difficulty)}
      width={props.width}
      fontSize={props.fontSize}
    />
  )
}

/** One line about who sits at a table: "A vs B · 2:1", "A is waiting for a rival", "A, B · waiting for 2 more…". */
function seatsLine(t: Table): string {
  const b = boardOf(t)
  const str = L()
  const seated = occupiedSeats(t)
  const names = seated.map((seat) => displayName(seatOf(t, seat)))
  if (seated.length === 0) return str.openTable
  if (t.seats === 2) {
    if (seated.length === 1) return str.waitingForRival(names[0])
    const both = str.vs(names[0], names[1])
    return b.status === Status.Playing ? `${both} · ${b.winsA}:${b.winsB}` : both
  }
  const list = str.seatedList(names)
  const missing = targetPlayers(t) - seated.length
  if (b.status !== Status.Playing && missing > 0) return `${list} · ${str.waitingForMore(missing)}`
  if (b.status === Status.Playing) return `${list} · ${seated.map((seat) => winsOf(b, seat)).join(':')}`
  return list
}

function TableCard() {
  const t = visibleTableCard()
  if (!t) return null
  const b = boardOf(t)
  const str = L()
  const seated = occupiedSeats(t)
  const full = seated.length >= t.seats
  const bothTaken = t.seats === 2 ? full : b.status === Status.Playing
  const line = seatsLine(t)
  const state = bothTaken ? gameStateOf(t) : null
  const emptyTable = seated.length === 0
  const canSit = !full && !(t.seats > 2 && b.status === Status.Playing)
  const W = 480
  return (
    <Panel width={W} place={bottomCentre(W, 36)}>
      <Text value={`${tableTitle(t)}`} size={T.title} />
      <Text value={line} size={T.body} color={UI.muted} margin={{ top: 2, bottom: 8 }} />
      {bothTaken && state !== null && !phone() && <t.game.Controls state={state} ctx={contextFor(t)} phone={false} fullBoard={false} />}
      {/* bot strength is chosen before the first round, not only after one is lost */}
      {emptyTable && (
        <Row height={44} margin={{ bottom: 6 }}>
          <UiEntity uiTransform={{ width: 'auto', height: 30, margin: { right: 8 } }} uiText={{ value: str.bot, fontSize: T.small, color: UI.muted }} />
          <DifficultyPicker width={phone() ? 74 : 88} fontSize={16} />
        </Row>
      )}
      <Row>
        {canSit && <Btn label={str.takeSeat} color={UI.accent} onClick={() => sitAnywhere(t)} width={220} />}
        {emptyTable && <Btn label={str.playBot} quiet onClick={() => sitWithBot(t)} fontSize={18} />}
        <Btn label="?" quiet onClick={() => (local.helpOpen = true)} width={52} />
        <Btn label={str.notNow} quiet onClick={() => (local.dismissedTableId = t.def.id)} />
      </Row>
    </Panel>
  )
}

// ---------------------------------------------------------------- controller

/**
 * Seated controller. Desktop: a column docked to the right (header, status,
 * the game's board, actions). Phone: a wide bar along the bottom of the
 * 1600x720 canvas with three columns, info | game controls | actions, so a
 * board with finger-sized cells fits next to its status instead of above it.
 */
function Controller() {
  const mine = findMySeat()
  if (!mine) return null
  const t = mine.table
  const seat = mine.seat
  const b = boardOf(t)
  const multi = t.seats > 2
  const seated = occupiedSeats(t)
  const players = targetPlayers(t)
  // the classic opponent (two-seat tables); on a multi-seat table the "opponent" is whoever is to move
  const opp = multi ? seatOf(t, (b.turn || otherSeat(seat)) as Seat) : seatOf(t, otherSeat(seat))
  const myTurn = b.status === Status.Playing && b.turn === seat
  const myWins = winsOf(b, seat)
  const oppWins = multi ? 0 : winsOf(b, otherSeat(seat))
  const mobile = phone()
  const state = gameStateOf(t)
  const sprites = t.game.seatSprites
  // colours are dealt per round: chips and the turn tint follow the game side, not the chair
  const mySide = sideOf(t, seat)
  const oppSide = multi ? sideOf(t, (b.turn || otherSeat(seat)) as Seat) : otherSeat(mySide)

  const str = L()
  let status = ''
  let statusColor = UI.text
  if (b.status === Status.Waiting) {
    status = seated.length < players ? (multi ? str.waitingForMore(players - seated.length) : str.waitingOpponent) : str.dealing
    statusColor = UI.muted
  } else if (b.status === Status.Playing) {
    const secs = secondsLeft(b.updatedAt)
    status = myTurn ? str.yourMove(secs) : str.thinking(displayName(opp), secs)
    if (myTurn) {
      const tint = seatTint(t, mySide)
      statusColor = textOn(tint) === UI.text ? UI.text : tint
    } else statusColor = UI.muted
  } else if (b.winner === Winner.Draw) status = str.draw
  else if (b.winner === seat) status = str.youWin
  else status = str.takesRound(displayName(seatOf(t, (b.winner || otherSeat(seat)) as Seat)))

  const host = amHost(t)
  const showBotInvite = b.status === Status.Waiting && seated.length < players && (multi ? host : true)
  // strength picker: while waiting (before inviting the bot) and between rounds against it
  const showDismiss = botAt(t) && b.status !== Status.Playing
  const showBotRow = showDismiss || showBotInvite
  const showRematch = b.status === Status.Finished && seated.length >= players
  const showBoardToggle = mobile && t.game.hasStrip === true
  const showPlayers = multi && host && b.status !== Status.Playing

  const header = multi ? (
    // every player at the table: sprite of their side, name, series wins; the mover is bright
    <UiEntity uiTransform={{ width: '100%', height: 30, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
      {seatsOf(t)
        .filter((x) => seatOf(t, x).addr !== '')
        .map((x) => {
          const sd = seatOf(t, x)
          const side = sideOf(t, x)
          const who = x === seat ? str.you : sd.bot ? str.bot : displayName(sd)
          const label = `${who.length > 8 ? who.slice(0, 7) + '…' : who} ${winsOf(b, x)}`
          return <Chip key={`h${x}`} sprite={sprites[side - 1]} label={label} tint={t.game.seatSpriteTints?.[side - 1]} dim={b.status === Status.Playing && b.turn !== x} small />
        })}
    </UiEntity>
  ) : (
    <UiEntity uiTransform={{ width: '100%', height: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Chip sprite={sprites[mySide - 1]} label={str.you} tint={t.game.seatSpriteTints?.[mySide - 1]} />
      <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: `${myWins} : ${oppWins}`, fontSize: 22, color: UI.text }} />
      <Chip sprite={sprites[oppSide - 1]} label={opp.addr === '' ? '—' : displayName(opp)} reverse tint={t.game.seatSpriteTints?.[oppSide - 1]} />
    </UiEntity>
  )
  // host of a multi-seat table: how many play the next round (never below the seated count)
  const playersRow = !showPlayers ? null : (
    <Row height={46} margin={{ top: 4 }}>
      <UiEntity uiTransform={{ width: 'auto', height: 30, margin: { right: 6 } }} uiText={{ value: str.players, fontSize: T.small, color: UI.muted }} />
      <Segmented
        options={seatsOf(t)
          .filter((n) => n >= 2)
          .map((n) => ({ key: `${n}`, label: `${n}` }))}
        active={`${players}`}
        onPick={(k) => {
          if (Number(k) >= seated.length) setPlayers(t, Number(k))
        }}
        width={mobile ? 44 : 52}
        fontSize={17}
      />
    </Row>
  )
  const controls = state !== null ? <t.game.Controls state={state} ctx={contextFor(t)} phone={mobile} fullBoard={local.showMiniBoard} /> : null
  const difficulty = <DifficultyPicker width={mobile ? 66 : 92} fontSize={mobile ? 15 : 16} />
  // Bot strength: caption beside the control on desktop, above it on the narrow phone column
  const botRow = !showBotRow ? null : mobile ? (
    <UiEntity uiTransform={{ width: '100%', height: 66, flexDirection: 'column', alignItems: 'center', margin: { top: 4 } }}>
      <Text value={str.bot} size={T.small} color={UI.muted} />
      {difficulty}
    </UiEntity>
  ) : (
    <Row height={46} margin={{ top: 6 }}>
      <UiEntity uiTransform={{ width: 'auto', height: 30, margin: { right: 6 } }} uiText={{ value: str.bot, fontSize: T.small, color: UI.muted }} />
      {difficulty}
    </Row>
  )

  if (mobile) {
    // Phone bar: the actions column stacks its buttons; the info column is fixed
    // width so the board stays centred as names and status change.
    const btnW = 190
    return (
      <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 10, left: 0 }, width: '100%', height: 'auto', flexDirection: 'row', justifyContent: 'center' }}>
        <Panel width="auto" place={{}} padding={12}>
          <UiEntity uiTransform={{ width: 'auto', height: 'auto', flexDirection: 'row', alignItems: 'center' }}>
            <UiEntity uiTransform={{ width: 320, height: 'auto', flexDirection: 'column', alignItems: 'center', margin: { right: 12 } }}>
              {header}
              <Text value={tableTitle(t)} size={T.small} color={UI.muted} margin={{ top: 4 }} />
              <Text value={status} size={T.status} color={statusColor} margin={{ top: 4 }} />
            </UiEntity>
            {/* explicit vertical margins: nested auto-height wrappers eat the panel padding */}
            <UiEntity uiTransform={{ width: 'auto', height: 'auto', margin: { top: 10, bottom: 10 } }}>{controls}</UiEntity>
            <UiEntity uiTransform={{ width: 220, height: 'auto', flexDirection: 'column', alignItems: 'center', margin: { left: 12 } }}>
              {showBotInvite && <Btn label={multi && players > 2 ? str.fillBots : str.playBot} onClick={() => inviteBot(t)} width={btnW} fontSize={17} />}
              {showRematch && <Btn label={str.playAgain} onClick={() => rematch(t)} width={btnW} />}
              {showDismiss && <Btn label={str.dismissBot} quiet onClick={() => dismissBot(t)} width={btnW} fontSize={18} />}
              {playersRow}
              {botRow}
              {showBoardToggle && <Btn label={local.showMiniBoard ? str.hideBoard : str.showBoard} quiet onClick={() => (local.showMiniBoard = !local.showMiniBoard)} width={btnW} fontSize={18} />}
              <Row height={60}>
                <Btn label="?" quiet onClick={() => (local.helpOpen = true)} width={52} />
                <Btn label={str.standUp} color={UI.danger} onClick={() => stand(t)} width={126} fontSize={18} />
              </Row>
            </UiEntity>
          </UiEntity>
        </Panel>
      </UiEntity>
    )
  }

  const W = 420
  return (
    <Panel width={W} place={rightMiddle(W, 250)} padding={14}>
      {header}
      <Text value={tableTitle(t)} size={T.small} color={UI.muted} margin={{ top: 2 }} />
      <Text value={status} size={T.status} color={statusColor} margin={{ top: 4, bottom: 6 }} />
      {controls}
      {playersRow}
      {botRow}
      <Row wrap height={showRematch || showBotInvite ? 60 : 0}>
        {showBotInvite && <Btn label={multi && players > 2 ? str.fillBots : str.playBot} onClick={() => inviteBot(t)} />}
        {showRematch && <Btn label={str.playAgain} onClick={() => rematch(t)} />}
        {showDismiss && <Btn label={str.dismissBot} quiet onClick={() => dismissBot(t)} />}
      </Row>
      <Row>
        <Btn label="?" quiet onClick={() => (local.helpOpen = true)} width={52} />
        <Btn label={str.standUp} color={UI.danger} onClick={() => stand(t)} />
      </Row>
    </Panel>
  )
}

// ---------------------------------------------------------------- elevator

/** Floor picker, shown while the player stands on an elevator pad. */
function ElevatorPanel() {
  if (!local.elevatorOpen) return null
  const str = L()
  const W = 460
  return (
    <Panel width={W} place={bottomCentre(W, 36)}>
      <Text value={str.elevatorTitle} size={T.title} />
      <Text value={str.elevatorHint} size={T.small} color={UI.muted} margin={{ top: 2, bottom: 8 }} />
      {FLOORS.map((f) => (
        <Btn
          key={`f${f.id}`}
          label={f.id === local.floor ? str.youAreHere(str.floors[f.id] ?? f.name) : (str.floors[f.id] ?? f.name)}
          quiet={f.id === local.floor}
          onClick={() => {
            if (f.id !== local.floor) rideTo(f)
          }}
          width={300}
        />
      ))}
      <Row height={56} margin={{ top: 4 }}>
        <Btn label={str.close} quiet onClick={() => ((local.elevatorOpen = false), (local.elevatorArmed = false))} width={130} />
      </Row>
    </Panel>
  )
}

// ---------------------------------------------------------------- how to play

/** Game whose rules the help should open on: the table you sit at, else the nearest, else the last choice. */
function defaultHelpGame(): GameId {
  const mine = findMySeat()
  if (mine) return mine.table.game.id
  const near = local.nearTableId >= 0 ? getTable(local.nearTableId) : undefined
  return near ? near.game.id : (tables[0]?.game.id ?? 'connectfour')
}

/** Distinct games hosted in the lounge, in table order. */
function hostedGames(): GameId[] {
  const out: GameId[] = []
  for (const t of tables) if (!out.includes(t.game.id)) out.push(t.game.id)
  return out
}

/** Ranked rows + the local player's totals, inside the help panel. */
function LeaderboardBody() {
  const str = L()
  const rows = board.rows.slice(0, 10)
  const mobile = phone()
  const line = (r: { rank: number; name: string; wins: number; streak: number }, i: number) => (
    <UiEntity key={`lb${i}`} uiTransform={{ width: '100%', height: mobile ? 30 : 34, flexDirection: 'row', alignItems: 'center', margin: { top: 2 } }}>
      <UiEntity uiTransform={{ width: 44, height: 'auto' }} uiText={{ value: `${r.rank}.`, fontSize: 18, color: r.rank <= 3 ? UI.accent : UI.muted, textAlign: 'middle-right' }} />
      <UiEntity uiTransform={{ width: 'auto', height: 'auto', margin: { left: 12 } }} uiText={{ value: r.name.slice(0, 22), fontSize: 18, color: UI.text }} />
      <UiEntity uiTransform={{ width: 'auto', height: 'auto', margin: { left: 14 } }} uiText={{ value: `${r.wins} ${str.winsShort} · ${str.streakShort} ${r.streak}`, fontSize: 16, color: UI.muted }} />
    </UiEntity>
  )
  return (
    <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'column' }}>
      <Para value={str.leaderboardSub} color={UI.muted} margin={{ bottom: 8 }} />
      {rows.length === 0 ? <Para value={board.failed ? str.leaderboardOffline : str.leaderboardEmpty} color={UI.text} margin={{ top: 6, bottom: 6 }} /> : rows.map(line)}
      <Para value={board.me ? str.yourStats(board.me.wins, board.me.streak, board.me.best_streak) : str.notRanked} color={UI.text} margin={{ top: 10, bottom: 4 }} />
    </UiEntity>
  )
}

/**
 * Suggestion box panel (opened from the brass box at the entrance): one text
 * field, Send / Cancel, and a status line; the note goes out signed (feedback.ts).
 */
function FeedbackPanel() {
  if (!local.feedbackOpen || !feedbackEnabled()) return null
  const str = L()
  const info = localeInfo(uiLang.code)
  const mobile = phone()
  const width = mobile ? 900 : 640
  const close = () => {
    local.feedbackOpen = false
    if (local.feedbackState !== 'sending') local.feedbackState = 'idle'
  }
  const status = local.feedbackState === 'sent' ? str.feedbackThanks : local.feedbackState === 'failed' ? str.feedbackFailed : local.feedbackState === 'sending' ? '...' : ''
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
      onMouseDown={close}
    >
      <Panel width={width} place={{}} padding={20}>
        <Text value={str.feedbackTitle} size={T.title} />
        <Para value={str.feedbackHint} color={UI.muted} margin={{ top: 4, bottom: 10 }} rtl={info.rtl} />
        <UiEntity uiTransform={{ width: '100%', height: mobile ? 64 : 52, margin: { bottom: 10 } }} uiBackground={{ color: Color4.create(1, 1, 1, 0.94) }}>
          <Input
            uiTransform={{ width: '100%', height: '100%', padding: { left: 12, right: 12 } }}
            placeholder={str.feedbackPlaceholder}
            placeholderColor={Color4.create(0.45, 0.42, 0.4, 1)}
            color={Color4.create(0.08, 0.07, 0.07, 1)}
            fontSize={mobile ? 22 : 19}
            value={local.feedbackText}
            onChange={(v) => {
              local.feedbackText = v.slice(0, 600)
              if (local.feedbackState !== 'sending') local.feedbackState = 'idle'
            }}
            onSubmit={() => void sendFeedback()}
          />
        </UiEntity>
        {status !== '' && <Text value={status} size={T.body} color={local.feedbackState === 'failed' ? UI.red : UI.accentTint} margin={{ bottom: 8 }} />}
        <Row height={48}>
          <Btn label={str.send} color={UI.accent} onClick={() => void sendFeedback()} width={170} />
          <Btn label={local.feedbackState === 'sent' ? str.gotIt : str.cancel} quiet onClick={close} width={170} />
        </Row>
      </Panel>
    </UiEntity>
  )
}

function HelpPanel() {
  if (!local.helpOpen) return null
  if (local.helpGame === '') local.helpGame = defaultHelpGame()
  const gameId = local.helpGame as GameId
  const game = getGame(gameId)
  const info = localeInfo(uiLang.code)
  const str = L()
  const rules = info.games[gameId] ?? info.games.connectfour ?? { name: game.label, overview: '' }
  const mobile = phone()
  const width = mobile ? 1000 : 720
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
      onMouseDown={() => (local.helpOpen = false)}
    >
      <Panel width={width} place={{}} padding={20}>
        {leaderboardEnabled() ? (
          <Row height={46} margin={{ bottom: 6 }}>
            <Segmented
              options={[{ key: 'rules', label: str.howToPlayTab }, { key: 'board', label: str.leaderboardTab }]}
              active={local.helpTab}
              onPick={(k) => {
                local.helpTab = k as 'rules' | 'board'
                if (k === 'board') void refreshLeaderboard(false)
              }}
              width={mobile ? 190 : 170}
              fontSize={17}
            />
          </Row>
        ) : (
          <Text value={str.howToPlay} size={T.title} />
        )}
        {local.helpTab === 'board' && leaderboardEnabled() ? (
          <LeaderboardBody />
        ) : (
          <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'column' }}>
            <Row height={48} margin={{ top: 4, bottom: 8 }} wrap>
              <Segmented
                options={hostedGames().map((id) => ({ key: id, label: info.games[id]?.name ?? getGame(id).label }))}
                active={gameId}
                onPick={(k) => (local.helpGame = k)}
                width={mobile ? 150 : 132}
              />
            </Row>
            <Para value={rules.overview} size={19} margin={{ bottom: 6 }} rtl={info.rtl} />
            <Para value={`• ${str.howToSit}`} color={UI.muted} margin={{ top: 4 }} rtl={info.rtl} />
            <Para value={`• ${str.move[gameId] ?? str.move.connectfour}`} color={UI.muted} margin={{ top: 4 }} rtl={info.rtl} />
            <Para value={`• ${str.timer}`} color={UI.muted} margin={{ top: 4, bottom: 6 }} rtl={info.rtl} />
          </UiEntity>
        )}
        <Row height={48} margin={{ bottom: 6 }}>
          <Btn label={`${str.language}: ${info.name}`} quiet onClick={() => (local.langPickerOpen = !local.langPickerOpen)} width={230} />
          <Btn label={music.on ? str.musicOn : str.musicOff} quiet onClick={toggleMusic} width={mobile ? 170 : 150} />
          <Btn label={str.gotIt} onClick={() => ((local.helpOpen = false), (local.langPickerOpen = false))} width={150} />
        </Row>
        {local.langPickerOpen && (
          <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', margin: { top: 6 } }}>
            {LOCALES.map((l) => (
              <UiEntity
                key={l.code}
                uiTransform={{ width: Math.max(92, l.name.length * 11 + 26), height: 38, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
                uiBackground={uiSprite('button', uiLang.code === l.code ? UI.accent : UI.panelSoft)}
                uiText={{ value: l.name, fontSize: 16, color: UI.text, textAlign: 'middle-center' }}
                onMouseDown={() => ((uiLang.code = l.code), (local.langPickerOpen = false))}
              />
            ))}
          </UiEntity>
        )}
      </Panel>
    </UiEntity>
  )
}

// ---------------------------------------------------------------- root

const LoungeUi = () => (
  // In phone emulation the root is pinned to a 720-unit-high strip at the
  // bottom of the desktop window (a phone's whole safe area is 720 units high)
  // and tinted so the phone screen edge is visible.
  <UiEntity
    uiTransform={DEBUG_MOBILE_UI ? { width: '100%', height: 720, positionType: 'absolute', position: { bottom: 0, left: 0 } } : { width: '100%', height: '100%', positionType: 'absolute' }}
    uiBackground={DEBUG_MOBILE_UI ? { color: Color4.create(1, 0, 1, 0.08) } : undefined}
  >
    <Hint />
    <Toast />
    <TableCard />
    <ElevatorPanel />
    <Controller />
    <HelpPanel />
    <FeedbackPanel />
  </UiEntity>
)
