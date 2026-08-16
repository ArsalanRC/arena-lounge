# ARENA-LOUNGE-SPEC.md — continuation file

Single source of truth for the Arena Lounge project. Updated after every
meaningful change (new commit, decision, test result). If a chat is closed,
start the next one with the continuation prompt in section 0. Keep this file
honest: only verified facts under "State".

## 0. Continuation prompt (paste this into a fresh Claude Code chat)

> Read ~/PR-PROJECT/arena-lounge/ARENA-LOUNGE-SPEC.md fully, then
> ~/PR-PROJECT/arena-lounge/CLAUDE.md, before doing anything. This is the
> Decentraland Friendzone Mobile Buildathon entry (deadline 4 Sept 2026). The
> repo is PRIVATE until submission; branch + PR for every change; commits as
> ArsalanRC with the noreply address; no AI attribution; no em-dashes in copy.
> Start the previews with `pnpm start:mcp` (desktop + MCP harness) and
> `pnpm start:mobile` (phone QR), test through tools/dev (README there).
> Then continue with the "Next up" list in section 4b of the spec, and keep
> the spec's changelog updated after every merged PR.

Rules Arsalan set on 16 Aug (keep them): code stays private until the
DoraHacks submission; the landing page + profile/portfolio entries are fine
and stay public; nothing gets published beyond that without asking. The
"one floor only" rule from 14:05 was lifted by him at ~14:30 (see decisions):
the lounge now has the tower with a game room and a rooftop, and he wants
more games (Chess first) and a bold exterior.

Last update: 2026-08-16 18:10 (Europe/Berlin), chrome i18n

## 1. What this is

