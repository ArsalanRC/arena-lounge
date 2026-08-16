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
 *  - Controller  seated: the game's own controls (compact on phones) + status
 *  - Help    "How to play": one tab per game, rules overview in the chosen
 *            language, lounge tips, language picker behind a toggle
 *
 * Visuals come from pre-shaded sprites in images/ui (tools/gen-textures.py)
 * because mobile has no borderRadius / nine-slice; every panel and button is
 * a stretched rounded texture. React hooks are not available in React-ECS;
 * the renderer runs every frame and reads module state + synced components.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { ReactEcsRenderer, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { isStateSyncronized } from '@dcl/sdk/network'
import { isMobile } from '@dcl/sdk/platform'
import { TURN_LIMIT_MS, UI } from './config'
import { botSettings } from './games/botSettings'
import { getGame } from './games/registry'
import type { GameContext, GameId } from './games/types'
import { LOCALES, localeInfo, stringsFor } from './i18n'
import { SEAT_A, SEAT_B, Status, Winner, type Seat } from './state'
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
  rematch,
  seatOf,
  sit,
  sitWithBot,
  stand,
  tables,
  type Table
} from './tables'

export function setupUi(): void {
  ReactEcsRenderer.setUiRenderer(LoungeUi, { virtualWidth: 1920, virtualHeight: 1080 })
}

// ---------------------------------------------------------------- tokens

const IMG = {
  panel: 'images/ui/panel.png',
  pill: 'images/ui/pill.png',
  button: 'images/ui/button.png'
}
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
      uiBackground={{ texture: { src: IMG.button }, textureMode: 'stretch', color: props.color ?? (props.quiet ? UI.panelSoft : UI.accent) }}
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

function Chip(props: { sprite: string; label: string; reverse?: boolean; tint?: Color4 }) {
  const disc = <UiEntity uiTransform={{ width: 26, height: 26, margin: props.reverse ? { left: 8 } : { right: 8 } }} uiBackground={{ texture: { src: props.sprite }, textureMode: 'stretch', color: props.tint ?? WHITE }} />
  const label = <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: props.label, fontSize: 19, color: UI.text }} />
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

/** Rounded dark panel; `place` positions it absolutely. */
function Panel(props: { children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]; width: number; place: UiTransformProps; padding?: number }) {
  return (
    <UiEntity
      uiTransform={{ ...props.place, width: props.width, height: 'auto', padding: props.padding ?? 16, flexDirection: 'column', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ texture: { src: IMG.panel }, textureMode: 'stretch' }}
    >
      {props.children}
    </UiEntity>
  )
}

/** Segmented control: equal-width options, one active. */
function Segmented(props: { options: Array<{ key: string; label: string }>; active: string; onPick: (key: string) => void; width?: number }) {
  return (
    <UiEntity uiTransform={{ width: 'auto', height: 40, flexDirection: 'row', alignItems: 'center' }}>
      {props.options.map((o) => (
        <UiEntity
          key={o.key}
          uiTransform={{ width: props.width ?? 92, height: 40, margin: 2, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ texture: { src: IMG.button }, textureMode: 'stretch', color: props.active === o.key ? UI.accent : UI.panelSoft }}
          uiText={{ value: o.label, fontSize: 16, color: props.active === o.key ? UI.text : UI.muted, textAlign: 'middle-center' }}
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
  const mySeat = mySeatAt(t)
  const b = boardOf(t)
  return {
    root: t.root,
    mySeat,
    myTurn: mySeat !== 0 && b.status === Status.Playing && b.turn === mySeat,
    act: (action) => act(t, action)
  }
}

const bottomCentre = (width: number, bottom: number): UiTransformProps => ({ positionType: 'absolute', position: { bottom, left: '50%' }, margin: { left: -width / 2 } })
const rightMiddle = (width: number, halfHeight: number): UiTransformProps => ({ positionType: 'absolute', position: { right: 36, top: '50%' }, margin: { top: -halfHeight } })

// ---------------------------------------------------------------- hint + toast

function visibleTableCard(): Table | undefined {
  const t = local.nearTableId >= 0 ? getTable(local.nearTableId) : undefined
  if (!t || !me.ready || mySeatAt(t) || local.dismissedTableId === t.def.id) return undefined
  return t
}

function hintText(): string {
  if (!me.ready) return 'Loading your profile…'
  if (!isStateSyncronized() && !local.offline) return 'Connecting to the lounge…'
  if (findMySeat() || visibleTableCard() || local.helpOpen) return ''
  if (!local.hasEverSat) return 'Walk up to a table and tap a seat to play'
  return ''
}

function Hint() {
  const value = hintText()
  if (!value) return null
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 16, left: '50%' }, margin: { left: -260 }, width: 520, height: 52, justifyContent: 'center', alignItems: 'center' }}
      uiBackground={{ texture: { src: IMG.pill }, textureMode: 'stretch', color: WHITE }}
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
      uiBackground={{ texture: { src: IMG.pill }, textureMode: 'stretch', color: UI.accentTint }}
      uiText={{ value: local.toast.text, fontSize: T.body, color: Color4.Black(), textAlign: 'middle-center' }}
    />
  )
}

