'use strict';

/**
 * Valkey (ioredis) Singleton Client with Sentinel HA
 *
 * Features:
 * - Connects to Valkey cluster via Sentinel for high availability
 * - lazyConnect: true — does NOT crash at startup if Valkey is absent
 * - enableOfflineQueue: false — rejects immediately when disconnected
 * - Configurable via environment variables
 *
 * Usage:
 *   const { getValkeyClient, parseSentinels } = require('./valkey-client');
 *   const client = getValkeyClient();
 *
 * Note: require('ioredis') is intentionally called inside getValkeyClient()
 * (not at module top-level) to allow Vitest to intercept it via vi.mock().
 */

let _client = null;

// Test-only override: inject a custom Redis constructor.
// Avoids CJS require() mocking limitations in Vitest (vi.mock cannot intercept
// require() calls inside CJS modules loaded via await import()).
let _redisFactoryOverride = null;

/**
 * Parse sentinel hosts from a comma-separated string.
 * @param {string|undefined} hostsStr - e.g. "host1:26379,host2:26379,host3:26379"
 * @returns {{ host: string, port: number }[]}
 */
function parseSentinels(hostsStr) {
  if (!hostsStr) return [];
  return hostsStr
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const lastColon = entry.lastIndexOf(':');
      if (lastColon === -1) {
        return { host: entry, port: 26379 };
      }
      const host = entry.slice(0, lastColon);
      const port = parseInt(entry.slice(lastColon + 1), 10) || 26379;
      return { host, port };
    });
}

/**
 * Get or create the Valkey singleton client.
 * Returns null if Sentinel hosts are not configured (no Valkey available).
 * @returns {Redis|null}
 */
function getValkeyClient() {
  if (_client !== null) return _client;

  const sentinelHosts = parseSentinels(process.env.VALKEY_SENTINEL_HOSTS);

  if (sentinelHosts.length === 0) {
    // No Sentinel configured — Valkey disabled, caller should use in-memory fallback
    return null;
  }

  // Use injected factory (for tests) or load ioredis lazily.
  // ioredis v5 exports the Redis class as the default CJS export AND as a named .Redis property.
  let Redis;
  if (_redisFactoryOverride !== null) {
    Redis = _redisFactoryOverride;
  } else {
    const _ioredis = require('ioredis');
    Redis = typeof _ioredis === 'function' ? _ioredis : (_ioredis.Redis || _ioredis.default);
  }

  const username = process.env.VALKEY_USERNAME || undefined;
  const password = process.env.VALKEY_PASSWORD || undefined;
  const sentinelUsername = process.env.VALKEY_SENTINEL_USERNAME || undefined;
  const sentinelPassword = process.env.VALKEY_SENTINEL_PASSWORD || undefined;

  _client = new Redis({
    sentinels: sentinelHosts,
    name: process.env.VALKEY_MASTER_NAME || 'mymaster',
    username,
    password,
    sentinelUsername,
    sentinelPassword,
    keyPrefix: process.env.VALKEY_KEY_PREFIX || 'next:',
    lazyConnect: true,
    enableOfflineQueue: false, // Reject immediately when disconnected (circuit breaker friendly)
    maxRetriesPerRequest: 2,
    connectTimeout: 3000,
    commandTimeout: 2000,
    // Sentinel-specific options
    sentinelCommandTimeout: 3000,
    sentinelRetryStrategy(retries) {
      // Exponential backoff capped at 30s
      return Math.min(retries * 500, 30000);
    },
    retryStrategy(retries) {
      // Exponential backoff capped at 10s for node connections
      return Math.min(retries * 200, 10000);
    },
    // Prevent unhandled promise rejection on connection errors
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some(e => err.message.includes(e));
    },
  });

  _client.on('connect', () => {
    console.log('[Valkey] Connected to master');
  });

  _client.on('ready', () => {
    console.log('[Valkey] Client ready');
  });

  _client.on('error', err => {
    // Log but do NOT crash — cache-handler circuit breaker manages fallback
    console.error('[Valkey] Connection error:', err.message);
  });

  _client.on('reconnecting', delay => {
    console.log(`[Valkey] Reconnecting in ${delay}ms...`);
  });

  _client.on('close', () => {
    console.warn('[Valkey] Connection closed');
  });

  _client.on('+sentinel', sentinel => {
    console.log(`[Valkey] Sentinel discovered: ${sentinel.host}:${sentinel.port}`);
  });

  _client.on('+switch-master', (name, oldMaster, newMaster) => {
    console.log(
      `[Valkey] Master switched: ${name} from ${oldMaster.host}:${oldMaster.port} to ${newMaster.host}:${newMaster.port}`
    );
  });

  return _client;
}

/**
 * Reset the singleton (useful for testing).
 */
function resetValkeyClient() {
  if (_client) {
    _client.disconnect();
    _client = null;
  }
}

module.exports = {
  getValkeyClient,
  parseSentinels,
  resetValkeyClient,
  // Test hooks
  _internals: {
    setRedisFactory: factory => {
      _redisFactoryOverride = factory;
    },
    clearRedisFactory: () => {
      _redisFactoryOverride = null;
    },
  },
};
