'use strict';

/**
 * Next.js 16 Custom Cache Handler — Valkey (ioredis) with In-Memory Fallback
 *
 * Interface requirements (Next.js CacheHandler):
 *   - get(key): Promise<{ value, lastModified, tags } | null>
 *   - set(key, data, { revalidate, tags }): Promise<void>
 *   - revalidateTag(tag): Promise<void>
 *
 * Key scheme:
 *   {prefix}data:{key}          → JSON stringified cache entry
 *   {prefix}tags:{tag}          → Redis Set of keys associated with a tag
 *   {prefix}tags-all            → Redis Set of all known tags
 *
 * Circuit Breaker States:
 *   CLOSED    → Normal — requests go to Valkey
 *   OPEN      → Valkey down — immediate fallback to in-memory LRU
 *   HALF_OPEN → Probing — testing if Valkey recovered
 *
 * This file MUST be CommonJS (require/module.exports) because Next.js
 * loads the cache handler via require().
 */

const { getValkeyClient } = require('./valkey-client');

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

const CB_THRESHOLD = parseInt(process.env.VALKEY_CIRCUIT_BREAKER_THRESHOLD || '5', 10);
const CB_PROBE_INTERVAL = parseInt(process.env.VALKEY_CIRCUIT_BREAKER_PROBE_INTERVAL || '30', 10) * 1000;

const CB_STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

let cbState = CB_STATE.CLOSED;
let cbErrors = 0;
let cbOpenedAt = 0;

function cbRecordSuccess() {
  cbErrors = 0;
  if (cbState !== CB_STATE.CLOSED) {
    console.log('[CacheHandler] Circuit breaker → CLOSED (Valkey recovered)');
    cbState = CB_STATE.CLOSED;
  }
}

function cbRecordFailure() {
  cbErrors++;
  if (cbState === CB_STATE.CLOSED && cbErrors >= CB_THRESHOLD) {
    cbState = CB_STATE.OPEN;
    cbOpenedAt = Date.now();
    console.warn(`[CacheHandler] Circuit breaker → OPEN (${cbErrors} consecutive errors, fallback to in-memory)`);
  } else if (cbState === CB_STATE.HALF_OPEN) {
    cbState = CB_STATE.OPEN;
    cbOpenedAt = Date.now();
    console.warn('[CacheHandler] Circuit breaker → OPEN (probe failed)');
  }
}

function cbShouldUseValkey() {
  if (cbState === CB_STATE.CLOSED) return true;
  if (cbState === CB_STATE.OPEN) {
    if (Date.now() - cbOpenedAt >= CB_PROBE_INTERVAL) {
      cbState = CB_STATE.HALF_OPEN;
      console.log('[CacheHandler] Circuit breaker → HALF_OPEN (probing Valkey)');
      return true; // Allow one probe attempt
    }
    return false;
  }
  // HALF_OPEN: allow the probe
  return true;
}

// ---------------------------------------------------------------------------
// In-Memory LRU Fallback
// ---------------------------------------------------------------------------

// Simple LRU with max 500 entries
const LRU_MAX = 500;
const memoryCache = new Map();

function memGet(key) {
  if (!memoryCache.has(key)) return null;
  const entry = memoryCache.get(key);
  if (entry.expireAt && Date.now() > entry.expireAt) {
    memoryCache.delete(key);
    return null;
  }
  // Move to end (LRU)
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.data;
}

function memSet(key, data, ttlSeconds) {
  // Evict oldest if at capacity
  if (memoryCache.size >= LRU_MAX && !memoryCache.has(key)) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  const expireAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryCache.set(key, { data, expireAt });
}

function memDelete(key) {
  memoryCache.delete(key);
}

// Test-only client override (avoids CJS module mocking issues in Vitest)
let _testClientOverride = null;

// ---------------------------------------------------------------------------
// Cache Handler
// ---------------------------------------------------------------------------

class CacheHandler {
  constructor(options) {
    this._options = options || {};
    this._client = null; // Lazy init — getValkeyClient() returns null if no sentinel configured
  }

  _getClient() {
    // Allow test injection (set via _internals.setTestClient)
    if (_testClientOverride !== null) return _testClientOverride;
    if (this._client === null) {
      this._client = getValkeyClient();
    }
    return this._client;
  }

