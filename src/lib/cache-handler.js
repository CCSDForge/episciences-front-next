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

// Increment when the serialization format changes to invalidate stale entries.
// v1: initial (no __v field, ReadableStream silently lost as {})
// v2: ReadableStream preserved via preprocessValue + __t:'ReadableStream'
// v3: Uint8Array stored as __t:'Buffer' (base64) — Buffer.isBuffer() now true
//     on restore; Map/Set values processed recursively in preprocessValue
const CACHE_FORMAT_VERSION = 3;

// ---------------------------------------------------------------------------
// Serialization — preserves Map, Set, Buffer, Uint8Array across JSON round-trips
// Next.js 16 stores Map objects in cache entries (e.g. segmentData). Plain
// JSON.stringify/parse loses the Map type, causing "o.segmentData.get is not
// a function" errors when the entry is read back from Valkey.
// ---------------------------------------------------------------------------

function serialize(data) {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Map) {
      return { __t: 'Map', v: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __t: 'Set', v: Array.from(value.values()) };
    }
    if (Buffer.isBuffer(value)) {
      return { __t: 'Buffer', v: value.toString('base64') };
    }
    // Store Uint8Array as Buffer (base64) so Buffer.isBuffer() holds on restore.
    // Next.js RenderResult.readable only checks Buffer.isBuffer(), not instanceof
    // Uint8Array, so a plain Uint8Array would fall through to `return this.response`
    // and cause "a.pipeTo is not a function" on every cache hit.
    if (value instanceof Uint8Array) {
      return { __t: 'Buffer', v: Buffer.from(value).toString('base64') };
    }
    return value;
  });
}

function deserialize(raw) {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === 'object' && typeof value.__t === 'string') {
      if (value.__t === 'Map') return new Map(value.v);
      if (value.__t === 'Set') return new Set(value.v);
      if (value.__t === 'Buffer') return Buffer.from(value.v, 'base64');
      // Legacy entries (pre-fix) stored Uint8Array as number array — restore as
      // Buffer so Buffer.isBuffer() is true and RenderResult can stream it.
      if (value.__t === 'Uint8Array') return Buffer.from(new Uint8Array(value.v));
      if (value.__t === 'ReadableStream') {
        const buf = Buffer.from(value.v, 'base64');
        return new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(buf));
            controller.close();
          },
        });
      }
    }
    return value;
  });
}

/**
 * Recursively consume ReadableStream instances before JSON serialization.
 * JSON.stringify cannot handle ReadableStream — it silently becomes {}.
 * Next.js 16 stores ReadableStream in value.body (APP_ROUTE kind), which
 * must be piped back on cache hit. Without this pre-pass, .pipeTo() fails.
 */
async function preprocessValue(val) {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (typeof ReadableStream !== 'undefined' && val instanceof ReadableStream) {
    const reader = val.getReader();
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    const buf = Buffer.concat(chunks);
    return { __t: 'ReadableStream', v: buf.toString('base64') };
  }
  // Buffer and Uint8Array: pass through as-is; serialize() handles them.
  if (Buffer.isBuffer(val) || val instanceof Uint8Array) return val;
  // Map: process values recursively so nested ReadableStreams/Uint8Arrays are
  // handled (e.g. segmentData: Map<string, Buffer|Uint8Array>).
  if (val instanceof Map) {
    const entries = await Promise.all(
      Array.from(val.entries()).map(async ([k, v]) => [k, await preprocessValue(v)])
    );
    return new Map(entries);
  }
  // Set: process values recursively.
  if (val instanceof Set) {
    const values = await Promise.all(Array.from(val.values()).map(preprocessValue));
    return new Set(values);
  }
  if (Array.isArray(val)) {
    return Promise.all(val.map(preprocessValue));
  }
  const result = {};
  for (const [k, v] of Object.entries(val)) {
    result[k] = await preprocessValue(v);
  }
  return result;
}

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
        if (!raw) {
          if (process.env.CACHE_DEBUG === 'true') console.log(`[CacheHandler] MISS ${key}`);
          return null;
        }
        try {
          const entry = deserialize(raw);
          if (!entry || entry.__v !== CACHE_FORMAT_VERSION) {
            // Stale or incompatible format — treat as miss so Next.js re-renders
            if (process.env.CACHE_DEBUG === 'true') console.log(`[CacheHandler] STALE (version mismatch) ${key}`);
            return null;
          }
          if (process.env.CACHE_DEBUG === 'true') console.log(`[CacheHandler] HIT  ${key}`);
          return entry;
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

    const processedData = await preprocessValue(data);
    const entry = {
      __v: CACHE_FORMAT_VERSION,
      value: processedData,
      lastModified: Date.now(),
      tags,
    };
    const serialized = serialize(entry);

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
        if (process.env.CACHE_DEBUG === 'true') console.log(`[CacheHandler] SET  ${key} ttl=${ttl ?? 'none'} tags=${tags.join(',')}`);
      },
      () => {
        memSet(dataKey, entry, ttl);
        if (process.env.CACHE_DEBUG === 'true') console.log(`[CacheHandler] SET(mem) ${key}`);
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
  // Serialization utilities exposed for testing
  serialize,
  deserialize,
  preprocessValue,
  CACHE_FORMAT_VERSION,
};
