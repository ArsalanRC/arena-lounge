/**
 * Chess table game. Bridges the pure engine (src/engine/chess, full FIDE
 * rules: castling, en passant, promotion, 50-move rule, threefold repetition,
 * insufficient material) to the TableGame contract. Touch input is tap a
 * piece, then tap a highlighted square; pawns promote to a queen (the
 * casual-app default). Seat A is white, seat B is black.
 *
 * Sync payload: 64-char board + turn, castling rights, en passant square,
 * clocks, result, last move and the position hashes since the last
 * irreversible move (that is all threefold repetition needs), ~300 bytes.
 */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import type { Entity } from '@dcl/sdk/ecs'
import {
  applyMove,
  createInitialState,
  getValidMoves,
  selectBotMove,
  type CastlingRights,
  type ChessBoard,
  type ChessGameState,
  type ChessMove,
  type ChessPiece,
  type ChessPieceType,
  type DrawReason,
  type GameResult
} from '../../engine/chess'
import type { BotDifficulty, PlayerInfo } from '../../engine/types'
import { UI } from '../config'
import { t as L } from '../i18n'
import { CHESS_SEAT_SPRITES, chessSelection, chessSprite, createChessView, setChessSelection, type ChessAction } from '../views/chess3d'
import { WIN_DRAW, WIN_NONE, type GameContext, type SeatNo, type TableGame } from './types'

const ENGINE_PLAYERS: PlayerInfo[] = [
  { id: 'A', color: 'red', playerOrder: 0 },
  { id: 'B', color: 'blue', playerOrder: 1 }
]
const N = 8
const IMG = { ring: 'images/ui/ring.png', dot: 'images/ui/disc.png' }
const LIGHT = Color4.fromHexString('#e8d9bdff')
const DARK = Color4.fromHexString('#6b4a35ff')
const PIECE_CHARS = 'KQRBNP'

interface Wire {
  b: string // 64 chars: . KQRBNP (white) kqrbnp (black), a1 first
  p: number
  s: 'p' | 'f'
  gr: GameResult
  dr?: DrawReason
  cr: string // 4 chars '1'/'0': white K, white Q, black K, black Q
  ep: number // -1 when none
  hm: number
  fm: number
  ck: 0 | 1
  l: [number, number, string, string, 0 | 1] | null // from, to, promotion ('' none), castling ('' none), en passant
  n: number
  ph: string[]
}

function encode(s: ChessGameState): string {
  const w: Wire = {
    b: s.board.map((p) => (!p ? '.' : p.color === 'white' ? p.type : p.type.toLowerCase())).join(''),
    p: s.currentPlayerIndex,
    s: s.status === 'finished' ? 'f' : 'p',
    gr: s.gameResult,
    dr: s.drawReason,
    cr: [s.castlingRights.whiteKingside, s.castlingRights.whiteQueenside, s.castlingRights.blackKingside, s.castlingRights.blackQueenside].map((x) => (x ? '1' : '0')).join(''),
    ep: s.enPassantSquare ?? -1,
    hm: s.halfmoveClock,
    fm: s.fullmoveNumber,
    ck: s.check ? 1 : 0,
    l: s.lastMove ? [s.lastMove.from, s.lastMove.to, s.lastMove.promotion ?? '', s.lastMove.isCastling ?? '', s.lastMove.isEnPassant ? 1 : 0] : null,
    n: s.turnNumber,
    // positions before the last capture / pawn move can never repeat again
    ph: s.positionHistory.slice(-(s.halfmoveClock + 1))
  }
  return JSON.stringify(w)
}