  /**
   * Build the Valkey key for a cache data entry.
   * ioredis already prepends keyPrefix, so we only add the logical part.
   */
  _dataKey(key) {
    return `data:${key}`;
  }

  _tagKey(tag) {
    return `tags:${tag}`;
  }

  _tagsAllKey() {
    return 'tags-all';
  }

  /**
   * Wrap a Valkey operation with circuit breaker logic.
   * Falls back to `fallbackFn` if Valkey is unavailable.
   */
  async _withValkey(valkeyFn, fallbackFn) {
    const client = this._getClient();
    if (!client || !cbShouldUseValkey()) {
      return fallbackFn();
    }
    try {
      const result = await valkeyFn(client);
      cbRecordSuccess();
      return result;
    } catch (err) {
      cbRecordFailure();
      console.error('[CacheHandler] Valkey error, using in-memory fallback:', err.message);
      return fallbackFn();
    }
  }

  /**
   * Get a cache entry by key.
   * @param {string} key
   * @returns {Promise<{ value: any, lastModified: number, tags: string[] } | null>}
   */
  async get(key) {
    const dataKey = this._dataKey(key);

    return this._withValkey(
      async client => {
        const raw = await client.get(dataKey);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
      () => memGet(dataKey)
    );
  }

  /**
   * Store a cache entry.
   * @param {string} key
   * @param {any} data
   * @param {{ revalidate?: number | false, tags?: string[] }} ctx
   */
  async set(key, data, ctx) {
    const { revalidate, tags = [] } = ctx || {};
    const dataKey = this._dataKey(key);

    const entry = {
      value: data,
      lastModified: Date.now(),
      tags,
    };
    const serialized = JSON.stringify(entry);

    // TTL safety net: revalidate * 3 to allow stale-while-revalidate.
    // If revalidate is false (static), no TTL.
    const ttl = typeof revalidate === 'number' ? revalidate * 3 : null;

    await this._withValkey(
      async client => {
        const pipeline = client.pipeline();

        if (ttl) {
          pipeline.set(dataKey, serialized, 'EX', ttl);
        } else {
          pipeline.set(dataKey, serialized);
        }

        // Index each tag
        for (const tag of tags) {
          pipeline.sadd(this._tagKey(tag), key);
          pipeline.sadd(this._tagsAllKey(), tag);
        }

        await pipeline.exec();
      },
      () => {
        memSet(dataKey, entry, ttl);
      }
    );
  }

  /**
   * Invalidate all cache entries associated with a tag.
   * @param {string} tag
   */
  async revalidateTag(tag) {
    await this._withValkey(
      async client => {
        const tagKey = this._tagKey(tag);
        const keys = await client.smembers(tagKey);

        if (keys.length > 0) {
          const pipeline = client.pipeline();
          for (const k of keys) {
            pipeline.del(this._dataKey(k));
          }
          pipeline.del(tagKey);
          pipeline.srem(this._tagsAllKey(), tag);
          await pipeline.exec();
          console.log(`[CacheHandler] Revalidated tag "${tag}": removed ${keys.length} entries`);
        } else {
          // Tag set may still exist
          await client.del(tagKey);
          await client.srem(this._tagsAllKey(), tag);
          console.log(`[CacheHandler] Revalidated tag "${tag}": no entries found`);
        }
      },
      () => {
        // In-memory fallback: scan and remove matching entries
        let removed = 0;
        for (const [k, v] of memoryCache.entries()) {
          if (v.data && v.data.tags && v.data.tags.includes(tag)) {
            memoryCache.delete(k);
            removed++;
          }
        }
        console.log(`[CacheHandler] In-memory revalidated tag "${tag}": removed ${removed} entries`);
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Exports — Next.js expects `module.exports` to be the handler class
// ---------------------------------------------------------------------------

module.exports = CacheHandler;

// Export internals for testing
module.exports._internals = {
  memoryCache,
  memGet,
  memSet,
  memDelete,
  getCbState: () => cbState,
  getCbErrors: () => cbErrors,
  resetCircuitBreaker: () => {
    cbState = CB_STATE.CLOSED;
    cbErrors = 0;
    cbOpenedAt = 0;
  },
  CB_STATE,
  // Test hooks: inject a client without relying on CJS module mocking
  setTestClient: client => {
    _testClientOverride = client;
  },
  clearTestClient: () => {
    _testClientOverride = null;
  },
};
