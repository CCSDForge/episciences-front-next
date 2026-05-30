import os from 'os';
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
// Also check VITEST — set automatically by vitest regardless of NODE_ENV in the shell.
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

export const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')),
  // Keep pid and hostname so log aggregators can correlate entries across workers/pods.
  // In dev, pino-pretty's ignore option already hides them from terminal output.
  base: isDev ? undefined : { pid: process.pid, hostname: os.hostname(), env: process.env.NODE_ENV },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      }
    : undefined,
});

export const middlewareLogger = logger.child({ module: 'middleware' });
export const apiLogger = logger.child({ module: 'api' });
export const serviceLogger = logger.child({ module: 'service' });
export const safeFetchLogger = logger.child({ module: 'safeFetch' });
