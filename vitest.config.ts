import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'server-only' throws in browser bundles; in Vitest (Node.js) it's a no-op
      'server-only': path.resolve(__dirname, './src/test-utils/server-only-mock.ts'),
    },
  },
  test: {
    // Force NODE_ENV=test regardless of the shell environment.
    // Without this, a developer running tests while NODE_ENV=development is set
    // in their shell (e.g. after starting the dev server) would get pino loggers
    // initialised at 'debug' level instead of 'silent', breaking logger tests.
    env: { NODE_ENV: 'test' },

    // Use happy-dom environment for DOM testing
    environment: 'happy-dom',

    // Global test setup
    globals: true,

    // Setup file for @testing-library/jest-dom matchers
    setupFiles: ['./vitest.setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'external-assets/**',
        'scripts/**',
        '**/*.config.{js,ts}',
        '**/__tests__/**',
        '**/types/**',
      ],
      // Coverage thresholds - temporarily disabled
      // TODO: Re-enable and increase progressively as test coverage improves
      // thresholds: {
      //   branches: 70,
      //   functions: 70,
      //   lines: 80,
      //   statements: 80,
      // },
    },

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'external-assets', '.next', 'coverage'],

    // Force vitest to use the compiled dist output (not source .tsx) for these packages
    server: {
      deps: {
        inline: ['react-loader-spinner'],
      },
    },
  },
});
