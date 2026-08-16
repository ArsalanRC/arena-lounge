/**
 * Lounge i18n. Rule overviews and game names for 19 languages come from Game
 * Arena (instructions.ts, generated). Everything the lounge itself says (the
 * chrome: cards, controller, toasts, signs, hints) lives here in five
 * languages written natively, EN / DE / ES / PT / FR; other picker languages
 * fall back to English for the chrome and keep their localised rules.
 *
 * `t()` returns the strings for the current UI language; the language is a
 * module-level value so 3D labels, toasts and the UI all read the same one.
 */
import type { GameId } from '../games/types'
import { LOCALES, type LocaleInfo } from './instructions'

export { LOCALES }

/** Current UI language (picker in the How-to-play panel). */
export const uiLang = { code: 'en' }

export interface LoungeStrings {
  // how to play
  howToPlay: string
  howToSit: string
  move: Partial<Record<GameId, string>>
  timer: string
  language: string
  gotIt: string
  // hints + toasts
  loadingProfile: string
  connecting: string
  connectingWait: string
  walkUp: string
  seatTaken: string
  tableFull: string
  timeoutLost: string
  timeoutWon: string
  idleStood: string
  leftStood: string
  opponentLeft: string
  // table card + sign
  table: (n: number) => string
  openTable: string
  comePlay: string
  vs: (a: string, b: string) => string
  waitingForRival: (name: string) => string
  oneSeatFree: string
  sitAs: (seat: string) => string
  takeSeat: string
  /** Toast at the deal: which colour the local player got this round. */
  youPlaySide: (side: string) => string
  playBot: string
  notNow: string
  toMove: (name: string) => string
  wins: (name: string) => string
  drawShort: string
  // controller
  you: string
  houseBot: string
  waitingOpponent: string
  dealing: string
  yourMove: (secs: number) => string
  thinking: (name: string, secs: number) => string
  draw: string
  youWin: string
  takesRound: (name: string) => string
  bot: string
  easy: string
  medium: string
  hard: string
  playAgain: string
  dismissBot: string
  showBoard: string
  hideBoard: string
  standUp: string
  // elevator + 3D labels
  elevatorTitle: string
  elevatorHint: string
  youAreHere: (floor: string) => string
  close: string
  floors: [string, string, string, string]
  elevator: string
  welcome: string
  comingSoon: string
  gameRoom: string
  skyRoom: string
  rooftop: string
  rooftopNote: string
  /** Seat colour names shown on buttons and chips. */
  seat: Record<string, string>
  /** Per-game hint lines. */
  g: {
    boxes: string
    tapDot: string
    discs: string
    tapMarked: string
    pieces: string
    mustJump: string
    tapPiece: string
    check: string
    checkSave: string
    materialEven: string
    up: (side: string, n: number) => string
    mate: (side: string) => string
    stalemate: string
    drawMaterial: string
    drawFifty: string
    drawRepetition: string
    youPlay: (mark: string) => string
    tapEmpty: string
    anyBoard: string
    square: (n: number) => string
    snakeDown: (n: number) => string
    ladderUp: (n: number) => string
    reached100: (side: string) => string
    blue: string
    shipsLeft: (mine: number, enemy: number) => string
    hit: string
    miss: string
    sunk: string
    fleetSunk: (side: string) => string
    tapWater: string
    enemyWaters: string
    yourFleet: string
    totals: (a: number, b: number) => string
    holdOrScore: (left: number) => string
    royaleWinner: (side: string, total: number) => string
    pairs: string
    noMatch: string
    findTwin: string
    flipCard: string
    teethLeft: (n: number) => string
    pressTooth: string
    snap: string
    dice: (a: number, b: number, left: string) => string
    tapRoll: string
    tapMarkedPoint: string
    tapChecker: string
    noMove: string
    bearsOff: (side: string) => string
    rollDice: string
    rolled: (n: number) => string
    pickPiece: string
    broughtHome: (side: string) => string
    pieceOut: (n: number) => string
    pieceHome: (n: number) => string
    pieceCapture: (n: number) => string
    piecePlus: (n: number, d: number) => string
    rollDie: string
    white: string
    black: string
    red: string
    green: string
  }
}