function decode(json: string): ChessGameState {
  const w = JSON.parse(json) as Wire
  const board: ChessBoard = []
  for (let i = 0; i < 64; i++) {
    const ch = w.b[i]
    if (ch === '.' || ch === undefined) board.push(null)
    else {
      const up = ch.toUpperCase()
      board.push(PIECE_CHARS.includes(up) ? { type: up as ChessPieceType, color: ch === up ? 'white' : 'black' } : null)
    }
  }
  const idx = w.p === 1 ? 1 : 0
  const castlingRights: CastlingRights = {
    whiteKingside: w.cr[0] === '1',
    whiteQueenside: w.cr[1] === '1',
    blackKingside: w.cr[2] === '1',
    blackQueenside: w.cr[3] === '1'
  }
  const lastMove: ChessMove | null = w.l
    ? {
        from: w.l[0],
        to: w.l[1],
        promotion: w.l[2] ? (w.l[2] as ChessPieceType) : undefined,
        isCastling: w.l[3] ? (w.l[3] as 'kingside' | 'queenside') : undefined,
        isEnPassant: w.l[4] === 1,
        playerId: '',
        color: 'red',
        timestamp: 0
      }
    : null
  return {
    status: w.s === 'f' ? 'finished' : 'playing',
    players: ENGINE_PLAYERS,
    currentPlayerIndex: idx,
    turnNumber: w.n,
    finishOrder: [],
    board,
    turnColor: idx === 0 ? 'white' : 'black',
    castlingRights,
    enPassantSquare: w.ep >= 0 ? w.ep : null,
    halfmoveClock: w.hm,
    fullmoveNumber: w.fm,
    check: w.ck === 1,
    gameResult: w.gr,
    drawReason: w.dr,
    lastMove,
    positionHistory: Array.isArray(w.ph) ? w.ph : []
  }
}

function seatOfIndex(i: number): SeatNo {
  return i === 0 ? 1 : 2
}

/** Legal move from -> to for the side to move; promotions resolve to the queen. */
function findMove(state: ChessGameState, from: number, to: number): ChessMove | undefined {
  const legal = getValidMoves(state).filter((m) => m.from === from && m.to === to)
  return legal.find((m) => m.promotion === 'Q') ?? legal[0]
}

/**
 * Handle a tap on a square: select one of the side-to-move's pieces, or move
 * the selected piece to a legal target. `act` rejects moves that are not the
 * local player's, so the selection is only ever a local highlight.
 */
export function tapChessSquare(root: Entity, state: ChessGameState, sq: number, act: (a: ChessAction) => boolean | void): void {
  const legal = getValidMoves(state)
  const sel = chessSelection.get(root)
  if (sel !== undefined && legal.some((m) => m.from === sel && m.to === sq)) {
    setChessSelection(root, null)
    act({ from: sel, to: sq })
    return
  }
  if (legal.some((m) => m.from === sq)) setChessSelection(root, sel === sq ? null : sq)
  else setChessSelection(root, null)
}

// ---------------------------------------------------------------- controls

function Board(props: { state: ChessGameState; ctx: GameContext; phone: boolean }) {
  const { state, ctx } = props
  const cell = props.phone ? 56 : 36
  const mirror = ctx.mySeat === 2
  const legal = ctx.myTurn ? getValidMoves(state) : []
  const sel = chessSelection.get(ctx.root)
  const movable = new Set(legal.map((m) => m.from))
  const targets = new Set(sel === undefined ? [] : legal.filter((m) => m.from === sel).map((m) => m.to))
  const last = state.lastMove
  const rows = []
  // rank 7 at the top for seat A (white); seat B sees the board mirrored
  for (let r = 0; r < N; r++) {
    const rank = mirror ? r : N - 1 - r
    const cells = []
    for (let c = 0; c < N; c++) {
      const file = mirror ? N - 1 - c : c
      const sq = rank * N + file
      const p: ChessPiece | null = state.board[sq]
      const dark = (file + rank) % 2 === 0
      const isLast = last !== null && (last.from === sq || last.to === sq)
      const inCheck = state.check && p !== null && p.type === 'K' && p.color === state.turnColor
      const bg = sq === sel ? UI.accent : inCheck ? UI.danger : isLast ? Color4.fromHexString('#8a6a4aff') : dark ? DARK : LIGHT
      cells.push(
        <UiEntity
          key={`s${sq}`}
          uiTransform={{ width: cell, height: cell, justifyContent: 'center', alignItems: 'center', pointerFilter: 'block' }}
          uiBackground={{ color: bg }}
          onMouseDown={() => {
            if (ctx.myTurn) tapChessSquare(ctx.root, state, sq, (a) => ctx.act(a))
          }}
        >
          {p !== null && (
            <UiEntity uiTransform={{ width: cell - 4, height: cell - 4, justifyContent: 'center', alignItems: 'center' }} uiBackground={{ texture: { src: chessSprite(p) }, textureMode: 'stretch' }}>
              {movable.has(sq) && sel === undefined && <UiEntity uiTransform={{ width: cell - 6, height: cell - 6 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: UI.accentTint }} />}
              {targets.has(sq) && <UiEntity uiTransform={{ width: cell - 6, height: cell - 6 }} uiBackground={{ texture: { src: IMG.ring }, textureMode: 'stretch', color: UI.danger }} />}
            </UiEntity>
          )}
          {p === null && targets.has(sq) && <UiEntity uiTransform={{ width: cell / 3, height: cell / 3 }} uiBackground={{ texture: { src: IMG.dot }, textureMode: 'stretch', color: Color4.create(1, 1, 1, 0.75) }} />}
        </UiEntity>
      )
    }
    rows.push(
      <UiEntity key={`r${r}`} uiTransform={{ flexDirection: 'row', width: 'auto', height: 'auto' }}>
        {cells}
      </UiEntity>
    )
  }
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: 'auto', height: 'auto', padding: 6 }} uiBackground={{ color: Color4.fromHexString('#3a2a1eff') }}>
      {rows}
    </UiEntity>
  )
}

