import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for src/lib/valkey-client.js
 *
 * We inject a mock Redis constructor via _internals.setRedisFactory() to avoid
 * CJS require() mocking limitations in Vitest (vi.mock cannot intercept require()
 * calls from within CJS modules loaded via await import()).
 */

// Import the CJS module
const valkeyModule = await import('../valkey-client.js') as any;
const { parseSentinels, getValkeyClient, resetValkeyClient, _internals } = valkeyModule;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseSentinels()', () => {
  it('returns empty array for undefined input', () => {
    expect(parseSentinels(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseSentinels('')).toEqual([]);
  });

  it('parses a single host:port', () => {
    expect(parseSentinels('sentinel-1:26379')).toEqual([{ host: 'sentinel-1', port: 26379 }]);
  });

  it('parses multiple hosts', () => {
    const result = parseSentinels('sentinel-1:26379,sentinel-2:26379,sentinel-3:26379');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ host: 'sentinel-1', port: 26379 });
    expect(result[2]).toEqual({ host: 'sentinel-3', port: 26379 });
  });

  it('uses default port 26379 when port is missing', () => {
    expect(parseSentinels('my-sentinel')).toEqual([{ host: 'my-sentinel', port: 26379 }]);
  });

  it('handles extra spaces and trailing commas', () => {
    const result = parseSentinels(' sentinel-1:26379 , sentinel-2:26379 , ');
    expect(result).toHaveLength(2);
    expect(result[0].host).toBe('sentinel-1');
    expect(result[1].host).toBe('sentinel-2');
  });

  it('handles IP addresses', () => {
    const result = parseSentinels('10.0.0.1:26379');
    expect(result[0]).toEqual({ host: '10.0.0.1', port: 26379 });
  });

  it('uses custom port values', () => {
    const result = parseSentinels('myhost:12345');
    expect(result[0].port).toBe(12345);
  });
});

describe('getValkeyClient()', () => {
  // Shared mock constructor
  let MockRedisCtor: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetValkeyClient();
    mockDisconnect = vi.fn();
    mockOn = vi.fn().mockReturnThis();
    MockRedisCtor = vi.fn(function () { return { on: mockOn, disconnect: mockDisconnect }; });
    _internals.setRedisFactory(MockRedisCtor);
  });

  afterEach(() => {
    _internals.clearRedisFactory();
    resetValkeyClient();
    vi.unstubAllEnvs();
  });

  it('returns null when VALKEY_SENTINEL_HOSTS is not set', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', '');
    const client = getValkeyClient();
    expect(client).toBeNull();
    expect(MockRedisCtor).not.toHaveBeenCalled();
  });

  it('creates a Redis client when sentinels are configured', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379,sentinel-2:26379');
    vi.stubEnv('VALKEY_MASTER_NAME', 'mymaster');
    vi.stubEnv('VALKEY_KEY_PREFIX', 'next:');

    const client = getValkeyClient();
    expect(client).not.toBeNull();
    expect(MockRedisCtor).toHaveBeenCalledOnce();

    // Verify constructor options
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.sentinels).toHaveLength(2);
    expect(callArgs.sentinels[0]).toEqual({ host: 'sentinel-1', port: 26379 });
    expect(callArgs.name).toBe('mymaster');
    expect(callArgs.keyPrefix).toBe('next:');
    expect(callArgs.lazyConnect).toBe(true);
    expect(callArgs.enableOfflineQueue).toBe(false);
  });

  it('returns the same singleton on repeated calls', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    const c1 = getValkeyClient();
    const c2 = getValkeyClient();
    expect(c1).toBe(c2);
    expect(MockRedisCtor).toHaveBeenCalledOnce();
  });

  it('registers event handlers on the client', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    getValkeyClient();

    const registeredEvents = mockOn.mock.calls.map(([event]: [string]) => event);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('ready');
    expect(registeredEvents).toContain('error');
    expect(registeredEvents).toContain('reconnecting');
    expect(registeredEvents).toContain('close');
  });

  it('passes password when VALKEY_PASSWORD is set', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    vi.stubEnv('VALKEY_PASSWORD', 'supersecret');

    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.password).toBe('supersecret');
  });

  it('passes undefined password when VALKEY_PASSWORD is empty', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    vi.stubEnv('VALKEY_PASSWORD', '');

    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.password).toBeUndefined();
  });

  it('passes sentinelPassword from env', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    vi.stubEnv('VALKEY_SENTINEL_PASSWORD', 'sentinelpw');

    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.sentinelPassword).toBe('sentinelpw');
  });

  it('maxRetriesPerRequest is 2', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.maxRetriesPerRequest).toBe(2);
  });

  it('uses default key prefix "next:" when VALKEY_KEY_PREFIX is not set', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.keyPrefix).toBe('next:');
  });

  it('uses default master name "mymaster" when VALKEY_MASTER_NAME is not set', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');
    getValkeyClient();
    const callArgs = MockRedisCtor.mock.calls[0][0];
    expect(callArgs.name).toBe('mymaster');
  });
});

describe('resetValkeyClient()', () => {
  let MockRedisCtor: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetValkeyClient();
    mockDisconnect = vi.fn();
    mockOn = vi.fn().mockReturnThis();
    MockRedisCtor = vi.fn(function () { return { on: mockOn, disconnect: mockDisconnect }; });
    _internals.setRedisFactory(MockRedisCtor);
  });

  afterEach(() => {
    _internals.clearRedisFactory();
    resetValkeyClient();
    vi.unstubAllEnvs();
  });

  it('resets the singleton so a new client is created on next call', () => {
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', 'sentinel-1:26379');

    const c1 = getValkeyClient();
    expect(c1).not.toBeNull();

    resetValkeyClient();
    expect(mockDisconnect).toHaveBeenCalledOnce();

    const c2 = getValkeyClient();
    expect(c2).not.toBeNull();
    expect(MockRedisCtor).toHaveBeenCalledTimes(2);
  });

  it('handles reset when client was never created (no-op)', () => {
    // No stubEnv set → returns null, no disconnect needed
    vi.stubEnv('VALKEY_SENTINEL_HOSTS', '');
    getValkeyClient(); // returns null, _client stays null
    expect(() => resetValkeyClient()).not.toThrow();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });
});
