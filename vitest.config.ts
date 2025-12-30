import { defineConfig } from 'vitest/config'
import path from 'path'

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
    exclude: [
      'node_modules',
      'dist',
      'external-assets',
      '.next',
      'coverage',
    ],
  },
})