// ---------------------------------------------------------------- table card

function TableCard() {
  const t = visibleTableCard()
  if (!t) return null
  const b = boardOf(t)
  const a = seatOf(t, SEAT_A)
  const s = seatOf(t, SEAT_B)
  const [nameA, nameB] = t.game.seatNames
  const bothTaken = a.addr !== '' && s.addr !== ''
  const line = bothTaken
    ? b.status === Status.Playing
      ? `${a.name} vs ${s.name} · ${b.winsA}:${b.winsB}`
      : `${a.name} vs ${s.name}`
    : a.addr !== ''
      ? `${a.name} is waiting for a rival`
      : s.addr !== ''
        ? `${s.name} is waiting for a rival`
        : 'Open table'
  const state = bothTaken ? gameStateOf(t) : null
  const W = 480
  return (
    <Panel width={W} place={bottomCentre(W, 36)}>
      <Text value={`${t.def.label} · ${t.game.label}`} size={T.title} />
      <Text value={line} size={T.body} color={UI.muted} margin={{ top: 2, bottom: 8 }} />
      {bothTaken && state !== null && <t.game.Controls state={state} ctx={contextFor(t)} compact={false} />}
      {!bothTaken && (
        <Row>
          {a.addr === '' && <Btn label={`Sit as ${nameA}`} color={seatTint(t, SEAT_A)} textColor={textOn(seatTint(t, SEAT_A))} onClick={() => sit(t, SEAT_A)} width={205} />}
          {s.addr === '' && <Btn label={`Sit as ${nameB}`} color={seatTint(t, SEAT_B)} textColor={textOn(seatTint(t, SEAT_B))} onClick={() => sit(t, SEAT_B)} width={205} />}
        </Row>
      )}
      <Row>
        {!bothTaken && a.addr === '' && s.addr === '' && <Btn label="Play the house bot" quiet onClick={() => sitWithBot(t)} width={230} />}
        <Btn label="?" quiet onClick={() => (local.helpOpen = true)} width={52} />
        <Btn label="Not now" quiet onClick={() => (local.dismissedTableId = t.def.id)} width={130} />
      </Row>
    </Panel>
  )
}

// ---------------------------------------------------------------- controller

