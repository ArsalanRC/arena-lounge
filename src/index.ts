/**
 * Arena Lounge — a mobile-first social game lounge for Decentraland.
 *
 * Boot order matters for the SDK: entities that are network-synced and every
 * engine.addSystem call must happen inside main() (the player profile is not
 * ready before that), so all setup is funnelled through here.
 */
import { engine } from '@dcl/sdk/ecs'
import { buildLounge } from './lounge/lounge3d'
import { buildTableVisual, tableVisualsSystem } from './lounge/table3d'
import { createTables, startTableSystems, tables } from './lounge/tables'
import { setupUi } from './lounge/ui'

export function main(): void {
  buildLounge()
  createTables()
  for (const t of tables) buildTableVisual(t)
  startTableSystems()
  engine.addSystem(tableVisualsSystem)
  setupUi()
}
