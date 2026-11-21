import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests do not load the Start/Nitro plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
