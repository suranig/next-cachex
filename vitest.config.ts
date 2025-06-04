import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/test/**', '**/examples/**', '**/node_modules/**'],
    },
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
  },
}); 