const EN: LoungeStrings = {
  howToPlay: 'How to play',
  howToSit: 'Walk up to a table and tap "Take a seat"; colours are dealt at random each round. Alone? Tap "Play the house bot".',
  move: {
    connectfour: 'Tap a column to drop your disc.',
    dotlines: 'Tap a dot, then a neighbouring dot, to draw the line between them. Closing a box gives you another turn.',
    reversi: 'Tap a marked square to place a disc; every enemy disc you flank flips to your colour.',
    tictactoe: 'Tap an empty square. Three in a row wins.',
    matchpairs: 'Tap two cards. A pair stays open and gives you another turn.',
    checkers: 'Tap one of your pieces, then a highlighted square. Jumps are mandatory.',
    chess: 'Tap one of your pieces, then a highlighted square. Pawns that reach the last rank become queens.',
    crocsnap: 'Tap any open tooth. One of them is the trigger: press it and you lose the round.',
    backgammon: 'Tap "Roll the dice", then a checker and a marked point (or Off to bear off). Each die is one move.',
    ludo: 'Tap "Roll the die", then one of the piece buttons. A six leaves the yard and rolls again; land on a rival to send it home.',
    supertictactoe: 'Tap a square in the highlighted board. The square you pick sends your rival to the board with that position; win three boards in a row.',
    snakesladders: 'Tap "Roll the die": your piece moves ahead. Ladders climb, snakes slide down, a six rolls again, exactly 100 wins.',
    seastrike: 'Fleets are placed at random. Tap a square of the enemy waters to fire; sink all five ships to win.',
    diceroyale: 'Roll up to three times, tap dice to hold them, then score one of 13 categories. Both players fill their own sheet; the higher total wins.'
  },
  timer: 'You have 60 seconds per move. Stand up whenever you like.',
  language: 'Language',
  gotIt: 'Got it',
  loadingProfile: 'Loading your profile…',
  connecting: 'Connecting to the lounge…',
  connectingWait: 'Connecting to the lounge, one moment…',
  walkUp: 'Walk up to a table and tap a seat to play',
  seatTaken: 'That seat is taken',
  tableFull: 'That table is full',
  timeoutLost: 'Time ran out, your opponent takes the round',
  timeoutWon: 'Your opponent ran out of time. Round is yours!',
  idleStood: 'You were idle for a while, so your seat is free again',
  leftStood: 'You left the table, your seat is free again',
  opponentLeft: 'Your opponent left the table',
  table: (n) => `Table ${n}`,
  openTable: 'Open table',
  comePlay: 'Open table · come play',
  vs: (a, b) => `${a} vs ${b}`,
  waitingForRival: (name) => `${name} is waiting for a rival`,
  oneSeatFree: 'One seat free',
  sitAs: (seat) => `Sit as ${seat}`,
  takeSeat: 'Take a seat',
  youPlaySide: (side) => `You play ${side} this round`,
  playBot: 'Play the house bot',
  notNow: 'Not now',
  toMove: (name) => `${name} to move`,
  wins: (name) => `${name} wins!`,
  drawShort: 'Draw!',
  you: 'You',
  houseBot: 'House Bot',
  waitingOpponent: 'Waiting for an opponent…',
  dealing: 'Dealing…',
  yourMove: (secs) => `Your move · ${secs}s`,
  thinking: (name, secs) => `${name} is thinking… ${secs}s`,
  draw: 'Draw! Well played.',
  youWin: 'You win the round!',
  takesRound: (name) => `${name} takes the round`,
  bot: 'Bot',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  playAgain: 'Play again',
  dismissBot: 'Dismiss bot',
  showBoard: 'Show board',
  hideBoard: 'Hide board',
  standUp: 'Stand up',
  elevatorTitle: 'Elevator · Where to?',
  elevatorHint: 'Tap a floor. Step off the pad to stay.',
  youAreHere: (floor) => `${floor} · you are here`,
  close: 'Close',
  floors: ['Lounge', 'Game room', 'Sky room', 'Rooftop'],
  elevator: 'ELEVATOR',
  welcome: 'Pick a table, take a seat, play a friend',
  comingSoon: 'coming soon',
  gameRoom: 'GAME ROOM',
  skyRoom: 'SKY ROOM',
  rooftop: 'ROOFTOP',
  rooftopNote: 'Leaderboard and tournaments: coming after the buildathon',
  seat: { Yellow: 'Yellow', Red: 'Red', Black: 'Black', White: 'White', Green: 'Green', Blue: 'Blue', X: 'X', O: 'O' },
  g: {
    boxes: 'Boxes',
    tapDot: 'Tap a dot, then a neighbour',
    discs: 'Discs',
    tapMarked: 'Tap a marked square',
    pieces: 'Pieces',
    mustJump: 'You must jump',
    tapPiece: 'Tap a piece',
    check: 'Check!',
    checkSave: 'Check! Save your king',
    materialEven: 'Material even',
    up: (side, n) => `${side} +${n}`,
    mate: (side) => `Checkmate, ${side} wins`,
    stalemate: 'Stalemate',
    drawMaterial: 'Draw, not enough material',
    drawFifty: 'Draw, fifty-move rule',
    drawRepetition: 'Draw by repetition',
    youPlay: (mark) => `You play ${mark}`,
    tapEmpty: 'Tap an empty square',
    anyBoard: 'Any open board: tap a square',
    square: (n) => (n > 0 ? `Square ${n}` : 'Not on the board yet'),
    snakeDown: (n) => `Snake! Down to ${n}`,
    ladderUp: (n) => `Ladder! Up to ${n}`,
    reached100: (side) => `${side} reached 100`,
    blue: 'Blue',
    shipsLeft: (mine, enemy) => `Ships ${mine} : ${enemy}`,
    hit: 'Hit!',
    miss: 'Miss',
    sunk: 'Sunk!',
    fleetSunk: (side) => `${side} sank the whole fleet`,
    tapWater: 'Tap enemy waters to fire',
    enemyWaters: 'Enemy waters',
    yourFleet: 'Your fleet',
    totals: (a, b) => `Score ${a} : ${b}`,
    holdOrScore: (left) => (left > 0 ? `Hold dice, roll (${left} left) or score` : 'Pick a category'),
    royaleWinner: (side, total) => `${side} wins with ${total}`,
    pairs: 'Pairs',
    noMatch: 'No match, flipping back…',
    findTwin: 'Find its twin',
    flipCard: 'Flip a card',
    teethLeft: (n) => `${n} teeth left`,
    pressTooth: 'Press a tooth',
    snap: 'SNAP! The trigger tooth',
    dice: (a, b, left) => `Dice ${a} · ${b}   left: ${left}`,
    tapRoll: 'Tap Roll',
    tapMarkedPoint: 'Tap a marked point (or Off)',
    tapChecker: 'Tap a checker to move',
    noMove: 'No move possible, passing…',
    bearsOff: (side) => `${side} bears off first`,
    rollDice: 'Roll the dice',
    rolled: (n) => `Rolled ${n}`,
    pickPiece: 'Pick a piece',
    broughtHome: (side) => `${side} brought all four home`,
    pieceOut: (n) => `Piece ${n} · out`,
    pieceHome: (n) => `Piece ${n} · home!`,
    pieceCapture: (n) => `Piece ${n} · capture!`,
    piecePlus: (n, d) => `Piece ${n} · +${d}`,
    rollDie: 'Roll the die',
    white: 'White',
    black: 'Black',
    red: 'Red',
    green: 'Green'
  }
}

