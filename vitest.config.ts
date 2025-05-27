import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['**/test/**', '**/examples/**', '**/node_modules/**'],
    },
  },
}); 