/**
 * Screen-space UI: the mobile-first controller.
 *
 * On phones, tapping a 3D object means aiming the crosshair and pressing the
 * interaction button, which is slow for a 7-column game. Screen UI is tapped
 * directly, so the UI is the controller and the 3D table is the shared show:
 *  - near a table:  card with the two seat buttons (no pad-hunting needed)
 *  - seated:        mini board (tap a column to drop) + status + actions
 *  - always:        a top banner for onboarding / status and short toasts
 *
 * React hooks are not available in React-ECS; the renderer runs every frame
 * and reads module state + synced components directly.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { ReactEcsRenderer, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { isStateSyncronized } from '@dcl/sdk/network'
import { COLS, ROWS } from '../engine/connectfour'
import { TURN_LIMIT_MS, UI } from './config'
import { SEAT_A, SEAT_B, Status, Winner, cellIndex, type Seat } from './state'
import {
  boardOf,
  dismissBot,
  drop,
  findMySeat,
  getTable,
  inviteBot,
  local,
  me,
  mySeatAt,
  otherSeat,
  rematch,
  seatOf,
  sit,
  stand,
  type Table
} from './tables'

export function setupUi(): void {
  ReactEcsRenderer.setUiRenderer(LoungeUi, { virtualWidth: 1920, virtualHeight: 1080 })
}

// ---------------------------------------------------------------- helpers

const DISC = 'images/ui/disc.png'
const CELL = 38
const CELL_GAP = 4

function seatColor(seat: Seat): Color4 {
  return seat === SEAT_A ? UI.yellow : UI.red
}
function seatName(seat: Seat): string {
  return seat === SEAT_A ? 'Yellow' : 'Red'
}

type Margin = UiTransformProps['margin']
type Width = UiTransformProps['width']

function Btn(props: {
  label: string
  onClick: () => void
  color?: Color4
  textColor?: Color4
  width?: Width
  fontSize?: number
  margin?: Margin
}) {
  return (
    <UiEntity
      uiTransform={{
        width: props.width ?? 'auto',
        minWidth: 120,
        height: 56,
        margin: props.margin ?? 4,
        padding: { left: 16, right: 16 },
        justifyContent: 'center',
        alignItems: 'center',
        pointerFilter: 'block'
      }}
      uiBackground={{ color: props.color ?? UI.accent }}
      uiText={{
        value: props.label,
        fontSize: props.fontSize ?? 20,
        color: props.textColor ?? UI.text,
        textAlign: 'middle-center'
      }}
      onMouseDown={props.onClick}
    />
  )
}

function Text(props: { value: string; size?: number; color?: Color4; margin?: Margin; width?: Width }) {
  return (
    <UiEntity
      uiTransform={{ width: props.width ?? '100%', height: 'auto', margin: props.margin ?? 0 }}
      uiText={{ value: props.value, fontSize: props.size ?? 20, color: props.color ?? UI.text, textAlign: 'middle-center' }}
    />
  )
}

function secondsLeft(updatedAt: number): number {
  return Math.max(0, Math.ceil((TURN_LIMIT_MS - (Date.now() - updatedAt)) / 1000))
}

// ---------------------------------------------------------------- top banner

function bannerText(): string {
  if (!me.ready) return 'Loading your profile…'
  if (!isStateSyncronized() && !local.offline) return 'Connecting to the lounge…'
  const mine = findMySeat()
  if (mine) return ''
  if (!local.hasEverSat) return 'Walk up to a table and tap a seat to play'
  return ''
}

function Banner() {
  const text = bannerText()
  const toast = local.toast.until > Date.now() ? local.toast.text : ''
  const value = toast || text
  if (!value) return null
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 18, left: '50%' },
        margin: { left: -260 },
        width: 520,
        height: 'auto',
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      uiBackground={{ color: toast ? UI.accentSoft : UI.panel }}
      uiText={{ value, fontSize: 22, color: UI.text, textAlign: 'middle-center' }}
    />
  )
}

// ---------------------------------------------------------------- table card

function TableCard() {
  const t = local.nearTableId >= 0 ? getTable(local.nearTableId) : undefined
  if (!t || !me.ready) return null
  if (mySeatAt(t)) return null // the controller takes over
  const b = boardOf(t)
  const a = seatOf(t, SEAT_A)
  const s = seatOf(t, SEAT_B)
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
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: 40, left: '50%' },
        margin: { left: -230 },
        width: 460,
        height: 'auto',
        padding: 14,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: UI.panel }}
    >
      <Text value={t.def.label} size={26} />
      <Text value={line} size={20} color={UI.muted} margin={{ top: 4, bottom: 8 }} />
      {bothTaken ? (
        <Text value="Both seats are taken. Watch, or try another table." size={18} color={UI.muted} />
      ) : (
        <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'row', justifyContent: 'center' }}>
          {a.addr === '' && (
            <Btn label="Sit as Yellow" color={UI.yellow} textColor={Color4.Black()} onClick={() => sit(t, SEAT_A)} width={200} />
          )}
          {s.addr === '' && (
            <Btn label="Sit as Red" color={UI.red} onClick={() => sit(t, SEAT_B)} width={200} />
          )}
        </UiEntity>
      )}
    </UiEntity>
  )
}

// ---------------------------------------------------------------- controller

function MiniBoard(props: { table: Table; interactive: boolean }) {
  const b = boardOf(props.table)
  const winSet = new Set(b.winCells)
  const columns = []
  for (let c = 0; c < COLS; c++) {
    const cells = []
    for (let r = 0; r < ROWS; r++) {
      const idx = cellIndex(r, c)
      const v = b.cells[idx] ?? 0
      const isWin = winSet.has(idx)
      const isLast = idx === b.lastCell
      cells.push(
        <UiEntity
          key={`c${idx}`}
          uiTransform={{
            width: CELL,
            height: CELL,
            margin: CELL_GAP / 2,
            justifyContent: 'center',
            alignItems: 'center'
          }}
          uiBackground={{
            texture: { src: DISC },
            textureMode: 'stretch',
            color: isWin ? UI.win : isLast ? Color4.create(1, 1, 1, 0.55) : UI.hole
          }}
        >
          {v !== 0 && (
            <UiEntity
              uiTransform={{ width: isWin || isLast ? CELL - 8 : CELL - 2, height: isWin || isLast ? CELL - 8 : CELL - 2 }}
              uiBackground={{ texture: { src: DISC }, textureMode: 'stretch', color: v === 1 ? UI.yellow : UI.red }}
            />
          )}
        </UiEntity>
      )
    }
    columns.push(
      <UiEntity
        key={`col${c}`}
        uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', pointerFilter: 'block' }}
        onMouseDown={() => {
          if (props.interactive) drop(props.table, c)
        }}
      >
        {cells}
      </UiEntity>
    )
  }
  return (
    <UiEntity
      uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto', padding: 6 }}
      uiBackground={{ color: UI.boardBg }}
    >
      {columns}
    </UiEntity>
  )
}

function Controller() {
  const mine = findMySeat()
  if (!mine) return null
  const t = mine.table
  const seat = mine.seat
  const b = boardOf(t)
  const opp = seatOf(t, otherSeat(seat))
  const myColor = seatColor(seat)
  const myTurn = b.status === Status.Playing && b.turn === seat
  const myWins = seat === SEAT_A ? b.winsA : b.winsB
  const oppWins = seat === SEAT_A ? b.winsB : b.winsA

  let status = ''
  let statusColor = UI.text
  if (b.status === Status.Waiting) {
    status = opp.addr === '' ? 'Waiting for an opponent…' : 'Dealing…'
    statusColor = UI.muted
  } else if (b.status === Status.Playing) {
    const secs = secondsLeft(b.updatedAt)
    status = myTurn ? `Your move · ${secs}s` : `${opp.name} is thinking… · ${secs}s`
    statusColor = myTurn ? myColor : UI.muted
  } else {
    if (b.winner === Winner.Draw) status = 'Draw! Well played.'
    else if (b.winner === seat) status = 'You win the round!'
    else status = `${opp.name} takes the round`
  }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: 28, left: '50%' },
        margin: { left: -190 },
        width: 380,
        height: 'auto',
        padding: 10,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: UI.panel }}
    >
      <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <UiEntity uiTransform={{ width: 'auto', height: 28, flexDirection: 'row', alignItems: 'center' }}>
          <UiEntity uiTransform={{ width: 22, height: 22, margin: { right: 6 } }} uiBackground={{ texture: { src: DISC }, textureMode: 'stretch', color: myColor }} />
          <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: `You · ${t.def.label}`, fontSize: 18, color: UI.text }} />
        </UiEntity>
        <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: `${myWins} : ${oppWins}`, fontSize: 20, color: UI.text }} />
        <UiEntity uiTransform={{ width: 'auto', height: 28, flexDirection: 'row', alignItems: 'center' }}>
          <UiEntity uiTransform={{ width: 'auto', height: 'auto' }} uiText={{ value: opp.addr === '' ? '—' : opp.name, fontSize: 18, color: UI.text }} />
          <UiEntity uiTransform={{ width: 22, height: 22, margin: { left: 6 } }} uiBackground={{ texture: { src: DISC }, textureMode: 'stretch', color: seatColor(otherSeat(seat)) }} />
        </UiEntity>
      </UiEntity>

      <Text value={status} size={22} color={statusColor} margin={{ top: 6, bottom: 6 }} />

      <MiniBoard table={t} interactive={myTurn} />

      <UiEntity uiTransform={{ width: '100%', height: 'auto', flexDirection: 'row', justifyContent: 'center', margin: { top: 8 } }}>
        {b.status === Status.Waiting && opp.addr === '' && (
          <Btn label="Play the house bot" onClick={() => inviteBot(t)} />
        )}
        {b.status === Status.Finished && opp.addr !== '' && (
          <Btn label="Play again" onClick={() => rematch(t)} />
        )}
        {opp.bot && b.status !== Status.Playing && (
          <Btn label="Dismiss bot" color={UI.panelSoft} onClick={() => dismissBot(t)} />
        )}
        <Btn label="Stand up" color={UI.danger} onClick={() => stand(t)} />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------- root

const LoungeUi = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute' }}>
    <Banner />
    <TableCard />
    <Controller />
  </UiEntity>
)