const DE: LoungeStrings = {
  howToPlay: 'So wird gespielt',
  howToSit: 'Geh zu einem Tisch und tippe auf "Platz nehmen"; die Farben werden jede Runde ausgelost. Allein? Tippe auf "Gegen den Bot spielen".',
  move: {
    connectfour: 'Tippe auf eine Spalte, um deinen Stein fallen zu lassen.',
    dotlines: 'Tippe auf einen Punkt und dann auf einen Nachbarpunkt, um die Linie dazwischen zu zeichnen. Wer ein Kästchen schließt, ist noch einmal dran.',
    reversi: 'Tippe auf ein markiertes Feld, um einen Stein zu setzen. Jeder eingeschlossene gegnerische Stein wechselt die Farbe.',
    tictactoe: 'Tippe auf ein leeres Feld. Drei in einer Reihe gewinnen.',
    matchpairs: 'Tippe auf zwei Karten. Ein Paar bleibt offen, und du bist noch einmal dran.',
    checkers: 'Tippe auf einen deiner Steine und dann auf ein markiertes Feld. Schlagen ist Pflicht.',
    chess: 'Tippe auf eine deiner Figuren und dann auf ein markiertes Feld. Ein Bauer auf der letzten Reihe wird zur Dame.',
    crocsnap: 'Tippe auf einen freien Zahn. Einer davon ist der Auslöser: Wer ihn drückt, verliert die Runde.',
    backgammon: 'Tippe auf "Würfeln", dann auf einen Stein und ein markiertes Feld (oder Raus zum Herauswürfeln). Jeder Würfel ist ein Zug.',
    ludo: 'Tippe auf "Würfeln" und dann auf einen der Figuren-Buttons. Mit einer Sechs kommst du raus und würfelst noch einmal; wer auf einem Gegner landet, schickt ihn zurück.',
    supertictactoe: 'Tippe auf ein Feld im markierten Brett. Dein Feld schickt den Gegner in das Brett mit derselben Position; wer drei Bretter in einer Reihe gewinnt, gewinnt.',
    snakesladders: 'Tippe auf "Würfeln": deine Figur zieht vor. Leitern führen hoch, Schlangen runter, eine Sechs würfelt noch einmal, genau 100 gewinnt.',
    seastrike: 'Die Flotten werden zufällig aufgestellt. Tippe auf ein Feld im gegnerischen Meer, um zu feuern; wer alle fünf Schiffe versenkt, gewinnt.',
    diceroyale: 'Würfle bis zu dreimal, tippe Würfel zum Halten und trage dann eine von 13 Kategorien ein. Jeder füllt seinen eigenen Zettel; die höhere Summe gewinnt.'
  },
  timer: 'Du hast 60 Sekunden pro Zug. Aufstehen kannst du jederzeit.',
  language: 'Sprache',
  gotIt: 'Alles klar',
  loadingProfile: 'Profil wird geladen…',
  connecting: 'Verbindung zur Lounge…',
  connectingWait: 'Verbindung zur Lounge, einen Moment…',
  walkUp: 'Geh zu einem Tisch und tippe auf einen Platz',
  seatTaken: 'Der Platz ist besetzt',
  tableFull: 'Der Tisch ist voll',
  timeoutLost: 'Zeit abgelaufen, die Runde geht an deinen Gegner',
  timeoutWon: 'Dein Gegner hat die Zeit überschritten. Die Runde ist deine!',
  idleStood: 'Du warst eine Weile still, dein Platz ist wieder frei',
  leftStood: 'Du hast den Tisch verlassen, dein Platz ist wieder frei',
  opponentLeft: 'Dein Gegner hat den Tisch verlassen',
  table: (n) => `Tisch ${n}`,
  openTable: 'Freier Tisch',
  comePlay: 'Freier Tisch · komm spielen',
  vs: (a, b) => `${a} gegen ${b}`,
  waitingForRival: (name) => `${name} wartet auf einen Gegner`,
  oneSeatFree: 'Ein Platz frei',
  sitAs: (seat) => `Als ${seat} setzen`,
  takeSeat: 'Platz nehmen',
  youPlaySide: (side) => `Du spielst diese Runde ${side}`,
  playBot: 'Gegen den Bot spielen',
  notNow: 'Nicht jetzt',
  toMove: (name) => `${name} ist dran`,
  wins: (name) => `${name} gewinnt!`,
  drawShort: 'Unentschieden!',
  you: 'Du',
  houseBot: 'Haus-Bot',
  waitingOpponent: 'Warten auf einen Gegner…',
  dealing: 'Wird aufgebaut…',
  yourMove: (secs) => `Du bist dran · ${secs}s`,
  thinking: (name, secs) => `${name} überlegt… ${secs}s`,
  draw: 'Unentschieden! Gut gespielt.',
  youWin: 'Du gewinnst die Runde!',
  takesRound: (name) => `${name} holt die Runde`,
  bot: 'Bot',
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
  playAgain: 'Noch einmal',
  dismissBot: 'Bot wegschicken',
  showBoard: 'Brett zeigen',
  hideBoard: 'Brett ausblenden',
  standUp: 'Aufstehen',
  elevatorTitle: 'Aufzug · Wohin?',
  elevatorHint: 'Tippe auf ein Stockwerk. Geh von der Platte, um zu bleiben.',
  youAreHere: (floor) => `${floor} · du bist hier`,
  close: 'Schließen',
  floors: ['Lounge', 'Spielzimmer', 'Himmelszimmer', 'Dachterrasse'],
  elevator: 'AUFZUG',
  welcome: 'Such dir einen Tisch, setz dich, spiel eine Runde',
  comingSoon: 'kommt bald',
  gameRoom: 'SPIELZIMMER',
  skyRoom: 'HIMMELSZIMMER',
  rooftop: 'DACHTERRASSE',
  rooftopNote: 'Bestenliste und Turniere: kommen nach dem Buildathon',
  seat: { Yellow: 'Gelb', Red: 'Rot', Black: 'Schwarz', White: 'Weiß', Green: 'Grün', Blue: 'Blau', X: 'X', O: 'O' },
  g: {
    boxes: 'Kästchen',
    tapDot: 'Tippe auf einen Punkt, dann auf den Nachbarn',
    discs: 'Steine',
    tapMarked: 'Tippe auf ein markiertes Feld',
    pieces: 'Steine',
    mustJump: 'Du musst schlagen',
    tapPiece: 'Tippe auf einen Stein',
    check: 'Schach!',
    checkSave: 'Schach! Rette deinen König',
    materialEven: 'Material gleich',
    up: (side, n) => `${side} +${n}`,
    mate: (side) => `Schachmatt, ${side} gewinnt`,
    stalemate: 'Patt',
    drawMaterial: 'Remis, zu wenig Material',
    drawFifty: 'Remis, 50-Züge-Regel',
    drawRepetition: 'Remis durch Stellungswiederholung',
    youPlay: (mark) => `Du spielst ${mark}`,
    tapEmpty: 'Tippe auf ein leeres Feld',
    anyBoard: 'Freie Wahl: tippe auf ein Feld in einem offenen Brett',
    square: (n) => (n > 0 ? `Feld ${n}` : 'Noch nicht auf dem Brett'),
    snakeDown: (n) => `Schlange! Runter auf ${n}`,
    ladderUp: (n) => `Leiter! Hoch auf ${n}`,
    reached100: (side) => `${side} hat die 100 erreicht`,
    blue: 'Blau',
    shipsLeft: (mine, enemy) => `Schiffe ${mine} : ${enemy}`,
    hit: 'Treffer!',
    miss: 'Wasser',
    sunk: 'Versenkt!',
    fleetSunk: (side) => `${side} hat die ganze Flotte versenkt`,
    tapWater: 'Tippe auf das gegnerische Meer, um zu feuern',
    enemyWaters: 'Gegnerisches Meer',
    yourFleet: 'Deine Flotte',
    totals: (a, b) => `Punkte ${a} : ${b}`,
    holdOrScore: (left) => (left > 0 ? `Halten, würfeln (${left} übrig) oder eintragen` : 'Wähle eine Kategorie'),
    royaleWinner: (side, total) => `${side} gewinnt mit ${total}`,
    pairs: 'Paare',
    noMatch: 'Kein Paar, wird umgedreht…',
    findTwin: 'Finde das Gegenstück',
    flipCard: 'Dreh eine Karte um',
    teethLeft: (n) => `${n} Zähne übrig`,
    pressTooth: 'Drück einen Zahn',
    snap: 'SCHNAPP! Der Auslöser',
    dice: (a, b, left) => `Würfel ${a} · ${b}   übrig: ${left}`,
    tapRoll: 'Tippe auf Würfeln',
    tapMarkedPoint: 'Tippe auf ein markiertes Feld (oder Raus)',
    tapChecker: 'Tippe auf einen Stein',
    noMove: 'Kein Zug möglich, weiter…',
    bearsOff: (side) => `${side} hat zuerst alle draußen`,
    rollDice: 'Würfeln',
    rolled: (n) => `Gewürfelt: ${n}`,
    pickPiece: 'Wähle eine Figur',
    broughtHome: (side) => `${side} hat alle vier im Ziel`,
    pieceOut: (n) => `Figur ${n} · raus`,
    pieceHome: (n) => `Figur ${n} · Ziel!`,
    pieceCapture: (n) => `Figur ${n} · schlagen!`,
    piecePlus: (n, d) => `Figur ${n} · +${d}`,
    rollDie: 'Würfeln',
    white: 'Weiß',
    black: 'Schwarz',
    red: 'Rot',
    green: 'Grün'
  }
}

