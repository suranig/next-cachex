import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
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
    },
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
  },
}); 