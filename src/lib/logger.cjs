'use strict';

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development';

let _logger = null;

function getLogger() {
  if (_logger) return _logger;
  const pino = require('pino');
  _logger = pino({
    level: isTest ? 'silent' : (process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')),
    base: isDev ? undefined : { env: process.env.NODE_ENV },
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : undefined,
  });
  return _logger;
}

function getChildLogger(module, levelOverride) {
  const child = getLogger().child({ module });
  if (levelOverride) child.level = levelOverride;
  return child;
}

// test-only: reset singleton (mirrors _internals pattern in valkey-client.js)
function _resetLogger() {
  _logger = null;
}

module.exports = { getLogger, getChildLogger, _resetLogger };
