import { describe, it, expect } from 'vitest';
import { logger, middlewareLogger, apiLogger, serviceLogger, safeFetchLogger } from '../logger';

describe('logger (TypeScript singleton)', () => {
  it('is silent in test environment (NODE_ENV=test)', () => {
    expect(logger.level).toBe('silent');
  });

  it('exports a pino logger with a level property', () => {
    expect(typeof logger.level).toBe('string');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('middlewareLogger binds module=middleware', () => {
    expect(middlewareLogger.bindings().module).toBe('middleware');
  });

  it('apiLogger binds module=api', () => {
    expect(apiLogger.bindings().module).toBe('api');
  });

  it('serviceLogger binds module=service', () => {
    expect(serviceLogger.bindings().module).toBe('service');
  });

  it('safeFetchLogger binds module=safeFetch', () => {
    expect(safeFetchLogger.bindings().module).toBe('safeFetch');
  });

  it('child() inherits parent level', () => {
    const child = logger.child({ service: 'test' });
    expect(child.level).toBe(logger.level);
  });

  it('child() carries bound fields', () => {
    const child = logger.child({ journalId: 'epijinfo' });
    expect(child.bindings().journalId).toBe('epijinfo');
  });
});
