#!/usr/bin/env python3
"""Extract per-locale game names + rule overviews from game-platform's
messages/*.json into src/lounge/i18n/instructions.ts.

Run from the repo root:  python3 tools/extract-instructions.py [path-to-game-platform/messages]
"""
import json, os, sys, glob

src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/PR-PROJECT/game-platform/messages')
GAMES = ['connectfour', 'dotlines', 'reversi', 'tictactoe', 'matchpairs', 'checkers', 'chess', 'crocsnap', 'backgammon', 'ludo', 'supertictactoe', 'snakesladders', 'seastrike', 'diceroyale']
NATIVE = {
  'en': 'English', 'de': 'Deutsch', 'es': 'Español', 'pt': 'Português', 'fr': 'Français', 'it': 'Italiano',
  'pl': 'Polski', 'tr': 'Türkçe', 'ru': 'Русский', 'ar': 'العربية', 'fa': 'فارسی', 'ur': 'اردو', 'hi': 'हिन्दी',
  'bn': 'বাংলা', 'mr': 'मराठी', 'ta': 'தமிழ்', 'te': 'తెలుగు', 'id': 'Bahasa Indonesia', 'vi': 'Tiếng Việt',
  'tl': 'Filipino', 'ja': '日本語', 'zh': '中文', 'pcm': 'Naijá'
}
RTL = {'ar', 'fa', 'ur'}
# ar/fa/ur need glyph shaping and te renders garbled in the explorer font (checked 16 Aug 2026); re-add once the client supports them
SKIP = {'ar', 'fa', 'ur', 'te'}
order = ['en', 'es', 'pt', 'de', 'fr', 'it', 'pl', 'tr', 'ru', 'zh', 'ja', 'hi', 'id', 'vi', 'tl', 'ar', 'fa', 'ur', 'bn', 'mr', 'ta', 'te', 'pcm']

def clean(text):
    # house style: no em-dashes
    return text.replace(' — ', ', ').replace('—', ', ').replace(' – ', ', ')

# Game names that are third-party trademarks in the source catalog get a generic
# name here (Hasbro owns "Connect Four" and its local brand names); the lounge
# never shows a protected name.
NAME_OVERRIDES = {
    'connectfour': {
        'en': 'Four in a Row', 'es': 'Cuatro en raya', 'pt': 'Quatro em linha', 'de': 'Vier in einer Reihe',
        'fr': 'Quatre en ligne', 'it': 'Quattro in fila', 'ja': '四目並べ',
        'hi': 'Four in a Row', 'bn': 'Four in a Row', 'mr': 'Four in a Row', 'ta': 'Four in a Row',
    },
}
BRAND_WORDS = ['Connect Four', 'Connect 4', 'Vier gewinnt', 'Conecta cuatro', 'Conecta 4', 'Puissance 4', 'Forza 4', 'Lig 4', 'コネクトフォー']

en = json.load(open(os.path.join(src, 'en.json')))
out = []
for code in order:
    path = os.path.join(src, f'{code}.json')
    if not os.path.exists(path) or code in SKIP:
        continue
    d = json.load(open(path))
    games = {}
    for g in GAMES:
        name = NAME_OVERRIDES.get(g, {}).get(code) or d.get('games', {}).get(g) or en['games'][g]
        overview = d.get('instructions', {}).get(g, {}).get('overview') or en['instructions'][g]['overview']
        for brand in BRAND_WORDS:
            if brand in overview:
                overview = overview.replace(brand, NAME_OVERRIDES['connectfour'].get(code, 'Four in a Row'))
        games[g] = {'name': clean(name), 'overview': clean(overview)}
    out.append({'code': code, 'name': NATIVE.get(code, code), 'rtl': code in RTL, 'games': games})

ts = ['/**',
      ' * Localised game names + rule overviews, extracted from Game Arena',
      ' * (game-platform/messages/*.json) by tools/extract-instructions.py.',
      ' * Do not edit by hand; re-run the script.',
      ' */',
      "import type { GameId } from '../games/types'",
      '',
      'export interface LocaleInfo {',
      '  code: string',
      '  /** Language name in its own language, for the picker. */',
      '  name: string',
      '  rtl: boolean',
      '  games: Partial<Record<GameId, { name: string; overview: string }>>',
      '}',
      '',
      'export const LOCALES: LocaleInfo[] = ' + json.dumps(out, ensure_ascii=False, indent=2),
      '']
open('src/lounge/i18n/instructions.ts', 'w').write('\n'.join(ts))
print(f'wrote src/lounge/i18n/instructions.ts with {len(out)} locales')
