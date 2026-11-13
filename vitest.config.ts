import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
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
      // Coverage thresholds: set ~2 points below the current baseline to catch
      // regressions. Raise them progressively as coverage improves.
      thresholds: {
        lines: 89,
        statements: 87,
        functions: 81,
        branches: 81,
      },
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
