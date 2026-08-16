# ARENA-LOUNGE-SPEC.md — continuation file

Single source of truth for the Arena Lounge project. Updated after every
meaningful change (new commit, decision, test result). If a chat is closed,
start the next one with: "read ~/PR-PROJECT/arena-lounge/ARENA-LOUNGE-SPEC.md
and continue". Keep this file honest: only verified facts under "State".

Last update: 2026-08-16 11:40 (Europe/Berlin)

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
- Repo path: `~/PR-PROJECT/arena-lounge` (git, branch main). **Not pushed yet.** Target: public repo under **ArsalanRC** (default; org fgamesforfun-star is the alternative, decision pending)
- World name placeholder in scene.json: `arenalounge.dcl.eth` (NAME not bought yet, see docs/DEPLOY.md)
- Decentraland account: logged into Creator Hub + desktop Explorer as ArsalanRC (address 0x3451...5e9f seen in preview)
- Related repo: game-platform (`~/PR-PROJECT/game-platform`, org fgamesforfun-star): 28 pure-TS game engines with tests, 23 locales of UI + instructions. Connect Four engine copied from there verbatim.
- Public identity to show in README/app: GitHub https://github.com/ArsalanRC, LinkedIn https://www.linkedin.com/in/muhammad-arsalan-khadim-b87550259/, portfolio https://arsalanrc.github.io. Never publish the email. Git author = GitHub noreply address.

## 4. State (verified, 16 Aug 2026)

Done and tested in the desktop Explorer through the explorer MCP harness, plus
one manual test by Arsalan on desktop and one on the phone ("the mobile
version works as well", 16 Aug 11:30):

- 2x2 parcel World scene, spawn south, three bar-height tables in an arc,
  parquet floor, wooden boundary wall, planters, lamps, welcome sign.
- Connect Four per table: see-through frame (alpha-tested planes), 42 pooled
  sprite-plane discs with drop tween + bounce, win glow, seat pads, robot
  token (tap = play the house bot), floating sign with live status.
- Networking: serverless CRDT (`syncEntity`), one entity per table with
  `C4Board` + `C4SeatA` + `C4SeatB` (fixed sync ids 100..102). Write
  discipline documented in src/lounge/tables.ts. Seat heartbeats (5 s),
  stale seat cleanup (30 s), onLeaveScene cleanup, orphan-bot cleanup,
  60 s turn timer applied by seated players, auto-stand at 7 m for 8 s.
- House bot: minimax alpha-beta (medium), driven by the seated human's client.
- UI (React-ECS, virtual 1920x1080): top banner + toasts, table card near a
  table (Sit as Yellow / Sit as Red / Play the house bot / Not now), seated
  controller (desktop: right-docked with mini board; mobile: bottom strip with
  seven drop buttons + "Show board" toggle), Stand up / Play again / Dismiss bot.
- First-person camera only on the local player's own seat pad; sitting snaps
  the avatar to the pad facing the board (yaw re-issued after the switch).
- Sounds: synthesised WAVs (drop, win chime, your-move ding, sit click, lose).
- Perf: 269 entities, ~12k triangles (30% of the 4-parcel cap), 60 fps desktop.
- Tests: 30 vitest tests on the pure engine. `pnpm build` strict type-check green.
- Docs: README.md, docs/DEPLOY.md, docs/SUBMISSION.md (draft), CLAUDE.md.

Not done: push to GitHub, buy NAME, deploy, DoraHacks form, GitHub Pages
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
- 16 Aug: tables at bar height + first person while seated, because
  `movePlayerTo` cameraTarget pitch is unreliable in first person; level view
  sees the board centred.
- 16 Aug: discs are sprite planes, not cylinders (triangle budget).
- 16 Aug (Arsalan): after mechanics are clean, build a "house": floors with
  games, an elevator; many games; instructions in many languages; leaderboards
  and tournaments (maybe prizes) later. See roadmap.

## 6. Roadmap (ordered)

1. Mechanics polish: spectator mini board for bystanders, opponent-left toast,
   AFK auto-stand at bot tables, bot difficulty choice, phone layout tuning
   from real screenshots.
2. Ship path: push repo, buy NAME, first deploy, verify on phone from the real
   World, README screenshots. Then keep deploying often; last safe deploy before
   4 Sept.
3. Content: second game type (Dot Lines or Reversi from game-platform engines),
   generic "table game" plugin interface so tables can host any 2-player engine.
4. Instructions board with language picker; reuse game-platform's 23-locale
   instruction texts (messages/*.json).
5. The house: compact multi-floor building, elevator = floor-selector UI that
   teleports (movePlayerTo), each floor a game area; rooftop = leaderboard /
   tournament board. Keep total content within mobile budgets.
6. Retention: persistent leaderboard + streaks (Multiplayer Server + Storage),
   tournaments, maybe prizes (check T&C / DCL policies first).
7. Ritual: GitHub Pages landing page (bilingual EN+DE), profile README and
   portfolio entry.

## 7. How to run / test / deploy

```
cd ~/PR-PROJECT/arena-lounge
pnpm install
pnpm start:mcp      # desktop preview + explorer MCP at http://127.0.0.1:8123/unity-explorer-mcp
pnpm start:mobile   # QR for the phone (same Wi-Fi), port 8001
pnpm test           # engine tests
pnpm build          # bundle + strict type-check
```
Deploy: docs/DEPLOY.md. Submission text: docs/SUBMISSION.md.

## 8. Gotchas (verified)

- React-ECS: text with `height: 'auto'` ignores textAlign; nested auto-height
  wrappers eat panel padding. Give explicit heights.
- `movePlayerTo` after a first-person switch: re-issue avatarTarget once
  (~450 ms later); do not rely on cameraTarget pitch.
- Explorer MCP has no UI-tap tool; anything that must be testable headlessly
  needs a 3D affordance (that is why the robot token exists).
- `sdk-commands start` rewrites package.json trailing newline; harmless.
- Creator Hub autosaves `assets/scene/main.composite`; do not edit it while
  the scene is open there. Gameplay entities are code, composite is decor only.

## 9. Changelog

- 2026-08-16 10:35 scaffold, engine port, sync model, first playable build
- 2026-08-16 11:05 textures, UI sprites, bar tables, robot token, seat camera
- 2026-08-16 11:20 card layout fix, SDK pins, mobile QR script
- 2026-08-16 11:24 sprite-plane discs (triangles 44k -> 12k)
- 2026-08-16 11:28 sound effects
- 2026-08-16 11:33 DEPLOY.md, SUBMISSION.md
- 2026-08-16 11:35 this file created; Arsalan confirmed the phone build works
- 2026-08-16 11:40 spectator mini board, opponent-left toast, idle auto-stand (150 s), bot difficulty Easy/Medium/Hard
