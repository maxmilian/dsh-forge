import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.ts'],
    testTimeout: 120_000,
  },
})
