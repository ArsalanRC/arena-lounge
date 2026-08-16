# DoraHacks submission draft (Friendzone Mobile Buildathon)

Fill these into the DoraHacks BUIDL form. Keep it factual; judges test the
World themselves on a phone. Refresh the numbers from the Explorer stats
before submitting.

**Project name:** Arena Lounge

**One-liner:** A game lounge built for phones under a twisted tower: walk in,
take a seat, play Connect Four, Chess, Checkers, Reversi and more against a
friend or the house bot, at tables everyone in the World shares.

**World:** `arenalounge.dcl.eth`
**Repo:** https://github.com/ArsalanRC/arena-lounge (MIT)

## Short description

Arena Lounge is a social hangout in Decentraland built around shared game
tables. On the ground floor, six corners around a plaza host Connect Four,
Dot Lines, Reversi, Tic Tac Toe, Match Pairs and Checkers; elevator pads take
you up the tower to the game room (Chess, Croc Snap) and the rooftop terrace.
Anyone can walk up, take a seat and play; a house bot fills the empty seat so
a solo visitor is never stuck waiting, and steps aside the moment a human
wants the chair. Every move is visible to everyone in the World, so tables
become natural gathering points: play, watch, take the next seat.

## How it was designed and optimised for mobile

- Designed phone-first, then adapted for desktop, not the other way round.
  On phones the screen UI is the controller: a bottom bar with finger-sized
  controls (drop buttons, board cells of 56 units on the 1600x720 phone
  canvas, a ring of teeth) and the 3D table is the shared show; there is no
  need to aim at anything.
- One tap to play: a card offers "Sit as Yellow", "Sit as Red" or "Play the
  house bot" whenever you are near a table; sitting snaps you onto the seat
  pad facing the board in first person; "Stand up" is always one tap away.
  One step onto an elevator pad opens the floor picker; no stairs.
- Everything is SDK primitives plus two small generated GLBs (the tower and
  the leaf balls, 0.7 MB together), procedural textures and tiny synthesised
  sounds: ~880 entities and ~53k triangles on a 3x3 World, a 0.7 MB script,
  loads in seconds on 4G. The chess bot searches under a time budget so a
  slow phone never freezes.
- Safe-area aware UI, no hover states, no tiny targets, no rounded-corner CSS,
  no dynamic lights or particles (unsupported on mobile).
- Tested on a real phone with the Decentraland mobile app throughout the build.

## How it encourages social interaction

- Tables are shared CRDT state: seats, board, series score and turn timer are
  identical for everyone, late joiners included.
- The floating sign over each table says who is waiting for a rival; full
  tables invite you to watch from behind either player.
- Eight games at nine tables across two floors give a group reasons to split
  up, wander, and regroup on the rooftop; the bot only keeps a table warm,
  the games are built around two humans, and the series score ("2 : 1")
  gives a reason to stay for one more round.

## Why users return, replay, share or invite

- Rounds take one to five minutes (Croc Snap and Tic Tac Toe are the warm-up,
  Chess and Reversi the main course), the right lengths for a phone session.
- Series scores per pairing and the "your move" ding make it easy to play a
  best-of-five with a friend you brought along.
- Rules in 19 languages behind the "?" button; nothing to learn before the
  first round.
- Roadmap during incubation: persistent leaderboard and streaks on the
  rooftop (Multiplayer Server), Backgammon and Ludo, tournaments.

## Team

Arsalan Khadim, solo. Design, code and testing.
