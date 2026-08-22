# DoraHacks submission draft (Friendzone Mobile Buildathon)

Fill these into the DoraHacks BUIDL form. Keep it factual; judges test the
World themselves on a phone. Refresh the numbers from the Explorer stats
before submitting.

**Project name:** Arena Lounge

**One-liner:** A game lounge built for phones under a twisted neon-lit
tower: walk in, take a seat, play Four in a Row, Chess, Backgammon, Ludo,
Reversi and ten more against a friend or the house bot, at tables everyone in
the World shares.

**World:** `arenalounge.dcl.eth` (live since 17 Aug 2026: https://decentraland.org/jump/?realm=arenalounge.dcl.eth)
**Repo:** https://github.com/ArsalanRC/arena-lounge (MIT)

## Short description

Arena Lounge is a social hangout in Decentraland built around shared game
tables. Under a curved neon marquee you enter a lounge where six corners
around a plaza host Four in a Row, Dot Lines, Reversi, Tic Tac Toe, Match
Pairs and Checkers; two glass elevators take you up the tower to the game
room (Chess, Croc Snap, Backgammon, Ludo, Super Tic Tac Toe, Snakes &
Ladders), the sky room (Sea Strike, a Dice Royale duel) and the rooftop
terrace. Fourteen games at twenty-eight tables. Anyone can walk up, take a seat
and play; sides are dealt at random every round, a house bot fills the empty
seat so a solo visitor is never stuck waiting, and it steps aside the moment
a human wants the chair. Every move is visible to everyone in the World, so
tables become natural gathering points: play, watch, take the next seat.

## How it was designed and optimised for mobile

- Designed phone-first, then adapted for desktop, not the other way round.
  On phones the screen UI is the controller: a bottom bar with finger-sized
  controls (drop buttons, board cells of 56 units on the 1600x720 phone
  canvas, a ring of teeth, a dice tray) and a show/hide board toggle; the 3D
  table is the shared show, there is no need to aim at anything.
- One tap to play: a card offers "Take a seat" or "Play the house bot"
  whenever you are near a table; sitting snaps you onto the seat pad facing
  the board in first person; "Stand up" is always one tap away. One step
  onto an elevator pad opens the floor picker; no stairs.
- Everything is generated: sixteen small GLBs written by a Python script
  (tower, facade, neon marquee, elevator shafts, furniture),
  procedural textures and tiny synthesised sounds. Measured on a real iPhone
  at forced-maximum graphics (22 Aug 2026): 100% performance everywhere,
  116.2k / 1.2M triangles, ~850 / 6K entities, 49 / 500 textures, 533 / 1.5K
  colliders, 21.7 MB content, ~950 MB / 2 GB memory; the
  production script is under 1 MB (0.25 MB gzipped), so it loads in seconds on
  4G. Game pieces are pooled and only exist while a table is in play. The
  chess bot searches under a time budget so a slow phone never freezes.
- Safe-area aware UI, no hover states, no tiny targets, no particles. The
  night look is carried by emissive materials (beacons, string lights, neon)
  with a handful of point lights the phone is free to skip.
- Tested on a real phone with the Decentraland mobile app throughout the build.

## How it encourages social interaction

- Tables are shared CRDT state: seats, board, series score and turn timer are
  identical for everyone, late joiners included.
- Ludo seats up to four people at one square table: the first to sit picks
  how many play, friends fill the chairs, house bots fill what is left.
- The floating sign over each table says who is waiting for a rival; full
  tables invite you to watch from behind either player.
- Fourteen games at twenty-eight tables across four floors give a group reasons to
  split up, wander, and regroup on the rooftop; the bot only keeps a table
  warm, the games are built around two humans, and the series score ("2 : 1")
  gives a reason to stay for one more round.

## Why users return, replay, share or invite

- Rounds take one to five minutes (Croc Snap and Tic Tac Toe are the warm-up,
  Chess, Backgammon and Reversi the main course), the right lengths for a
  phone session.
- Series scores per pairing and the "your move" ding make it easy to play a
  best-of-five with a friend you brought along.
- Rules in 19 languages behind the "?" button and the info kiosk, lounge
  chrome in English, German, Spanish, Portuguese and French; nothing to learn
  before the first round.
- The rooftop leaderboard: wins against people, current and best streak,
  top ten on the terrace board and your own totals behind the "?" button.
  Every result is signed by the player's wallet (Decentraland signedFetch,
  verified server-side) and only counted when the opponent's client reports
  the same outcome, so the board stays honest without a game server.
- Roadmap during incubation: tournaments, card games with hidden hands,
  seasonal boards.

## Team

Arsalan Khadim, solo. Design, code and testing.
