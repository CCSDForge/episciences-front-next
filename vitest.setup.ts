import '@testing-library/jest-dom/vitest';
import { configureAxe, toHaveNoViolations } from './src/test-utils/axe-helper';
import { expect } from 'vitest';

// Add axe-core matcher for accessibility testing
expect.extend(toHaveNoViolations);

// Configure axe with default options
configureAxe({
  rules: {
    // Disable color-contrast in happy-dom (doesn't compute styles)
    'color-contrast': { enabled: false },
  },
});
