import { describe, it, expect, afterEach } from 'vitest';

const loggerCjsModule = (await import('../logger.cjs')) as any;
const { getLogger, getChildLogger, _resetLogger } = loggerCjsModule;

describe('logger.cjs (CommonJS singleton)', () => {
  afterEach(() => {
    _resetLogger();
  });

  it('returns a pino logger instance', () => {
    const log = getLogger();
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.child).toBe('function');
  });

  it('is silent in test environment (NODE_ENV=test)', () => {
    const log = getLogger();
    expect(log.level).toBe('silent');
  });

  it('is a singleton — returns the same instance on repeated calls', () => {
    const a = getLogger();
    const b = getLogger();
    expect(a).toBe(b);
  });

  it('_resetLogger() clears the singleton', () => {
    const first = getLogger();
    _resetLogger();
    const second = getLogger();
    expect(first).not.toBe(second);
  });

  it('getChildLogger() returns a child with module binding', () => {
    const child = getChildLogger('valkey');
    expect(child.bindings().module).toBe('valkey');
  });

  it('getChildLogger() with levelOverride sets child level', () => {
    const child = getChildLogger('cache-handler', 'debug');
    expect(child.level).toBe('debug');
  });

  it('getChildLogger() without levelOverride inherits parent level', () => {
    const child = getChildLogger('test-module');
    expect(child.level).toBe(getLogger().level);
  });
});
