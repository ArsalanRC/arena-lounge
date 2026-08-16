# Dev harness

Everything here drives the running desktop Explorer through its MCP server,
so a scene can be tested without a human at the keyboard.

1. `pnpm start:mcp` (desktop preview, MCP at http://127.0.0.1:8123/unity-explorer-mcp);
   `pnpm start:mobile` in a second terminal prints the phone QR (port 8001).
2. `tools/dev/mcp.sh tools/list` lists tools; `tools/dev/mcp.sh tools/call '{"name":"move_to","arguments":{...}}'` calls one.
   Useful tools: move_to, look_at, set_camera_mode, click_entity (x/y/z world point),
   get_scene_logs, get_scene_content_stats, get_performance_stats, get_player_state.
3. `tools/dev/shot.sh out.jpg [width]` saves a screenshot of the Explorer.
4. `node tools/dev/coords.mjs <zoneX> <zoneZ> [c4|dots|reversi|ttt|pairs|checkers]`
   prints where to stand, the robot token and a few cell centres for a table.
   Zones are in `src/lounge/config.ts` (ZONES). Click the robot token to sit
   with the bot, then click cells. Use first-person camera before clicking
   small targets (`set_camera_mode first_person`), the third-person reticle
   parallax misses them.
5. `tools/dev/ghrc <gh args>` runs `gh` as ArsalanRC (loads the game-platform
   direnv token first; plain `gh` picks the wrong account).
6. Phone layout on the desktop: set `DEBUG_MOBILE_UI = true` in
   `src/lounge/config.ts` (never commit it). The UI then uses the phone's
   1600x720 virtual canvas, pinned to a tinted 720-unit strip at the bottom of
   the window, with the phone controller (bottom bar) and card. Sit at a table
   through the robot token and screenshot as usual.

Session state files default to `/tmp/arena-dev` (override with `DEV_TMP`).
