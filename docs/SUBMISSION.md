# DoraHacks submission draft (Friendzone Mobile Buildathon)

Fill these into the DoraHacks BUIDL form. Keep it factual; judges test the
World themselves on a phone.

**Project name:** Arena Lounge

**One-liner:** A cosy game lounge built for phones: walk in, take a seat, play
Connect Four against a friend or the house bot, at tables everyone in the
World shares.

**World:** `arenalounge.dcl.eth`
**Repo:** https://github.com/ArsalanRC/arena-lounge (MIT)

## Short description

Arena Lounge is a small social hangout in Decentraland with three shared game
tables. Anyone can walk up, take the yellow or red seat and play a quick round
of Connect Four; a house bot fills the empty seat so a solo visitor is never
stuck waiting, and steps aside the moment a human wants the chair. Every disc
that falls is visible to everyone in the World, so tables become natural
gathering points: play, watch, take the next seat.

## How it was designed and optimised for mobile

- Designed phone-first, then adapted for desktop, not the other way round.
  On phones the screen UI is the controller (seven big drop buttons at thumb
  height, or an optional mini board) and the 3D table is the shared show;
  there is no need to aim at anything.
- One tap to play: a card offers "Sit as Yellow", "Sit as Red" or "Play the
  house bot" whenever you are near a table; sitting snaps you onto the seat
  pad facing the board in first person; "Stand up" is always one tap away.
- Everything is SDK primitives plus small procedural textures and tiny
  synthesised sounds: no downloads, ~270 entities, ~12k triangles for a 2x2
  parcel World, loads in seconds on 4G.
- Safe-area aware UI, no hover states, no tiny targets, no rounded-corner CSS,
  no dynamic lights or particles (unsupported on mobile).
- Tested on a real phone with the Decentraland mobile app throughout the build.

## How it encourages social interaction

- Tables are shared CRDT state: seats, board, series score and turn timer are
  identical for everyone, late joiners included.
- The floating sign over each table says who is waiting for a rival; full
  tables invite you to watch from behind either player.
- The bot only keeps a table warm; the game is built around two humans, and
  the series score ("2 : 1") gives a reason to stay for one more round.

## Why users return, replay, share or invite

- Rounds take two to three minutes, the perfect length for a phone session.
- Series scores per pairing and the "your move" ding make it easy to play a
  best-of-five with a friend you brought along.
- Roadmap during incubation: persistent leaderboard and streaks with the
  Multiplayer Server, a second game at the third table, and daily challenges.

## Team

Arsalan Khadim, solo. Design, code and testing.