function Controller() {
  const mine = findMySeat()
  if (!mine) return null
  const t = mine.table
  const seat = mine.seat
  const b = boardOf(t)
  const opp = seatOf(t, otherSeat(seat))
  const myTurn = b.status === Status.Playing && b.turn === seat
  const myWins = seat === SEAT_A ? b.winsA : b.winsB
  const oppWins = seat === SEAT_A ? b.winsB : b.winsA
  const mobile = isMobile()
  const compact = mobile && !local.showMiniBoard
  const state = gameStateOf(t)
  const sprites = t.game.seatSprites

  let status = ''
  let statusColor = UI.text
  if (b.status === Status.Waiting) {
    status = opp.addr === '' ? 'Waiting for an opponent…' : 'Dealing…'
    statusColor = UI.muted
  } else if (b.status === Status.Playing) {
    const secs = secondsLeft(b.updatedAt)
    status = myTurn ? `Your move · ${secs}s` : `${opp.name} is thinking… ${secs}s`
    if (myTurn) {
      const tint = seatTint(t, seat)
      statusColor = textOn(tint) === UI.text ? UI.text : tint
    } else statusColor = UI.muted
  } else if (b.winner === Winner.Draw) status = 'Draw! Well played.'
  else if (b.winner === seat) status = 'You win the round!'
  else status = `${opp.name} takes the round`

  const W = mobile ? 480 : 420
  const place = mobile ? bottomCentre(W, 14) : rightMiddle(W, 250)

  return (
    <Panel width={W} place={place} padding={14}>
      <UiEntity uiTransform={{ width: '100%', height: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip sprite={sprites[seat - 1]} label="You" tint={t.game.seatSpriteTints?.[seat - 1]} />
        <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: `${myWins} : ${oppWins}`, fontSize: 22, color: UI.text }} />
        <Chip sprite={sprites[otherSeat(seat) - 1]} label={opp.addr === '' ? '—' : opp.name} reverse tint={t.game.seatSpriteTints?.[otherSeat(seat) - 1]} />
      </UiEntity>
      <Text value={`${t.def.label} · ${t.game.label}`} size={T.small} color={UI.muted} margin={{ top: 2 }} />
      <Text value={status} size={T.status} color={statusColor} margin={{ top: 4, bottom: 6 }} />

      {state !== null && <t.game.Controls state={state} ctx={contextFor(t)} compact={compact} />}

      {opp.bot && b.status !== Status.Playing && (
        <Row height={46} margin={{ top: 6 }}>
          <UiEntity uiTransform={{ width: 'auto', height: 30, margin: { right: 6 } }} uiText={{ value: 'Bot', fontSize: T.small, color: UI.muted }} />
          <Segmented
            options={[{ key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' }]}
            active={botSettings.difficulty}
            onPick={(k) => (botSettings.difficulty = k as typeof botSettings.difficulty)}
          />
        </Row>
      )}

      <Row wrap height={b.status === Status.Finished || (b.status === Status.Waiting && opp.addr === '') ? 60 : 0}>
        {b.status === Status.Waiting && opp.addr === '' && <Btn label="Play the house bot" onClick={() => inviteBot(t)} />}
        {b.status === Status.Finished && opp.addr !== '' && <Btn label="Play again" onClick={() => rematch(t)} />}
        {opp.bot && b.status !== Status.Playing && <Btn label="Dismiss bot" quiet onClick={() => dismissBot(t)} />}
      </Row>
      <Row>
        {mobile && <Btn label={local.showMiniBoard ? 'Hide board' : 'Show board'} quiet onClick={() => (local.showMiniBoard = !local.showMiniBoard)} />}
        <Btn label="?" quiet onClick={() => (local.helpOpen = true)} width={52} />
        <Btn label="Stand up" color={UI.danger} onClick={() => stand(t)} />
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

function HelpPanel() {
  if (!local.helpOpen) return null
  if (local.helpGame === '') local.helpGame = defaultHelpGame()
  const gameId = local.helpGame as GameId
  const game = getGame(gameId)
  const info = localeInfo(local.lang)
  const str = stringsFor(local.lang)
  const rules = info.games[gameId] ?? info.games.connectfour ?? { name: game.label, overview: '' }
  const mobile = isMobile()
  const width = mobile ? 780 : 720
  return (
    <UiEntity
      uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
      onMouseDown={() => (local.helpOpen = false)}
    >
      <Panel width={width} place={{}} padding={20}>
        <Text value={str.howToPlay} size={T.title} />
        <Row height={48} margin={{ top: 4, bottom: 8 }} wrap>
          <Segmented
            options={hostedGames().map((id) => ({ key: id, label: localeInfo(local.lang).games[id]?.name ?? getGame(id).label }))}
            active={gameId}
            onPick={(k) => (local.helpGame = k)}
            width={mobile ? 118 : 132}
          />
        </Row>
        <Para value={rules.overview} size={19} margin={{ bottom: 6 }} rtl={info.rtl} />
        <Para value={`• ${str.howToSit}`} color={UI.muted} margin={{ top: 4 }} rtl={info.rtl} />
        <Para value={`• ${str.move[gameId] ?? str.move.connectfour}`} color={UI.muted} margin={{ top: 4 }} rtl={info.rtl} />
        <Para value={`• ${str.timer}`} color={UI.muted} margin={{ top: 4, bottom: 6 }} rtl={info.rtl} />
        <Row height={48}>
          <Btn label={`${str.language}: ${info.name}`} quiet onClick={() => (local.langPickerOpen = !local.langPickerOpen)} width={260} />
          <Btn label={str.gotIt} onClick={() => ((local.helpOpen = false), (local.langPickerOpen = false))} width={170} />
        </Row>
        {local.langPickerOpen && (
          <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', margin: { top: 6 } }}>
            {LOCALES.map((l) => (
              <UiEntity
                key={l.code}
                uiTransform={{ width: Math.max(92, l.name.length * 11 + 26), height: 38, margin: 3, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
                uiBackground={{ texture: { src: IMG.button }, textureMode: 'stretch', color: local.lang === l.code ? UI.accent : UI.panelSoft }}
                uiText={{ value: l.name, fontSize: 16, color: UI.text, textAlign: 'middle-center' }}
                onMouseDown={() => ((local.lang = l.code), (local.langPickerOpen = false))}
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
  <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute' }}>
    <Hint />
    <Toast />
    <TableCard />
    <Controller />
    <HelpPanel />
  </UiEntity>
)