const ES: LoungeStrings = {
  howToPlay: 'Cómo se juega',
  howToSit: 'Acércate a una mesa y toca "Tomar asiento"; los colores se sortean en cada ronda. ¿Solo? Toca "Jugar contra el bot".',
  move: {
    connectfour: 'Toca una columna para soltar tu ficha.',
    dotlines: 'Toca un punto y luego un punto vecino para dibujar la línea entre ellos. Si cierras una caja, vuelves a jugar.',
    reversi: 'Toca una casilla marcada para colocar una ficha; cada ficha rival que encierres cambia a tu color.',
    tictactoe: 'Toca una casilla vacía. Tres en raya gana.',
    matchpairs: 'Toca dos cartas. Una pareja se queda abierta y vuelves a jugar.',
    checkers: 'Toca una de tus fichas y luego una casilla marcada. Capturar es obligatorio.',
    chess: 'Toca una de tus piezas y luego una casilla marcada. Un peón que llega a la última fila se convierte en dama.',
    crocsnap: 'Toca cualquier diente libre. Uno de ellos es el gatillo: si lo pulsas, pierdes la ronda.',
    backgammon: 'Toca "Tirar los dados", luego una ficha y un punto marcado (o Fuera para sacarla). Cada dado es un movimiento.',
    ludo: 'Toca "Tirar el dado" y luego uno de los botones de ficha. Con un seis sales del patio y vuelves a tirar; si caes sobre un rival, lo mandas a casa.',
    supertictactoe: 'Toca una casilla del tablero marcado. Tu casilla manda al rival al tablero de esa posición; gana quien hace tres tableros en raya.',
    snakesladders: 'Toca "Tirar el dado": tu ficha avanza. Las escaleras suben, las serpientes bajan, un seis vuelve a tirar, gana quien llega justo a 100.',
    seastrike: 'Las flotas se colocan al azar. Toca una casilla de las aguas enemigas para disparar; hunde los cinco barcos para ganar.',
    diceroyale: 'Tira hasta tres veces, toca dados para guardarlos y anota una de 13 categorías. Cada uno llena su propia hoja; gana el total más alto.'
  },
  timer: 'Tienes 60 segundos por jugada. Puedes levantarte cuando quieras.',
  language: 'Idioma',
  gotIt: 'Entendido',
  loadingProfile: 'Cargando tu perfil…',
  connecting: 'Conectando con el salón…',
  connectingWait: 'Conectando con el salón, un momento…',
  walkUp: 'Acércate a una mesa y toca un asiento para jugar',
  seatTaken: 'Ese asiento está ocupado',
  tableFull: 'Esa mesa está llena',
  timeoutLost: 'Se acabó el tiempo, la ronda es de tu rival',
  timeoutWon: 'A tu rival se le acabó el tiempo. ¡La ronda es tuya!',
  idleStood: 'Estuviste inactivo un rato, tu asiento vuelve a estar libre',
  leftStood: 'Dejaste la mesa, tu asiento vuelve a estar libre',
  opponentLeft: 'Tu rival dejó la mesa',
  table: (n) => `Mesa ${n}`,
  openTable: 'Mesa libre',
  comePlay: 'Mesa libre · ven a jugar',
  vs: (a, b) => `${a} contra ${b}`,
  waitingForRival: (name) => `${name} espera rival`,
  oneSeatFree: 'Un asiento libre',
  sitAs: (seat) => `Sentarse como ${seat}`,
  takeSeat: 'Tomar asiento',
  youPlaySide: (side) => `Esta ronda juegas con ${side}`,
  playBot: 'Jugar contra el bot',
  notNow: 'Ahora no',
  toMove: (name) => `Le toca a ${name}`,
  wins: (name) => `¡Gana ${name}!`,
  drawShort: '¡Empate!',
  you: 'Tú',
  houseBot: 'Bot de la casa',
  waitingOpponent: 'Esperando rival…',
  dealing: 'Preparando…',
  yourMove: (secs) => `Te toca · ${secs}s`,
  thinking: (name, secs) => `${name} está pensando… ${secs}s`,
  draw: '¡Empate! Bien jugado.',
  youWin: '¡Ganas la ronda!',
  takesRound: (name) => `${name} se lleva la ronda`,
  bot: 'Bot',
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
  playAgain: 'Otra ronda',
  dismissBot: 'Despedir al bot',
  showBoard: 'Ver tablero',
  hideBoard: 'Ocultar tablero',
  standUp: 'Levantarse',
  elevatorTitle: 'Ascensor · ¿A dónde?',
  elevatorHint: 'Toca una planta. Bájate de la plataforma para quedarte.',
  youAreHere: (floor) => `${floor} · estás aquí`,
  close: 'Cerrar',
  floors: ['Salón', 'Sala de juegos', 'Sala del cielo', 'Azotea'],
  elevator: 'ASCENSOR',
  welcome: 'Elige una mesa, siéntate, juega con alguien',
  comingSoon: 'muy pronto',
  gameRoom: 'SALA DE JUEGOS',
  skyRoom: 'SALA DEL CIELO',
  rooftop: 'AZOTEA',
  rooftopNote: 'Clasificación y torneos: después del buildathon',
  seat: { Yellow: 'Amarillo', Red: 'Rojo', Black: 'Negras', White: 'Blancas', Green: 'Verde', Blue: 'Azul', X: 'X', O: 'O' },
  g: {
    boxes: 'Cajas',
    tapDot: 'Toca un punto y luego un vecino',
    discs: 'Fichas',
    tapMarked: 'Toca una casilla marcada',
    pieces: 'Fichas',
    mustJump: 'Tienes que capturar',
    tapPiece: 'Toca una ficha',
    check: '¡Jaque!',
    checkSave: '¡Jaque! Salva a tu rey',
    materialEven: 'Material igualado',
    up: (side, n) => `${side} +${n}`,
    mate: (side) => `Jaque mate, ganan ${side}`,
    stalemate: 'Ahogado',
    drawMaterial: 'Tablas, material insuficiente',
    drawFifty: 'Tablas, regla de 50 movimientos',
    drawRepetition: 'Tablas por repetición',
    youPlay: (mark) => `Juegas con ${mark}`,
    tapEmpty: 'Toca una casilla vacía',
    anyBoard: 'Tablero libre: toca una casilla en cualquier tablero abierto',
    square: (n) => (n > 0 ? `Casilla ${n}` : 'Aún fuera del tablero'),
    snakeDown: (n) => `¡Serpiente! Bajas a ${n}`,
    ladderUp: (n) => `¡Escalera! Subes a ${n}`,
    reached100: (side) => `${side} llegó a 100`,
    blue: 'Azul',
    shipsLeft: (mine, enemy) => `Barcos ${mine} : ${enemy}`,
    hit: '¡Tocado!',
    miss: 'Agua',
    sunk: '¡Hundido!',
    fleetSunk: (side) => `${side} hundió toda la flota`,
    tapWater: 'Toca las aguas enemigas para disparar',
    enemyWaters: 'Aguas enemigas',
    yourFleet: 'Tu flota',
    totals: (a, b) => `Puntos ${a} : ${b}`,
    holdOrScore: (left) => (left > 0 ? `Guarda dados, tira (${left}) o anota` : 'Elige una categoría'),
    royaleWinner: (side, total) => `${side} gana con ${total}`,
    pairs: 'Parejas',
    noMatch: 'No coinciden, se dan la vuelta…',
    findTwin: 'Encuentra su pareja',
    flipCard: 'Levanta una carta',
    teethLeft: (n) => `Quedan ${n} dientes`,
    pressTooth: 'Pulsa un diente',
    snap: '¡SNAP! El diente gatillo',
    dice: (a, b, left) => `Dados ${a} · ${b}   quedan: ${left}`,
    tapRoll: 'Toca Tirar',
    tapMarkedPoint: 'Toca un punto marcado (o Fuera)',
    tapChecker: 'Toca una ficha para moverla',
    noMove: 'Sin movimiento posible, pasando…',
    bearsOff: (side) => `${side} sacan todo primero`,
    rollDice: 'Tirar los dados',
    rolled: (n) => `Salió ${n}`,
    pickPiece: 'Elige una ficha',
    broughtHome: (side) => `${side} llevó las cuatro a casa`,
    pieceOut: (n) => `Ficha ${n} · sale`,
    pieceHome: (n) => `Ficha ${n} · ¡a casa!`,
    pieceCapture: (n) => `Ficha ${n} · ¡captura!`,
    piecePlus: (n, d) => `Ficha ${n} · +${d}`,
    rollDie: 'Tirar el dado',
    white: 'Blancas',
    black: 'Negras',
    red: 'Rojo',
    green: 'Verde'
  }
}

