import { defineConfig } from 'vitest/config'

// Only the pure game engines are unit-tested here. Scene code depends on the
// Decentraland runtime and is verified in the explorer preview instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/engine/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**', '**/bin/**']
  }
})