function material(board: ChessBoard, color: 'white' | 'black'): number {
  const v: Record<ChessPieceType, number> = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 }
  let n = 0
  for (const p of board) if (p && p.color === color) n += v[p.type]
  return n
}

function resultLine(s: ChessGameState): string {
  const g = L().g
  if (s.gameResult === 'white_wins') return g.mate(g.white)
  if (s.gameResult === 'black_wins') return g.mate(g.black)
  if (s.gameResult === 'draw') {
    const r = s.drawReason
    return r === 'stalemate' ? g.stalemate : r === 'insufficient_material' ? g.drawMaterial : r === 'fifty_move' ? g.drawFifty : r === 'threefold_repetition' ? g.drawRepetition : L().drawShort
  }
  return ''
}

function Controls(props: { state: ChessGameState; ctx: GameContext; phone: boolean }) {
  const s = props.state
  const sel = chessSelection.get(props.ctx.root)
  const finished = s.status === 'finished'
  const g = L().g
  const hint = finished ? resultLine(s) : props.ctx.myTurn ? (sel !== undefined ? g.tapMarked : s.check ? g.checkSave : g.tapPiece) : s.check ? g.check : ''
  const w = material(s.board, 'white')
  const b = material(s.board, 'black')
  const lead = w === b ? g.materialEven : w > b ? g.up(g.white, w - b) : g.up(g.black, b - w)
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', width: 'auto', height: 'auto' }}>
      <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'center', alignItems: 'center' }} uiText={{ value: `${lead}${hint ? '   ·   ' + hint : ''}`, fontSize: 17, color: s.check && !finished ? UI.yellow : UI.muted, textAlign: 'middle-center' }} />
      <Board state={s} ctx={props.ctx} phone={props.phone} />
    </UiEntity>
  )
}

// ---------------------------------------------------------------- plugin

export const chessGame: TableGame<ChessGameState, ChessAction> = {
  id: 'chess',
  label: 'Chess',
  seatNames: ['White', 'Black'],
  seatSprites: CHESS_SEAT_SPRITES,
  seatColors: [Color4.fromHexString('#f2e8d5ff'), Color4.fromHexString('#3a3230ff')],

  newGame(opening) {
    const s = createInitialState(ENGINE_PLAYERS)
    // seats are fixed colours (A = white); white always moves first in chess, so
    // an opening seat B simply means black is to move first this round
    return opening === 2 ? { ...s, currentPlayerIndex: 1, turnColor: 'black' } : s
  },
  encode,
  decode,
  turnSeat(s) {
    return s.status === 'finished' ? 0 : seatOfIndex(s.currentPlayerIndex)
  },
  finished(s) {
    return s.status === 'finished'
  },
  winner(s) {
    if (s.status !== 'finished') return WIN_NONE
    if (s.gameResult === 'white_wins') return 1
    if (s.gameResult === 'black_wins') return 2
    return WIN_DRAW
  },
  apply(s, action, seat) {
    if (s.status !== 'playing') return null
    if (seatOfIndex(s.currentPlayerIndex) !== seat) return null
    const from = Math.floor(Number(action?.from))
    const to = Math.floor(Number(action?.to))
    const move = findMove(s, from, to)
    if (!move) return null
    try {
      return applyMove(s, move)
    } catch {
      return null
    }
  },
  botAction(s, difficulty: BotDifficulty) {
    const m = selectBotMove(s, getValidMoves(s), difficulty)
    return m ? { from: m.from, to: m.to } : null
  },
  createView3D(root, onAction, getState) {
    return createChessView(root, (sq) => {
      const s = getState()
      if (s) tapChessSquare(root, s, sq, onAction)
    })
  },
  Controls
}