- Entry for the **Decentraland Friendzone Mobile Buildathon 2026**
  (DoraHacks #2353, https://dorahacks.io/hackathon/2353/detail).
- A mobile-first social game lounge in a Decentraland World. Today: three
  shared Connect Four tables with seats, house bot, series score, turn timer.
- Owner: Arsalan Khadim (GitHub ArsalanRC). Solo entry. Claude Code builds,
  Arsalan tests on phone/desktop, handles wallet, NAME, DoraHacks form.

## 2. Hard facts and deadlines (verified from DoraHacks page + T&C on 15 Aug)

| Item | Value |
|------|-------|
| Build phase | 14 Aug to 4 Sept 2026 |
| Submission deadline | 4 Sept 2026, 02:00 as shown on the DoraHacks page |
| Judging | 5 to 11 Sept 2026 (World must stay online) |
| Winners | 13 Sept 2026 |
| Prizes | $3,000 / $2,000 / $1,500 / $1,000 / $500 in MANA; first 50 valid entries get $30 merch voucher; top 10 may be featured in DCL Mobile Discover |
| Must | deployed to a Decentraland World, public throughout judging, meaningful social/multiplayer play, works without a host, designed + tested on the Decentraland mobile app (judges test ONLY on mobile), open source on public GitHub with a license, submitted through DoraHacks with description + mobile/social/retention explanations |
| Must not | single-player only, empty venue, event-dependent, plagiarised, reused from past DCL competitions |
| Judging criteria | Mobile-First Experience, Social Value, Mobile UX & Accessibility, Performance, Creativity & Originality, Retention & Discovery, Overall Execution |
| AI tools | no restriction; Decentraland officially supports Claude Code + `npx skills add decentraland/sdk-skills` |

## 3. Names, links, accounts

- Working title: **Arena Lounge** (rename possible; World name follows the NAME bought)
- Repo: https://github.com/ArsalanRC/arena-lounge (**private until the submission**, MIT), local `~/PR-PROJECT/arena-lounge`. Landing page: https://arsalanrc.github.io/arena-lounge/ (served from the portfolio repo folder `arena-lounge/`). Work goes through branches + PRs; `gh` needs the ArsalanRC token: run `eval "$(direnv export bash)"` from `~/PR-PROJECT/game-platform` first (its .envrc holds GH_TOKEN), then cd here
- World name placeholder in scene.json: `arenalounge.dcl.eth` (NAME not bought yet, see docs/DEPLOY.md)
- Decentraland account: logged into Creator Hub + desktop Explorer as ArsalanRC (address 0x3451...5e9f seen in preview)
- Related repo: game-platform (`~/PR-PROJECT/game-platform`, org fgamesforfun-star): 28 pure-TS game engines with tests, 23 locales of UI + instructions. Connect Four engine copied from there verbatim.
- Public identity to show in README/app: GitHub https://github.com/ArsalanRC, LinkedIn https://www.linkedin.com/in/muhammad-arsalan-khadim-b87550259/, portfolio https://arsalanrc.github.io. Never publish the email. Git author = GitHub noreply address.

## 4. State (verified, 16 Aug 2026)

Done and tested in the desktop Explorer through the explorer MCP harness, plus
one manual test by Arsalan on desktop and one on the phone ("the mobile
version works as well", 16 Aug 11:30):

- 3x3 parcel World scene (48 m): garden ring with low-poly trees and a path,
  the fenced 32 m parquet lounge in the middle (spawn south at 24,18), gateway
  with the welcome sign, round plaza (tree, benches, lamps), six game corners
  around it (rug tint + banner pole each), tables derived from ZONES.
- The tower (models/tower.glb from tools/gen-models.py, one entity): a diagrid
  of 24 copper ribs on opposite helices (radius 15.4 at the ground, 10.5 at
  the crown, 110 degrees of twist each way, 24 m tall), two annular slabs with
  an oculus over the plaza tree (game room y=8, rooftop y=16) with railings,
  posts and glowing rims, invisible `_collider` meshes for slabs + railings;
  seven ground columns (two flank the entrance) and three game-room columns.
  Game room: four corners (Chess, Backgammon, Croc Snap, Ludo) with "coming
  soon" banners until their plugins exist (BUILT_GAMES). Rooftop: benches
  around the oculus, lamps, planters, "leaderboard later" sign.
- Elevators: two glass shafts (SE beside the entrance at 29.5/18.5, NW at
  16.6/30.5), four posts + translucent panes from the ground to above the
  rooftop, open towards the plaza, glowing pad + light ring + ELEVATOR sign
  on every floor; standing on a pad opens the floor panel (Lounge / Game room
  / Rooftop / Close), a tap calls movePlayerTo onto that floor just outside
  the shaft, facing the plaza; the panel re-arms when the player steps off.
  Tables on other floors are "far" for the proximity card; sitting snaps to
  the table's floor height.
- Connect Four per table: see-through frame (alpha-tested planes), 42 pooled
  sprite-plane discs with drop tween + bounce, win glow, seat pads, robot
  token (tap = play the house bot), floating sign with live status.
- Networking: serverless CRDT (`syncEntity`), one entity per table with
  `TableBoard` (gameId + engine state JSON + turn/status/score) + `TableSeatA`
  + `TableSeatB` (fixed sync ids 100..102). Games plug in through
  `src/lounge/games/types.ts` (TableGame: rules, bot, 3D view, controls). Write
  discipline documented in src/lounge/tables.ts. Seat heartbeats (5 s),
  stale seat cleanup (30 s), onLeaveScene cleanup, orphan-bot cleanup,
  60 s turn timer applied by seated players, auto-stand at 7 m for 8 s.
- House bot: minimax alpha-beta (medium), driven by the seated human's client.
- UI (React-ECS; desktop canvas 1920x1080, phone canvas 1600x720, the SDK
  overrides any 16:9 request on phones): top hint + toasts, table card near a
  table (Sit as Yellow / Sit as Red / Play the house bot / Not now; the
  spectator mini board is desktop-only), seated controller (desktop:
  right-docked column with the board; phone: a three-column bar along the
  bottom, info | game controls | actions, with finger-sized boards: 8x8 cells
  56 units, Dot Lines pitch 60, TTT 96, Pairs 74, Connect Four strip 70x76 +
  "Show board" toggle), Stand up / Play again / Dismiss bot / bot strength.
  `DEBUG_MOBILE_UI` in config.ts previews the phone layout on the desktop
  (tools/dev/README.md).
- First-person camera only on the local player's own seat pad; sitting snaps
  the avatar to the pad facing the board (yaw re-issued after the switch).
- Sounds: synthesised WAVs (drop, win chime, your-move ding, sit click, lose).
- Perf (9 parcels, 7 tables, tower, garden): 779 entities of 1800 (43%),
  50k triangles of 90k (56%; a primitive sphere costs ~770 triangles, so leaf
  balls are the 320-triangle models/canopy.glb and lanterns are cubes),
  textures 25 of 33. Deployed bundle ~0.7 MB minified (`deploy` builds with
  --production; the dev bin/index.js is 7 MB with sourcemaps) + tower.glb
  0.65 MB + canopy.glb 25 KB + 16 PNGs.
- Tests: 377 vitest tests over the ten pure engines. `pnpm build` strict type-check green.
- Ludo (Table 11, game room west corner, seat A red vs seat B green, opposite
  yards): engine from game-platform (69 tests, single-die rules: six leaves the
  yard + rolls again, three sixes forfeit, capture / home = extra roll, safe
  cells); actions roll (die chosen by the acting client) / piece / skip,
  `pending` skips a roll with no legal move; upright 15x15 board texture
  (images/ludo-board.png generated from the engine's track constants), eight
  sliding disc pieces, "red rolled 6" readout; controls: mini board for the
  picture + one big button per legal move (pieces are too small to tap on a
  phone) + Roll button. All four game-room corners are live: no "coming soon"
  banners remain.
- Backgammon (Table 9 east corner of the game room, seat A white): engine
  from game-platform (23 tests, standard rules incl. bar, hits, higher-roll
  bearing off, doubles); actions roll (dice chosen by the acting client, in
  the action) / move / pass, `pending` passes a rolled turn with no legal
  move; upright board texture (images/backgammon-board.png) with a 30-disc
  pool stacked on points and bar, off trays with counts, dice readout;
  controls: 24 point buttons + bar + off + "Roll the dice"; UI mirrors for
  seat B. Table numbering: Croc Snap is now Table 10 (south).
- Croc Snap (Table 9, game room south corner): pure-luck party round, 12
  teeth + 1 hidden trigger (the index travels in the synced state, never
  shown), engine from game-platform (37 tests), upright croc face disc
  (images/croc-face.png) with tooth boxes that sink when pressed, red trigger
  + "SNAP!" label, ring-of-teeth touch UI (64-unit buttons on phones).
- Chess (Table 8, game room, seat A white): full FIDE engine from game-platform
  (47 tests) + 2 lounge tests for the time budget; the bot searches with
  iterative deepening under a 350 ms budget (depth 1 always answers, a fast
  desktop reaches depth 4 on hard, a slow phone stops earlier instead of
  freezing); pawns auto-promote to queens; 12 flat piece sprites from
  tools/gen-textures.py; upright board reusing the checkers texture; castling
  slides the rook, en passant removes the right pawn; check shown on the
  king's square + status line; results (mate, stalemate, 50-move, repetition,
  material) in the status line; wire payload ~300 bytes with the position
  hashes pruned to the last irreversible move.
- How to play: "?" buttons + info kiosk at spawn open a panel with the rules
  overview in 19 languages (from game-platform). The whole lounge chrome
  (hint, toasts, table card, controller, elevator panel, table signs, banner
  names, kiosk, gateway, floor labels, per-game hint lines, seat colour names)
  is written natively in EN / DE / ES / PT / FR (src/lounge/i18n/index.ts,
  `t()`); the other 14 picker languages fall back to English for the chrome
  and keep their localised rules. Game names on signs and banners come from
  the catalog. 3D labels re-render on a language change (relabelSystem).
  Textures: the explorer counts 44 runtime textures vs a soft cap of 33 for
  9 parcels; the 12 chess sprites could become one atlas (plane + UI uvs) if
  that ever matters.
- Docs: README.md, docs/DEPLOY.md, docs/SUBMISSION.md (draft), CLAUDE.md.

### 4b. Next up (in order)

1. Arsalan: reload the phone build, walk the plaza, try every corner, send
   screenshots (the mobile controller layout has never been seen by Claude).
2. Arsalan: guest-login on the phone + Claude seated on desktop = first real
   two-player test (seat claiming, moves, turn timer, opponent-left toast).
   Both clients must use the SAME preview server (each `sdk-commands start`
   process serves its own comms room, `/mini-comms/room-1`, verified in
   sdk-commands/start/server/realm.js): stop the 8000/8001 pair and run one
   `pnpm start:pair` (desktop Explorer + MCP + phone QR on one port).
3. Arsalan: buy the NAME (docs/DEPLOY.md), then Claude deploys the World and
   both test it from the real app; keep deploying often after that.
4. Claude: mobile layout tuning from the phone screenshots (open: where the
   phone HUD sits, whether the bar overlaps joystick / jump buttons; if it
   does, switch the main UI to `screenInset: 'interactable'` or narrow the
   bar). Done 16 Aug 14:25 without screenshots: the phone controller bar with
   finger-sized boards for all six games, verified in the desktop emulation.
5. Claude: (Chess 15:20, Croc Snap 15:45, Backgammon 17:00, Ludo 17:35
   done: ten games, eleven tables, no placeholders left.) Next games in the
   order Arsalan confirms: Super Tic Tac Toe, Snakes & Ladders, Sea Strike,
   Dice Royale duel. They need new corners: widen the game room ring or add
   corners between the elevators (angles 45 / 225 at r 9 are free), or a
   third floor.
6. Claude: exterior polish from Arsalan's reaction to the tower screenshots
   (docs/screenshots/tower-*.jpg): rib colour, textured slabs (UV + embedded
   PNG in the GLB), lighting accents, more garden.
7. Claude: (done 18:10) lounge chrome in EN/DE/ES/PT/FR. Still open: native
   review of the imported rule overviews in the other languages, and a
   picker entry outside the help panel if testers ask for it.
8. Claude: README + submission text refresh (seven games, tower, floors),
   phone screenshots into README and the landing page.
9. Later: Multiplayer Server for a persistent leaderboard on the rooftop,
   tournaments (see sections 6 and 10).

Not done: buy NAME, deploy, DoraHacks form, GitHub Pages
landing page (Arsalan's standing repo ritual), phone screenshots for the README.

## 5. Decisions log

- 15 Aug: concept = shared game tables in a lounge; reuse game-platform engines.
- 16 Aug: serverless CRDT first (works on mobile for sure, fastest to a playable
  build); Multiplayer Server (`@dcl/sdk@auth-server`) is the upgrade path for a
  persistent leaderboard. Three official mobile sample scenes use it, so it
  runs on mobile.
- 16 Aug: pnpm with hoisted node_modules (SDK resolves `../ecs` relative to
  js-runtime; strict pnpm layout breaks it). Never `pnpm start -p`.
- 16 Aug: UI is the controller, 3D table is the show (mobile pointer input
  needs crosshair aiming; screen UI is tapped directly).
- 16 Aug: tables at bar height + first person while seated; level view sees
  the board centred (cameraTarget aimed at floor height, see gotchas).
- 16 Aug: discs are sprite planes, not cylinders (triangle budget).
- 16 Aug (Arsalan): after mechanics are clean, build a "house": floors with
  games, an elevator; many games; instructions in many languages; leaderboards
  and tournaments (maybe prizes) later. See roadmap.
- 16 Aug ~14:30 (Arsalan, after testing the phone build: "works fine, looks
  good"): add more games (Chess and others), make it a building with more
  floors, work on the exterior, "a crazy design, twirly building", asked
  whether the rules allow it. Rules check on the DoraHacks page: no restriction
  on buildings or design; scored criteria include Creativity/Originality and
  Performance on mobile. Decision (Claude, at his request): 3x3 parcels for the
  budget, the ground-floor lounge unchanged, a generated diagrid tower over the
  plaza with a game room + rooftop, elevator = pad + teleport panel. Screenshots
  in docs/screenshots/tower-*.jpg for his reaction.
- 16 Aug ~16:00 (Arsalan, on the tower screenshots): "looks great ... i love
  the design"; asked for two elevators that are clearly elevators (done
  16:15: glass shafts), and which other games can be added (answer given in
  chat: Backgammon, Ludo 2-player, Super TTT, Snakes & Ladders, Sea Strike,
  Dice Royale as a duel; card games only with hidden-hand caveats; solo games
  as side arcades at most). Order to be confirmed by him.
- 16 Aug: game boards on phones are the controller (finger-sized cells); the
  "Show board" toggle only exists for Connect Four (its strip). Confirmed by
  Arsalan's phone test ("show/hide board doesn't do much for some games").

## 6. Roadmap (ordered)

1. Mechanics polish: spectator mini board for bystanders, opponent-left toast,
   AFK auto-stand at bot tables, bot difficulty choice, phone layout tuning
   from real screenshots.
2. Ship path: push repo, buy NAME, first deploy, verify on phone from the real
   World, README screenshots. Then keep deploying often; last safe deploy before
   4 Sept.
3. (done 16 Aug) Six games through the TableGame plugin contract.
4. (done 16 Aug) Instructions panel with language picker. Next: lounge chrome
   strings in more languages, native review of the imported overviews.
5. The house: compact multi-floor building, elevator = floor-selector UI that
   teleports (movePlayerTo), each floor a game area; rooftop = leaderboard /
   tournament board. Keep total content within mobile budgets.
6. Retention: persistent leaderboard + streaks (Multiplayer Server + Storage),
   tournaments, maybe prizes (check T&C / DCL policies first).
7. Ritual: (done) GitHub Pages landing page (bilingual EN+DE) at
   https://arsalanrc.github.io/arena-lounge/ ; still open: profile README and
   portfolio entry.

## 7. How to run / test / deploy

Preview processes are per session: a fresh chat must start them again
(`pnpm start:mcp`, and `pnpm start:mobile` for the phone QR; never
`pnpm start -p`, pnpm eats `-p`). The Explorer MCP harness and the gh
wrapper live in `tools/dev/` (README there); `tools/dev/coords.mjs` prints
click coordinates per table. `tools/dev/ghrc` must be used for every `gh`
call (loads the ArsalanRC token from game-platform's direnv).

```
cd ~/PR-PROJECT/arena-lounge
pnpm install
pnpm start:mcp      # desktop preview + explorer MCP at http://127.0.0.1:8123/unity-explorer-mcp
pnpm start:mobile   # QR for the phone (same Wi-Fi), port 8001 (its own comms room!)
pnpm start:pair     # ONE server for desktop + phone: use this for two-player tests
pnpm test           # engine tests
pnpm build          # bundle + strict type-check
```
Deploy: docs/DEPLOY.md. Submission text: docs/SUBMISSION.md.

## 8. Gotchas (verified)

- React-ECS: text with `height: 'auto'` ignores textAlign; nested auto-height
  wrappers eat panel padding. Give explicit heights.
- `movePlayerTo` measures cameraTarget/avatarTarget from the avatar's base
  (feet), not the eyes: aim at y = 0 for a level first-person view; a target
  at 1.6 m height tilts the camera ~42° up. One call is enough.
- Explorer MCP has no UI-tap tool; anything that must be testable headlessly
  needs a 3D affordance (that is why the robot token exists).
- `sdk-commands start` rewrites package.json trailing newline; harmless.
- Creator Hub autosaves `assets/scene/main.composite`; do not edit it while
  the scene is open there. Gameplay entities are code, composite is decor only.
- Auto-height panels: a `height: 'auto'` panel whose children are auto-height
  wrappers loses its padding top and bottom; give the inner wrapper explicit
  vertical margins (see the phone bar in ui.tsx) or the last row a fixed height.
- The 16 Aug session log below (12:00 to 16:55) ran ahead of the clock; git
  says the same work landed 12:00 to 13:28. From 14:00 on the times are real.

## 8b. Session log 16 Aug (what happened, for orientation)

10:30 scaffold + first playable build; 11:30 phone confirmed working by
Arsalan; 11:45 repo public + CI; 12:00-13:00 generic tables, Dot Lines,
Reversi, how-to-play, landing page, collider collapse; 13:35 "don't publish
yet"; 14:05 repo made private, page moved to the portfolio repo; 14:30 UI
cleanup + help tabs; 15:05 plaza layout with six corners; 15:25 Tic Tac Toe;
15:55 Match Pairs (+ pending-action hook); 16:25 Checkers (+ getState for 3D
input); 16:40 texture trim; 16:55 handoff (this file, tools/dev).

## 9. Changelog

- 2026-08-16 18:10 lounge chrome i18n: every lounge string (hint, toasts, table card, controller, elevator panel, table signs, banners, kiosk, gateway, floor labels, per-game hints, seat colours) through `t()` in EN/DE/ES/PT/FR written natively; `uiLang` shared by UI, toasts and 3D labels; relabelSystem for TextShapes; game names on signs from the catalog; house bot name localised per viewer
- 2026-08-16 17:35 Ludo plugin (engine ported, 69 tests): red vs green duel, board texture from the engine's constants, eight sliding pieces, roll/piece/skip actions with client-chosen die, pending skip, mini board + move buttons; catalog rows in 19 languages + tips EN/DE/ES; game room west corner live, all four game-room corners built
- 2026-08-16 17:00 Backgammon plugin (engine ported, 23 tests): upright board texture, 30-disc pool with bar + off trays, dice readout, roll/move/pass actions with client-chosen dice, pending pass, 24-point touch board with Roll button; catalog rows in 19 languages + tips EN/DE/ES; game room east corner live
- 2026-08-16 16:15 two elevator shafts (glass, posts, light rings, ELEVATOR signs on every floor), rides land just outside the shaft the player used; README + docs/SUBMISSION.md refreshed (PR 23); landing page + portfolio card updated (portfolio PR 27, screenshots tower-overview + arrival)
- 2026-08-16 15:45 Croc Snap plugin (engine ported, 37 tests): upright croc face with 12 tooth boxes, SNAP! label, ring-of-teeth UI, catalog rows in 19 languages + tips EN/DE/ES; game room south corner live (Table 9)
- 2026-08-16 15:20 Chess plugin (engine ported with 47 tests + 2 budget tests): iterative-deepening bot with a 350 ms budget, 12 generated piece sprites, 32-piece sliding pool with castling + en passant + promotion handling, check/result status, chess rows in the how-to-play catalog (19 languages) and lounge tips EN/DE/ES; game room Chess corner live (Table 8)
- 2026-08-16 14:45 tower + floors + elevator: scene 3x3 parcels (lounge centred, garden ring, path), models/tower.glb (diagrid ribs, two annular slabs, railings, glowing rims, crown, `_collider` meshes) + models/canopy.glb from tools/gen-models.py, columns, elevator pads + floor panel + rideTo, FLOORS/ZONES per floor (game room corners for Chess / Backgammon / Croc Snap / Ludo as "coming soon"), rooftop terrace, y-aware table proximity + seat snap, spheres replaced (triangles 79k -> 50k), .dclignore trimmed, build:prod script, DEPLOY.md size note
- 2026-08-16 14:25 phone controller bar: on phones the seated controller is a wide bottom bar (info | game controls | actions) with finger-sized boards (8x8 at 56 units, Dot Lines pitch 60, TTT 96, Pairs 74, Connect Four strip 70x76); TableGame.Controls now takes `phone` + `fullBoard` (was `compact`), `hasStrip` marks games with a "Show board" toggle (Connect Four); spectator mini board desktop-only; help panel 1000 wide on phones; bot-strength control stacked in the phone column; Dot Lines undrawn-edge hints visible; `DEBUG_MOBILE_UI` flag + tools/dev/shot.sh fix
- 2026-08-16 10:35 scaffold, engine port, sync model, first playable build
- 2026-08-16 11:05 textures, UI sprites, bar tables, robot token, seat camera
- 2026-08-16 11:20 card layout fix, SDK pins, mobile QR script
- 2026-08-16 11:24 sprite-plane discs (triangles 44k -> 12k)
- 2026-08-16 11:28 sound effects
- 2026-08-16 11:33 DEPLOY.md, SUBMISSION.md
- 2026-08-16 11:35 this file created; Arsalan confirmed the phone build works
- 2026-08-16 11:40 spectator mini board, opponent-left toast, idle auto-stand (150 s), bot difficulty Easy/Medium/Hard
- 2026-08-16 11:45 repo pushed to github.com/ArsalanRC/arena-lounge; CI switched to pnpm (test + build)
- 2026-08-16 16:55 session handoff: tools/dev harness committed (mcp.sh, shot.sh, ghrc, coords.mjs, README), continuation prompt in section 0, next-up list in 4b
- 2026-08-16 16:40 texture trim (four PNGs fewer; solid rects and runtime tints)
- 2026-08-16 16:25 Checkers plugin (engine ported, 37 tests): tap piece then target, forced jumps + chains from the engine, 24-piece pool sliding with tweens, kings via crown sprites; createView3D now receives getState for multi-step 3D input. All six games live (Tables 1-7).
- 2026-08-16 15:55 Match Pairs plugin (engine ported, 43 tests): 4x4 memory with shape+colour symbols, delayed flip-back via the new TableGame.pending hook, memory bot; purple corner (Table 4). Bot difficulty moved to games/botSettings.ts
- 2026-08-16 15:25 Tic Tac Toe plugin (engine ported, 32 tests): 3x3 upright board with X/O sprite boxes, 3x3 touch grid; coral corner (Table 5)
- 2026-08-16 15:05 plaza layout live: six corners (ZONES in config, tables derived), tinted rugs, banner poles ("coming soon" for unbuilt games), plaza tree, benches, gateway with lanterns, kiosk; Reversi discs and Dot Lines fills as single thin boxes (entities 568 -> 479)
- 2026-08-16 14:30 UI cleanup: separate Hint and Toast, Panel/Row/Segmented atoms, consistent card + controller, How-to-play with one tab per hosted game and the language grid behind a toggle
- 2026-08-16 14:05 ARSALAN: repo made PRIVATE until submission ("code not usable by everyone yet"), the rest is fine. Pages moved into the portfolio repo (same URL), profile card points at the page. Decisions taken (Claude, at his request): six game corners around one plaza (no elevator for the buildathon); games = Connect Four, Dot Lines, Reversi + Tic Tac Toe, Match Pairs, Checkers. Work order: UI/popup cleanup + per-game how-to-play tabs, presentable plaza, then the three games.
- 2026-08-16 13:35 ARSALAN: "don't publish on GitHub yet, wait" -> publishing HOLD (lifted 14:05 for the profile/portfolio; the code repo stays private). No pushes/PRs until he says so. Open question to him: make the (already public) repo private now, or leave as is. Profile README card is merged/live; portfolio card edited locally in the scratchpad clone, uncommitted; missing plinth-market.de.jpg found and prepared there too.
- 2026-08-16 13:20 bilingual GitHub Pages landing page (docs/index.html, EN/DE, animated frame), Pages enabled from main:/docs
- 2026-08-16 13:00 one hit-area collider per board (was one per cell); entity count 590 -> 525 with four tables (textures 19 of 23, the next soft cap to watch)
- 2026-08-16 12:40 Reversi plugin (engine ported, 31 tests): tap-a-square UI with legal hints, felt board, front+back disc sprites; per-game seat colours; four tables in an arc (Dot Lines, Connect Four x2, Reversi)
- 2026-08-16 12:20 How-to-play panel with language picker (19 languages: rule overviews reused from game-platform, lounge sentences EN/DE/ES natively, others fall back to EN); info kiosk at spawn; ar/fa/ur/te left out until the client font shapes them
- 2026-08-16 12:05 seat camera fixed for rotated tables (aim at floor height; client measures from the feet)
- 2026-08-16 11:55 Dot Lines plugin (engine ported with 26 tests): two-tap connect-the-dots input, mirrored UI for the far seat, upright double-sided board on Table 3
- 2026-08-16 11:50 tables made game-agnostic: TableBoard carries gameId + engine state JSON; games plug in via src/lounge/games/types.ts (rules, bot, 3D view, controls); Connect Four is the first plugin (behaviour unchanged)

## 9b. Layout and game list (decided 16 Aug, 14:05)

Six game corners around a round plaza on the existing 2x2 parcels. Spawn
south, plaza (kiosk + welcome sign) in the middle, corners in a ring:
each corner has its own rug colour, a banner pole with the game name and
planters as soft dividers; tables face the plaza. Games for the buildathon:
Connect Four (2 tables), Dot Lines, Reversi, Tic Tac Toe, Match Pairs,
Checkers (1 table each). Later: Chess, Backgammon, Ludo, Croc Snap on the
house floors. Entity budget: collapse Reversi / Dot Lines double planes into
single thin alpha-tested boxes first.

## 10. The house: draft plan (superseded 16 Aug 14:45: the tower with game room + rooftop is built, see State; kept for the leaderboard/tournament ideas)

Goal (Arsalan, 16 Aug): a building where each floor is a game (or several),
an elevator between floors, many games over time, instructions in many
languages, later leaderboards and tournaments.

Constraints that shape it: judges play on phones (walking and stairs cost
patience; the T&C prefer simple + polished), the 4-parcel scene has an
800-entity soft cap (we are at 590 with 4 tables), and every extra floor
means more geometry the phone has to load.

Proposal: **Arena Lounge House, three floors, elevator = teleport.**

- **Ground floor "Lounge"** = what exists today, unchanged: walk in, sit,
  play in ten seconds. Four tables (Connect Four x2, Dot Lines, Reversi),
  info kiosk, welcome sign. Judges never *need* to leave this floor.
- **Elevator** near the spawn: a small cabin; stepping in shows a floor
  panel in the UI (Lounge / Floor 2 / Rooftop) and tapping a floor calls
  `movePlayerTo` onto that floor's landing (no stairs, no waiting). Also
  reachable from the "?" panel as a "Where to?" row.
- **Floor 2 "Game room"** at y = 6 m: four more tables with the next games
  (candidates from Game Arena engines that suit touch: Checkers, Match Pairs,
  Tic Tac Toe as a 30-second warm-up, Backgammon later). Same table code,
  just a different `y` and floor id in TABLES.
- **Rooftop "Terrace"** at y = 12 m: leaderboard wall + tournament board
  (needs the Multiplayer Server for persistence, see roadmap 6), lounge
  seating, view over the World.
- Structure = simple concrete/wood slabs on columns with a railing, built
  from primitives like everything else; each floor is a 24 x 24 m slab
  inside the 32 x 32 parcel footprint, leaving the ground floor's outer ring
  open so the lounge still reads as a lounge from outside.

Budgets: each table costs 100 to 150 entities today; with the collider
collapse (one collider per board instead of one per cell) that drops to
about 60 to 90, so eight tables + structure fits under 800. Triangles are
not the problem (37% used).

Order of work once approved: (1) collider collapse + entity audit,
(2) elevator + floor slabs with the ground floor untouched, (3) Floor 2
games one at a time, (4) rooftop after the leaderboard decision.

Open questions for Arsalan: keep the name "Arena Lounge"? Which four games
on Floor 2? Prizes for tournaments need a look at the DCL rules first.
