import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for src/lib/cache-handler.js
 *
 * We use _internals.setTestClient() to inject a mock client directly,
 * avoiding CJS module mocking complexity across require() boundaries.
 */

// Import the CacheHandler (CJS module — default export is the class)
const cacheHandlerModule = await import('../cache-handler.js');
const CacheHandler = cacheHandlerModule.default as any;
const { _internals } = cacheHandlerModule as any;

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function makeMockClient() {
  const pipelineExec = vi.fn().mockResolvedValue([]);
  const pipeline = {
    set: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    exec: pipelineExec,
  };
  const client = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    pipeline: vi.fn(() => pipeline),
    _pipeline: pipeline,
    _pipelineExec: pipelineExec,
  };
  return client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHandler() {
  return new CacheHandler({});
}

function clearMemory() {
  _internals.memoryCache.clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CacheHandler', () => {
  let mockClient: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    mockClient = makeMockClient();
    _internals.setTestClient(mockClient);
    _internals.resetCircuitBreaker();
    clearMemory();
  });

  afterEach(() => {
    _internals.clearTestClient();
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns null on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);
      const handler = makeHandler();
      const result = await handler.get('missing-key');
      expect(result).toBeNull();
      expect(mockClient.get).toHaveBeenCalledWith('data:missing-key');
    });

    it('returns parsed entry on cache hit', async () => {
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { html: '<p>Hello</p>' }, lastModified: 1000, tags: ['articles'] };
      mockClient.get.mockResolvedValue(JSON.stringify(entry));
      const handler = makeHandler();
      const result = await handler.get('some-key');
      expect(result).toEqual(entry);
    });

    it('returns null when stored JSON is invalid', async () => {
      mockClient.get.mockResolvedValue('not-json{{');
      const handler = makeHandler();
      const result = await handler.get('bad-json-key');
      expect(result).toBeNull();
    });

    it('restores Map values after JSON round-trip', async () => {
      const map = new Map([['key1', 'val1'], ['key2', 42]]);
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { segmentData: map }, lastModified: 1000, tags: [] };
      mockClient.get.mockResolvedValue(_internals.serialize(entry));
      const handler = makeHandler();
      const result = await handler.get('map-key');
      expect(result?.value.segmentData).toBeInstanceOf(Map);
      expect(result?.value.segmentData.get('key1')).toBe('val1');
      expect(result?.value.segmentData.get('key2')).toBe(42);
    });

    it('restores Set values after JSON round-trip', async () => {
      const set = new Set(['a', 'b', 'c']);
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { tags: set }, lastModified: 1000, tags: [] };
      mockClient.get.mockResolvedValue(_internals.serialize(entry));
      const handler = makeHandler();
      const result = await handler.get('set-key');
      expect(result?.value.tags).toBeInstanceOf(Set);
      expect(result?.value.tags.has('b')).toBe(true);
    });

    it('restores Buffer values after JSON round-trip', async () => {
      // Use Uint8Array directly (happy-dom env does not expose Node.js Buffer globally)
      const bytes = new TextEncoder().encode('hello cache');
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { body: bytes }, lastModified: 1000, tags: [] };
      mockClient.get.mockResolvedValue(_internals.serialize(entry));
      const handler = makeHandler();
      const result = await handler.get('buffer-key');
      const body = result?.value.body;
      // Decoded content must match regardless of exact Buffer/Uint8Array type
      expect(new TextDecoder().decode(body)).toBe('hello cache');
    });

    it('ensures rscData is a proper Buffer (defensive ensureBuffer)', async () => {
      // Simulate a Uint8Array returned from deserialization (should be re-wrapped as Buffer)
      const bytes = new TextEncoder().encode('rsc payload');
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { kind: 'APP_PAGE', html: '<html/>', rscData: bytes }, lastModified: 1000, tags: [] };
      mockClient.get.mockResolvedValue(_internals.serialize(entry));
      const handler = makeHandler();
      const result = await handler.get('rsc-key');
      // After ensureBuffer, rscData must pass Buffer.isBuffer() so render-result.js
      // calls streamFromBuffer() instead of falling through to `return this.response`
      expect(Buffer.isBuffer(result?.value.rscData)).toBe(true);
    });

    it('ensures segmentData Map values are proper Buffers (defensive ensureBuffer)', async () => {
      const bytes = new TextEncoder().encode('segment payload');
      const segMap = new Map([['/_tree', bytes], ['/_full', bytes]]);
      const entry = { __v: _internals.CACHE_FORMAT_VERSION, value: { kind: 'APP_PAGE', html: '<html/>', segmentData: segMap }, lastModified: 1000, tags: [] };
      mockClient.get.mockResolvedValue(_internals.serialize(entry));
      const handler = makeHandler();
      const result = await handler.get('seg-key');
      const seg = result?.value.segmentData;
      expect(seg).toBeInstanceOf(Map);
      expect(Buffer.isBuffer(seg?.get('/_tree'))).toBe(true);
      expect(Buffer.isBuffer(seg?.get('/_full'))).toBe(true);
    });

    it('ensureBuffer: Uint8Array → Buffer', () => {
      const u8 = new Uint8Array([1, 2, 3]);
      const result = _internals.ensureBuffer(u8);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('ensureBuffer: {type:Buffer,data:[]} → Buffer', () => {
      const legacyJson = { type: 'Buffer', data: [65, 66, 67] };
      const result = _internals.ensureBuffer(legacyJson);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('ABC');
    });

    it('ensureBuffer: Buffer → Buffer (no-op)', () => {
      const buf = Buffer.from('hello');
      const result = _internals.ensureBuffer(buf);
      expect(result).toBe(buf);
    });

    it('falls back to in-memory when Valkey throws', async () => {
      // Preload in-memory
      const entry = { value: 'stale', lastModified: 900, tags: [] };
      _internals.memSet('data:mem-key', entry, null);

      mockClient.get.mockRejectedValue(new Error('Connection refused'));
      const handler = makeHandler();
      const result = await handler.get('mem-key');

      expect(result).toEqual(entry);
    });
  });

  // -------------------------------------------------------------------------
  // set()
  // -------------------------------------------------------------------------

  describe('set()', () => {
    it('stores entry without TTL for revalidate: false', async () => {
      const handler = makeHandler();
      await handler.set('static-key', { html: 'test' }, { revalidate: false, tags: [] });

      const pipeline = mockClient._pipeline;
      // Should call set without 'EX'
      expect(pipeline.set).toHaveBeenCalledWith(
        'data:static-key',
        expect.stringContaining('"value":{"html":"test"}')
      );
      // Should NOT have called set with 'EX'
      expect(pipeline.set.mock.calls[0]).not.toContain('EX');
    });

    it('stores entry with TTL = revalidate * 3', async () => {
      const handler = makeHandler();
      await handler.set('dynamic-key', { html: 'test' }, { revalidate: 3600, tags: [] });

      const pipeline = mockClient._pipeline;
      expect(pipeline.set).toHaveBeenCalledWith(
        'data:dynamic-key',
        expect.any(String),
        'EX',
        10800 // 3600 * 3
      );
    });

    it('indexes tags in Valkey sets', async () => {
      const handler = makeHandler();
      await handler.set('article-1', { html: '' }, { revalidate: 86400, tags: ['articles', 'journal-epijinfo'] });

      const pipeline = mockClient._pipeline;
      expect(pipeline.sadd).toHaveBeenCalledWith('tags:articles', 'article-1');
      expect(pipeline.sadd).toHaveBeenCalledWith('tags:journal-epijinfo', 'article-1');
      expect(pipeline.sadd).toHaveBeenCalledWith('tags-all', 'articles');
      expect(pipeline.sadd).toHaveBeenCalledWith('tags-all', 'journal-epijinfo');
    });

    it('stores lastModified timestamp in the entry', async () => {
      const before = Date.now();
      const handler = makeHandler();
      await handler.set('ts-key', { x: 1 }, { revalidate: false, tags: [] });
      const after = Date.now();

      const pipeline = mockClient._pipeline;
      const serialized = pipeline.set.mock.calls[0][1];
      const entry = JSON.parse(serialized);
      expect(entry.lastModified).toBeGreaterThanOrEqual(before);
      expect(entry.lastModified).toBeLessThanOrEqual(after);
    });

    it('falls back to in-memory when Valkey pipeline throws', async () => {
      mockClient._pipelineExec.mockRejectedValue(new Error('ECONNRESET'));
      const handler = makeHandler();

      await handler.set('fallback-key', { x: 1 }, { revalidate: 60, tags: [] });

      // Entry should be in memory cache
      const stored = _internals.memGet('data:fallback-key');
      expect(stored).not.toBeNull();
      expect(stored?.value).toEqual({ x: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // revalidateTag()
  // -------------------------------------------------------------------------

  describe('revalidateTag()', () => {
    it('deletes keys associated with a tag', async () => {
      mockClient.smembers.mockResolvedValue(['key-1', 'key-2']);
      const handler = makeHandler();
      await handler.revalidateTag('articles');

      expect(mockClient.smembers).toHaveBeenCalledWith('tags:articles');
      const pipeline = mockClient._pipeline;
      expect(pipeline.del).toHaveBeenCalledWith('data:key-1');
      expect(pipeline.del).toHaveBeenCalledWith('data:key-2');
      expect(pipeline.del).toHaveBeenCalledWith('tags:articles');
      expect(pipeline.srem).toHaveBeenCalledWith('tags-all', 'articles');
    });

    it('handles empty tag set gracefully', async () => {
      mockClient.smembers.mockResolvedValue([]);
      mockClient.del.mockResolvedValue(0);
      mockClient.srem.mockResolvedValue(0);
      const handler = makeHandler();
      await expect(handler.revalidateTag('empty-tag')).resolves.not.toThrow();
    });

    it('uses in-memory fallback when Valkey throws', async () => {
      // Preload memory cache with tagged entries
      _internals.memSet('data:k1', { value: 'v1', tags: ['my-tag'], lastModified: 1 }, null);
      _internals.memSet('data:k2', { value: 'v2', tags: ['other-tag'], lastModified: 1 }, null);

      mockClient.smembers.mockRejectedValue(new Error('Connection refused'));
      const handler = makeHandler();
      await handler.revalidateTag('my-tag');

      // k1 should be removed, k2 preserved
      expect(_internals.memGet('data:k1')).toBeNull();
      expect(_internals.memGet('data:k2')).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Circuit Breaker
  // -------------------------------------------------------------------------

  describe('Circuit Breaker', () => {
    it('starts in CLOSED state', () => {
      expect(_internals.getCbState()).toBe(_internals.CB_STATE.CLOSED);
    });

    it('transitions to OPEN after threshold consecutive failures', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const handler = makeHandler();

      // Default threshold is 5
      const threshold = 5;
      for (let i = 0; i < threshold; i++) {
        await handler.get(`key-${i}`);
      }

      expect(_internals.getCbState()).toBe(_internals.CB_STATE.OPEN);
    });

    it('resets error count on success', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const handler = makeHandler();

      // 3 failures (below threshold)
      for (let i = 0; i < 3; i++) {
        await handler.get(`fail-${i}`);
      }
      expect(_internals.getCbErrors()).toBe(3);

      // Success resets count
      mockClient.get.mockResolvedValue(null);
      await handler.get('ok-key');
      expect(_internals.getCbErrors()).toBe(0);
      expect(_internals.getCbState()).toBe(_internals.CB_STATE.CLOSED);
    });

    it('serves in-memory fallback while circuit is OPEN', async () => {
      // Force OPEN
      const threshold = 5;
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const handler = makeHandler();
      for (let i = 0; i < threshold; i++) {
        await handler.get(`fail-${i}`);
      }
      expect(_internals.getCbState()).toBe(_internals.CB_STATE.OPEN);

      // Preload in-memory
      _internals.memSet('data:cached-key', { value: 'stale', lastModified: 500, tags: [] }, null);

      // Should return in-memory without calling Valkey
      const callsBefore = mockClient.get.mock.calls.length;
      const result = await handler.get('cached-key');
      expect(result).toEqual({ value: 'stale', lastModified: 500, tags: [] });
      // No new Valkey call (circuit is OPEN)
      expect(mockClient.get.mock.calls.length).toBe(callsBefore);
    });

    it('uses in-memory for set() when circuit is OPEN', async () => {
      // Force OPEN
      mockClient._pipelineExec.mockRejectedValue(new Error('down'));
      const handler = makeHandler();
      // Also make get() fail to increment error counter
      mockClient.get.mockRejectedValue(new Error('down'));
      for (let i = 0; i < 5; i++) {
        await handler.get(`fail-${i}`);
      }
      expect(_internals.getCbState()).toBe(_internals.CB_STATE.OPEN);

      // set() should go to in-memory
      await handler.set('open-key', { data: 'test' }, { revalidate: 60, tags: [] });
      const stored = _internals.memGet('data:open-key');
      expect(stored).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Null client (Valkey disabled)
  // -------------------------------------------------------------------------

  describe('When Valkey client is null', () => {
    beforeEach(() => {
      _internals.setTestClient(null);
    });

    it('get() returns in-memory value', async () => {
      _internals.memSet('data:x', { value: 'mem', lastModified: 1, tags: [] }, null);
      const handler = makeHandler();
      const result = await handler.get('x');
      expect(result).toEqual({ value: 'mem', lastModified: 1, tags: [] });
    });

    it('set() stores in in-memory cache', async () => {
      const handler = makeHandler();
      await handler.set('y', { z: 1 }, { revalidate: false, tags: [] });
      const stored = _internals.memGet('data:y');
      expect(stored).not.toBeNull();
      expect(stored?.value).toEqual({ z: 1 });
    });
  });
});
