/**
 * Minimal i18n for the lounge: localised rule overviews for every game come
 * from Game Arena (23 languages, see instructions.ts); the few lounge-specific
 * help sentences are written natively per language below and fall back to
 * English for languages not covered yet.
 */
import type { GameId } from '../games/types'
import { LOCALES, type LocaleInfo } from './instructions'

export { LOCALES }

export interface LoungeStrings {
  howToPlay: string
  howToSit: string
  move: Partial<Record<GameId, string>>
  timer: string
  language: string
  gotIt: string
}

const EN: LoungeStrings = {
  howToPlay: 'How to play',
  howToSit: 'Walk up to a table and tap "Sit as Yellow" or "Sit as Red". Alone? Tap "Play the house bot".',
  move: {
    connectfour: 'Tap a column to drop your disc.',
    dotlines: 'Tap a dot, then a neighbouring dot, to draw the line between them. Closing a box gives you another turn.',
    reversi: 'Tap a marked square to place a disc; every enemy disc you flank flips to your colour.',
    tictactoe: 'Tap an empty square. Three in a row wins.',
    matchpairs: 'Tap two cards. A pair stays open and gives you another turn.',
    checkers: 'Tap one of your pieces, then a highlighted square. Jumps are mandatory.',
    chess: 'Tap one of your pieces, then a highlighted square. Pawns that reach the last rank become queens.',
    crocsnap: 'Tap any open tooth. One of them is the trigger: press it and you lose the round.',
    backgammon: 'Tap "Roll the dice", then a checker and a marked point (or Off to bear off). Each die is one move.'
  },
  timer: 'You have 60 seconds per move. Stand up whenever you like.',
  language: 'Language',
  gotIt: 'Got it'
}

const DE: LoungeStrings = {
  howToPlay: 'So wird gespielt',
  howToSit: 'Geh zu einem Tisch und tippe auf "Sit as Yellow" oder "Sit as Red". Allein? Tippe auf "Play the house bot".',
  move: {
    connectfour: 'Tippe auf eine Spalte, um deinen Stein fallen zu lassen.',
    dotlines: 'Tippe auf einen Punkt und dann auf einen Nachbarpunkt, um die Linie dazwischen zu zeichnen. Wer ein Kästchen schließt, ist noch einmal dran.',
    reversi: 'Tippe auf ein markiertes Feld, um einen Stein zu setzen. Jeder eingeschlossene gegnerische Stein wechselt die Farbe.',
    tictactoe: 'Tippe auf ein leeres Feld. Drei in einer Reihe gewinnen.',
    matchpairs: 'Tippe auf zwei Karten. Ein Paar bleibt offen, und du bist noch einmal dran.',
    checkers: 'Tippe auf einen deiner Steine und dann auf ein markiertes Feld. Schlagen ist Pflicht.',
    chess: 'Tippe auf eine deiner Figuren und dann auf ein markiertes Feld. Ein Bauer auf der letzten Reihe wird zur Dame.',
    crocsnap: 'Tippe auf einen freien Zahn. Einer davon ist der Auslöser: Wer ihn drückt, verliert die Runde.',
    backgammon: 'Tippe auf "Roll the dice", dann auf einen Stein und ein markiertes Feld (oder Off zum Herauswürfeln). Jeder Würfel ist ein Zug.'
  },
  timer: 'Du hast 60 Sekunden pro Zug. Aufstehen kannst du jederzeit.',
  language: 'Sprache',
  gotIt: 'Alles klar'
}

const ES: LoungeStrings = {
  howToPlay: 'Cómo se juega',
  howToSit: 'Acércate a una mesa y toca "Sit as Yellow" o "Sit as Red". ¿Solo? Toca "Play the house bot".',
  move: {
    connectfour: 'Toca una columna para soltar tu ficha.',
    dotlines: 'Toca un punto y luego un punto vecino para dibujar la línea entre ellos. Si cierras una caja, vuelves a jugar.',
    reversi: 'Toca una casilla marcada para colocar una ficha; cada ficha rival que encierres cambia a tu color.',
    tictactoe: 'Toca una casilla vacía. Tres en raya gana.',
    matchpairs: 'Toca dos cartas. Una pareja se queda abierta y vuelves a jugar.',
    checkers: 'Toca una de tus fichas y luego una casilla marcada. Capturar es obligatorio.',
    chess: 'Toca una de tus piezas y luego una casilla marcada. Un peón que llega a la última fila se convierte en dama.',
    crocsnap: 'Toca cualquier diente libre. Uno de ellos es el gatillo: si lo pulsas, pierdes la ronda.',
    backgammon: 'Toca "Roll the dice", luego una ficha y un punto marcado (u Off para sacarla). Cada dado es un movimiento.'
  },
  timer: 'Tienes 60 segundos por jugada. Puedes levantarte cuando quieras.',
  language: 'Idioma',
  gotIt: 'Entendido'
}

const STRINGS: Record<string, LoungeStrings> = { en: EN, de: DE, es: ES }

export function stringsFor(code: string): LoungeStrings {
  return STRINGS[code] ?? EN
}

export function localeInfo(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]
}
