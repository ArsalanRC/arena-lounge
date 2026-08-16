#!/usr/bin/env node
/**
 * Print world coordinates for driving a table through the explorer MCP
 * (tools/dev/mcp.sh): where to stand, where the robot token is, and cell
 * centres. Mirrors config.ts (PLAZA, ZONES, yawToward) and the view geometry.
 *
 *   node tools/dev/coords.mjs <zoneX> <zoneZ> [game]
 *   game: c4 | dots | reversi | ttt | pairs | checkers  (default c4)
 */
const [zx, zz, game = 'c4'] = process.argv.slice(2).map((v, i) => (i < 2 ? Number(v) : v))
const PLAZA = [16, 17.5]
const yaw = Math.atan2(-(PLAZA[0] - zx), -(PLAZA[1] - zz)) * 180 / Math.PI
const rot = (x, z) => { const t = yaw * Math.PI / 180; return [x * Math.cos(t) + z * Math.sin(t), -x * Math.sin(t) + z * Math.cos(t)] }
const w = (x, y, z) => { const [rx, rz] = rot(x, z); return `${(zx + rx).toFixed(2)},${y.toFixed(2)},${(zz + rz).toFixed(2)}` }
const TOP = 1.02
console.log(`yaw ${yaw.toFixed(1)}  standA ${w(0, 0, -2.6)}  robot ${w(0.72, TOP + 0.11, -0.28)}  padA ${w(0, 0.03, -1.8)}  padB ${w(0, 0.03, 1.8)}`)
if (game === 'c4') for (const c of [0, 3, 6]) console.log(`col${c} ${w(-0.6 + 0.16 * (0.75 + c), TOP + 0.05 + 0.52, 0)}`)
if (game === 'dots') { const P = 1 / 6, CY = TOP + 0.06 + 0.5; for (const [r, c] of [[0, 0], [0, 1], [1, 0]]) console.log(`dot${r}${c} ${w(-0.5 + P * (0.5 + c), CY + 0.5 - P * (0.5 + r), 0)}`) }
if (game === 'reversi') { const C = 1 / 8, CY = TOP + 0.06 + 0.5; for (const [r, c] of [[2, 3], [3, 2], [4, 5], [5, 4]]) console.log(`cell${r}${c} ${w(-0.5 + C * (c + 0.5), CY + 0.5 - C * (r + 0.5), 0)}`) }
if (game === 'ttt') { const C = 0.3, CY = TOP + 0.08 + 0.45; for (const i of [0, 4, 8]) console.log(`cell${i} ${w(-0.45 + C * (i % 3 + 0.5), CY + 0.45 - C * (Math.floor(i / 3) + 0.5), 0)}`) }
if (game === 'pairs') { const C = 0.25, CY = TOP + 0.08 + 0.5; for (const i of [0, 5, 10, 15]) console.log(`card${i} ${w(-0.5 + C * (i % 4 + 0.5), CY + 0.5 - C * (Math.floor(i / 4) + 0.5), 0)}`) }
if (game === 'checkers') { const C = 1 / 8, CY = TOP + 0.06 + 0.5; for (const sq of [17, 21, 26, 28]) console.log(`sq${sq} ${w(-0.5 + C * (sq % 8 + 0.5), CY - 0.5 + C * (Math.floor(sq / 8) + 0.5), 0)}`) }
