// Browser-safe noop logger — pino requires Node.js (worker_threads, fs).
// Webpack and Turbopack alias @/lib/logger to this file for client bundles.
// Service modules shared between server and client (e.g. article, search) remain
// typechecked against the real pino types; at runtime the browser gets these no-ops.
const noop = () => {};

const noopLogger = {
  level: 'silent' as const,
  silent: noop,
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
  bindings: () => ({}),
  isLevelEnabled: () => false,
};

export const logger = noopLogger;
export const middlewareLogger = noopLogger;
export const apiLogger = noopLogger;
export const serviceLogger = noopLogger;
export const safeFetchLogger = noopLogger;
