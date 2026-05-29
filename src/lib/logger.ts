import 'server-only';
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')),
  base: isDev ? undefined : { env: process.env.NODE_ENV },
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
