import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'examples/',
        '**/*.d.ts',
        'vitest.config.ts',
        'eslint.config.mjs',
        'tests/README.md',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
