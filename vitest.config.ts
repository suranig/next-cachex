import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json', 'html'],
      exclude: [
        '**/test/**', 
        '**/examples/**', 
        '**/node_modules/**',
        '**/coverage/**',
        '**/.eslintrc.cjs',
        '**/vitest.config.ts',
        '**/dist/**'
      ],
      include: ['src/**/*.ts'],
      all: true,
    },
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
    testTimeout: 10000, // 10 seconds timeout for all tests
  },
}); 