const PT: LoungeStrings = {
  howToPlay: 'Como jogar',
  howToSit: 'Vá até uma mesa e toque em "Sentar-se"; as cores são sorteadas a cada rodada. Sozinho? Toque em "Jogar contra o bot".',
  move: {
    connectfour: 'Toque numa coluna para soltar a sua ficha.',
    dotlines: 'Toque num ponto e depois num ponto vizinho para traçar a linha entre eles. Fechar uma caixa dá outra jogada.',
    reversi: 'Toque numa casa marcada para colocar uma peça; toda peça adversária que você cercar vira para a sua cor.',
    tictactoe: 'Toque numa casa vazia. Três em linha vence.',
    matchpairs: 'Toque em duas cartas. Um par fica aberto e você joga de novo.',
    checkers: 'Toque numa das suas peças e depois numa casa marcada. Capturar é obrigatório.',
    chess: 'Toque numa das suas peças e depois numa casa marcada. Um peão que chega à última fila vira dama.',
    crocsnap: 'Toque em qualquer dente livre. Um deles é o gatilho: aperte e você perde a rodada.',
    backgammon: 'Toque em "Lançar os dados", depois numa peça e num ponto marcado (ou Fora para retirar). Cada dado é um movimento.',
    ludo: 'Toque em "Lançar o dado" e depois num dos botões de peça. Um seis tira a peça da base e joga de novo; caia sobre um rival para mandá-lo de volta.',
    supertictactoe: 'Toque numa casa do tabuleiro marcado. A sua casa manda o rival para o tabuleiro dessa posição; vence quem faz três tabuleiros em linha.',
    snakesladders: 'Toque em "Lançar o dado": a sua peça avança. Escadas sobem, cobras descem, um seis joga de novo, vence quem chega exatamente a 100.',
    seastrike: 'As frotas são posicionadas ao acaso. Toque numa casa das águas inimigas para atirar; afunde os cinco navios para vencer.',
    diceroyale: 'Jogue até três vezes, toque nos dados para segurá-los e marque uma de 13 categorias. Cada um preenche a sua folha; o total maior vence.'
  },
  timer: 'Você tem 60 segundos por jogada. Levante-se quando quiser.',
  language: 'Idioma',
  gotIt: 'Entendi',
  loadingProfile: 'Carregando o seu perfil…',
  connecting: 'Conectando ao salão…',
  connectingWait: 'Conectando ao salão, um momento…',
  walkUp: 'Vá até uma mesa e toque num assento para jogar',
  seatTaken: 'Esse assento está ocupado',
  tableFull: 'Essa mesa está cheia',
  timeoutLost: 'O tempo acabou, a rodada é do seu adversário',
  timeoutWon: 'O tempo do seu adversário acabou. A rodada é sua!',
  idleStood: 'Você ficou parado um tempo, o seu assento está livre de novo',
  leftStood: 'Você saiu da mesa, o seu assento está livre de novo',
  opponentLeft: 'O seu adversário saiu da mesa',
  table: (n) => `Mesa ${n}`,
  openTable: 'Mesa livre',
  comePlay: 'Mesa livre · venha jogar',
  vs: (a, b) => `${a} contra ${b}`,
  waitingForRival: (name) => `${name} espera um adversário`,
  oneSeatFree: 'Um assento livre',
  sitAs: (seat) => `Sentar como ${seat}`,
  takeSeat: 'Sentar-se',
  youPlaySide: (side) => `Nesta rodada você joga com ${side}`,
  playBot: 'Jogar contra o bot',
  notNow: 'Agora não',
  toMove: (name) => `Vez de ${name}`,
  wins: (name) => `${name} venceu!`,
  drawShort: 'Empate!',
  you: 'Você',
  houseBot: 'Bot da casa',
  waitingOpponent: 'Esperando um adversário…',
  dealing: 'Preparando…',
  yourMove: (secs) => `Sua vez · ${secs}s`,
  thinking: (name, secs) => `${name} está pensando… ${secs}s`,
  draw: 'Empate! Bem jogado.',
  youWin: 'Você venceu a rodada!',
  takesRound: (name) => `${name} leva a rodada`,
  bot: 'Bot',
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  playAgain: 'Jogar de novo',
  dismissBot: 'Dispensar o bot',
  showBoard: 'Ver tabuleiro',
  hideBoard: 'Ocultar tabuleiro',
  standUp: 'Levantar',
  elevatorTitle: 'Elevador · Para onde?',
  elevatorHint: 'Toque num andar. Saia da plataforma para ficar.',
  youAreHere: (floor) => `${floor} · você está aqui`,
  close: 'Fechar',
  floors: ['Salão', 'Sala de jogos', 'Sala do céu', 'Terraço'],
  elevator: 'ELEVADOR',
  welcome: 'Escolha uma mesa, sente-se, jogue com alguém',
  comingSoon: 'em breve',
  gameRoom: 'SALA DE JOGOS',
  skyRoom: 'SALA DO CÉU',
  rooftop: 'TERRAÇO',
  rooftopNote: 'Ranking e torneios: depois do buildathon',
  seat: { Yellow: 'Amarelo', Red: 'Vermelho', Black: 'Pretas', White: 'Brancas', Green: 'Verde', Blue: 'Azul', X: 'X', O: 'O' },
  g: {
    boxes: 'Caixas',
    tapDot: 'Toque num ponto e depois num vizinho',
    discs: 'Peças',
    tapMarked: 'Toque numa casa marcada',
    pieces: 'Peças',
    mustJump: 'Você precisa capturar',
    tapPiece: 'Toque numa peça',
    check: 'Xeque!',
    checkSave: 'Xeque! Salve o seu rei',
    materialEven: 'Material igual',
    up: (side, n) => `${side} +${n}`,
    mate: (side) => `Xeque-mate, ${side} vencem`,
    stalemate: 'Afogamento',
    drawMaterial: 'Empate, material insuficiente',
    drawFifty: 'Empate, regra dos 50 lances',
    drawRepetition: 'Empate por repetição',
    youPlay: (mark) => `Você joga com ${mark}`,
    tapEmpty: 'Toque numa casa vazia',
    anyBoard: 'Escolha livre: toque numa casa de qualquer tabuleiro aberto',
    square: (n) => (n > 0 ? `Casa ${n}` : 'Ainda fora do tabuleiro'),
    snakeDown: (n) => `Cobra! Desce para ${n}`,
    ladderUp: (n) => `Escada! Sobe para ${n}`,
    reached100: (side) => `${side} chegou aos 100`,
    blue: 'Azul',
    shipsLeft: (mine, enemy) => `Navios ${mine} : ${enemy}`,
    hit: 'Acertou!',
    miss: 'Água',
    sunk: 'Afundou!',
    fleetSunk: (side) => `${side} afundou a frota inteira`,
    tapWater: 'Toque nas águas inimigas para atirar',
    enemyWaters: 'Águas inimigas',
    yourFleet: 'Sua frota',
    totals: (a, b) => `Pontos ${a} : ${b}`,
    holdOrScore: (left) => (left > 0 ? `Segure dados, jogue (${left}) ou marque` : 'Escolha uma categoria'),
    royaleWinner: (side, total) => `${side} vence com ${total}`,
    pairs: 'Pares',
    noMatch: 'Não combinam, virando de volta…',
    findTwin: 'Ache o par',
    flipCard: 'Vire uma carta',
    teethLeft: (n) => `${n} dentes restantes`,
    pressTooth: 'Aperte um dente',
    snap: 'SNAP! O dente gatilho',
    dice: (a, b, left) => `Dados ${a} · ${b}   restam: ${left}`,
    tapRoll: 'Toque em Lançar',
    tapMarkedPoint: 'Toque num ponto marcado (ou Fora)',
    tapChecker: 'Toque numa peça para mover',
    noMove: 'Sem jogada possível, passando…',
    bearsOff: (side) => `${side} retiram tudo primeiro`,
    rollDice: 'Lançar os dados',
    rolled: (n) => `Saiu ${n}`,
    pickPiece: 'Escolha uma peça',
    broughtHome: (side) => `${side} levou as quatro para casa`,
    pieceOut: (n) => `Peça ${n} · sai`,
    pieceHome: (n) => `Peça ${n} · em casa!`,
    pieceCapture: (n) => `Peça ${n} · captura!`,
    piecePlus: (n, d) => `Peça ${n} · +${d}`,
    rollDie: 'Lançar o dado',
    white: 'Brancas',
    black: 'Pretas',
    red: 'Vermelho',
    green: 'Verde'
  }
}

