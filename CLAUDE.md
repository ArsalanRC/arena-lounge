# CLAUDE.md — Arena Lounge (Decentraland SDK7 scene)

Mobile-first social game lounge for the Decentraland Friendzone Mobile
Buildathon 2026. Players walk up to a table, take a seat and play Connect Four
against a friend or the house bot. Everything is CRDT-synced, no server.

## Commands (pnpm, hoisted node_modules — see pnpm-workspace.yaml)
- `pnpm install`  — deps
- `pnpm start`    — desktop preview (`pnpm start --mobile` prints a QR for the phone, `--mcp` enables the explorer MCP server)
- `pnpm build`    — bundle + strict type-check (this is what CI runs)
- `pnpm test`     — vitest over the pure engines only
- `pnpm deploy -- --target-content https://worlds-content-server.decentraland.org` — publish to the World in scene.json

## Layout
- `src/engine/`          pure TS game engines + tests (no SDK imports allowed)
- `src/lounge/config.ts` layout, tunables, palette
- `src/lounge/state.ts`  synced components (TableBoard, TableSeatA, TableSeatB)
- `src/lounge/games/`    TableGame contract (types.ts), registry, one plugin per game (rules bridge + controls UI)
- `src/lounge/views/`    per-game 3D views + shared primitive builders
- `src/lounge/tables.ts` seat / turn / bot / janitor logic and systems (write discipline lives here)
- `src/lounge/table3d.ts` generic 3D table (top, pads, robot, sign, sfx) hosting the game view
- `src/lounge/lounge3d.ts` floor, walls, decor
- `src/lounge/ui.tsx`    React-ECS UI (banner, table card, seated controller)
- `tools/gen-textures.py` regenerates images/*.png procedurally
- `assets/scene/main.composite` Creator Hub layer (static decor only; gameplay entities are code)

## Rules
- Decentraland SDK skills live in `.claude/skills` (restore with `npx skills add decentraland/sdk-skills`); follow them for SDK APIs.
- Never call `syncEntity` / `engine.addSystem` at module top level; everything boots from `main()`.
- Keep `src/engine/**` free of `@dcl/*` imports.
- Mobile first: touch targets >= 48px, no `borderRadius`, no dynamic lights / particles, test with `pnpm start --mobile`.
- No AI attribution in commits or PRs.
