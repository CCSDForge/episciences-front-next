import axe, { AxeResults, RunOptions, Spec } from 'axe-core';

let axeOptions: RunOptions = {};

/**
 * Configure axe-core with custom options
 */
export function configureAxe(options: RunOptions): void {
  axeOptions = options;
}

/**
 * Run axe accessibility checks on a container element
 */
export async function checkA11y(
  container: Element | Document,
  options?: RunOptions
): Promise<AxeResults> {
  // Deep merge options, especially for rules object
  const mergedOptions: RunOptions = {
    ...axeOptions,
    ...options,
    rules: {
      ...(axeOptions.rules || {}),
      ...(options?.rules || {}),
    },
  };
  return axe.run(container as Element, mergedOptions);
}

/**
 * Custom matcher for Vitest to check accessibility violations
 */
export const toHaveNoViolations = {
  toHaveNoViolations(received: AxeResults) {
    const violations = received.violations;

    if (violations.length === 0) {
      return {
        pass: true,
        message: () => 'Expected accessibility violations but found none',
      };
    }

    const formattedViolations = violations
      .map((violation) => {
        const nodes = violation.nodes
          .map((node) => `  - ${node.html}\n    ${node.failureSummary}`)
          .join('\n');
        return `\n${violation.help} (${violation.id})\nImpact: ${violation.impact}\nNodes:\n${nodes}`;
      })
      .join('\n');

    return {
      pass: false,
      message: () =>
        `Expected no accessibility violations but found ${violations.length}:\n${formattedViolations}`,
    };
  },
};

// Type augmentation for Vitest
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