const FR: LoungeStrings = {
  howToPlay: 'Comment jouer',
  howToSit: 'Approche-toi d\'une table et touche « S\'asseoir » ; les couleurs sont tirées au sort à chaque manche. Seul ? Touche « Jouer contre le bot ».',
  move: {
    connectfour: 'Touche une colonne pour lâcher ton jeton.',
    dotlines: 'Touche un point, puis un point voisin, pour tracer la ligne entre eux. Fermer une case donne un tour de plus.',
    reversi: 'Touche une case marquée pour poser un pion ; chaque pion adverse encadré passe à ta couleur.',
    tictactoe: 'Touche une case vide. Trois alignés gagnent.',
    matchpairs: 'Touche deux cartes. Une paire reste ouverte et tu rejoues.',
    checkers: 'Touche un de tes pions, puis une case marquée. La prise est obligatoire.',
    chess: 'Touche une de tes pièces, puis une case marquée. Un pion qui atteint la dernière rangée devient dame.',
    crocsnap: 'Touche une dent libre. L\'une d\'elles est le déclencheur : appuie dessus et tu perds la manche.',
    backgammon: 'Touche « Lancer les dés », puis un pion et un point marqué (ou Sortie pour le sortir). Chaque dé est un coup.',
    ludo: 'Touche « Lancer le dé », puis un des boutons de pion. Un six fait sortir un pion et tu relances ; tomber sur un adversaire le renvoie à sa base.',
    supertictactoe: 'Touche une case de la grille en surbrillance. Ta case envoie l\'adversaire dans la grille de même position ; gagne trois grilles alignées.',
    snakesladders: 'Touche « Lancer le dé » : ton pion avance. Les échelles montent, les serpents descendent, un six rejoue, arriver pile sur 100 gagne.',
    seastrike: 'Les flottes sont placées au hasard. Touche une case des eaux ennemies pour tirer ; coule les cinq navires pour gagner.',
    diceroyale: 'Lance jusqu\'à trois fois, touche des dés pour les garder, puis marque une des 13 catégories. Chacun remplit sa feuille ; le total le plus haut gagne.'
  },
  timer: 'Tu as 60 secondes par coup. Lève-toi quand tu veux.',
  language: 'Langue',
  gotIt: 'Compris',
  loadingProfile: 'Chargement de ton profil…',
  connecting: 'Connexion au salon…',
  connectingWait: 'Connexion au salon, un instant…',
  walkUp: 'Approche-toi d\'une table et touche un siège pour jouer',
  seatTaken: 'Ce siège est pris',
  tableFull: 'Cette table est complète',
  timeoutLost: 'Temps écoulé, la manche revient à ton adversaire',
  timeoutWon: 'Ton adversaire a dépassé le temps. La manche est à toi !',
  idleStood: 'Tu es resté inactif un moment, ton siège est de nouveau libre',
  leftStood: 'Tu as quitté la table, ton siège est de nouveau libre',
  opponentLeft: 'Ton adversaire a quitté la table',
  table: (n) => `Table ${n}`,
  openTable: 'Table libre',
  comePlay: 'Table libre · viens jouer',
  vs: (a, b) => `${a} contre ${b}`,
  waitingForRival: (name) => `${name} attend un adversaire`,
  oneSeatFree: 'Un siège libre',
  sitAs: (seat) => `Jouer ${seat}`,
  takeSeat: 'S\'asseoir',
  youPlaySide: (side) => `Cette manche tu joues ${side}`,
  playBot: 'Jouer contre le bot',
  notNow: 'Pas maintenant',
  toMove: (name) => `À ${name} de jouer`,
  wins: (name) => `${name} gagne !`,
  drawShort: 'Égalité !',
  you: 'Toi',
  houseBot: 'Bot de la maison',
  waitingOpponent: 'En attente d\'un adversaire…',
  dealing: 'Mise en place…',
  yourMove: (secs) => `À toi · ${secs}s`,
  thinking: (name, secs) => `${name} réfléchit… ${secs}s`,
  draw: 'Égalité ! Bien joué.',
  youWin: 'Tu gagnes la manche !',
  takesRound: (name) => `${name} remporte la manche`,
  bot: 'Bot',
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  playAgain: 'Rejouer',
  dismissBot: 'Renvoyer le bot',
  showBoard: 'Voir le plateau',
  hideBoard: 'Masquer le plateau',
  standUp: 'Se lever',
  elevatorTitle: 'Ascenseur · Où aller ?',
  elevatorHint: 'Touche un étage. Descends de la plaque pour rester.',
  youAreHere: (floor) => `${floor} · tu es ici`,
  close: 'Fermer',
  floors: ['Salon', 'Salle de jeux', 'Salle du ciel', 'Toit-terrasse'],
  elevator: 'ASCENSEUR',
  welcome: 'Choisis une table, assieds-toi, joue avec quelqu\'un',
  comingSoon: 'bientôt',
  gameRoom: 'SALLE DE JEUX',
  skyRoom: 'SALLE DU CIEL',
  rooftop: 'TOIT-TERRASSE',
  rooftopNote: 'Classement et tournois : après le buildathon',
  seat: { Yellow: 'les jaunes', Red: 'les rouges', Black: 'les noirs', White: 'les blancs', Green: 'les verts', Blue: 'les bleus', X: 'X', O: 'O' },
  g: {
    boxes: 'Cases',
    tapDot: 'Touche un point, puis un voisin',
    discs: 'Pions',
    tapMarked: 'Touche une case marquée',
    pieces: 'Pions',
    mustJump: 'Tu dois prendre',
    tapPiece: 'Touche un pion',
    check: 'Échec !',
    checkSave: 'Échec ! Sauve ton roi',
    materialEven: 'Matériel égal',
    up: (side, n) => `${side} +${n}`,
    mate: (side) => `Échec et mat, ${side} gagnent`,
    stalemate: 'Pat',
    drawMaterial: 'Nulle, matériel insuffisant',
    drawFifty: 'Nulle, règle des 50 coups',
    drawRepetition: 'Nulle par répétition',
    youPlay: (mark) => `Tu joues ${mark}`,
    tapEmpty: 'Touche une case vide',
    anyBoard: 'Choix libre : touche une case dans une grille ouverte',
    square: (n) => (n > 0 ? `Case ${n}` : 'Pas encore sur le plateau'),
    snakeDown: (n) => `Serpent ! Descente en ${n}`,
    ladderUp: (n) => `Échelle ! Montée en ${n}`,
    reached100: (side) => `${side} ont atteint 100`,
    blue: 'les bleus',
    shipsLeft: (mine, enemy) => `Navires ${mine} : ${enemy}`,
    hit: 'Touché !',
    miss: 'À l\'eau',
    sunk: 'Coulé !',
    fleetSunk: (side) => `${side} ont coulé toute la flotte`,
    tapWater: 'Touche les eaux ennemies pour tirer',
    enemyWaters: 'Eaux ennemies',
    yourFleet: 'Ta flotte',
    totals: (a, b) => `Score ${a} : ${b}`,
    holdOrScore: (left) => (left > 0 ? `Garde des dés, relance (${left}) ou marque` : 'Choisis une catégorie'),
    royaleWinner: (side, total) => `${side} gagnent avec ${total}`,
    pairs: 'Paires',
    noMatch: 'Pas de paire, retournement…',
    findTwin: 'Trouve sa jumelle',
    flipCard: 'Retourne une carte',
    teethLeft: (n) => `${n} dents restantes`,
    pressTooth: 'Appuie sur une dent',
    snap: 'SNAP ! La dent déclencheur',
    dice: (a, b, left) => `Dés ${a} · ${b}   restants : ${left}`,
    tapRoll: 'Touche Lancer',
    tapMarkedPoint: 'Touche un point marqué (ou Sortie)',
    tapChecker: 'Touche un pion à déplacer',
    noMove: 'Aucun coup possible, on passe…',
    bearsOff: (side) => `${side} sortent tout en premier`,
    rollDice: 'Lancer les dés',
    rolled: (n) => `Résultat : ${n}`,
    pickPiece: 'Choisis un pion',
    broughtHome: (side) => `${side} ont ramené les quatre`,
    pieceOut: (n) => `Pion ${n} · sortie`,
    pieceHome: (n) => `Pion ${n} · arrivée !`,
    pieceCapture: (n) => `Pion ${n} · prise !`,
    piecePlus: (n, d) => `Pion ${n} · +${d}`,
    rollDie: 'Lancer le dé',
    white: 'les blancs',
    black: 'les noirs',
    red: 'les rouges',
    green: 'les verts'
  }
}

const STRINGS: Record<string, LoungeStrings> = { en: EN, de: DE, es: ES, pt: PT, fr: FR }

export function stringsFor(code: string): LoungeStrings {
  return STRINGS[code] ?? EN
}

/** Strings for the current UI language. */
export function t(): LoungeStrings {
  return STRINGS[uiLang.code] ?? EN
}

/** Localised seat colour name ("Yellow" -> "Gelb"). */
export function seatLabel(name: string): string {
  return t().seat[name] ?? name
}

export function localeInfo(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]
}
