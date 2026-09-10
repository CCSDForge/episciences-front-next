import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// pdf-cache.ts imports getValkeyClient statically via the same alias used
// here, so mocking it at this path intercepts both — no CJS require()
// interception issue (unlike valkey-client.js's own require('ioredis')).
vi.mock('@/lib/valkey-client', () => ({
  getValkeyClient: vi.fn(),
}));

import { getValkeyClient } from '@/lib/valkey-client';

function createFakeValkeyClient(setResult: 'OK' | null = 'OK') {
  return {
    set: vi.fn().mockResolvedValue(setResult),
    publish: vi.fn().mockResolvedValue(1),
  };
}

async function readAllBytes(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

const SCHEMA_VERSION = 1;

function buildSidecar(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: 'https://zenodo.org/record/1/file.pdf',
    key: 'unused-in-assertions',
    fetchedAt: new Date().toISOString(),
    byteLength: 0,
    upstreamContentType: 'application/pdf',
    httpStatus: 200,
    host: 'zenodo.org',
    ...overrides,
  };
}

async function seedEntry(
  rootDir: string,
  key: string,
  content: Buffer,
  sidecarOverrides: Record<string, unknown> = {}
) {
  const dir = path.join(rootDir, key.slice(0, 2));
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, `${key}.pdf`), content);
  const sidecar = buildSidecar({ byteLength: content.length, key, ...sidecarOverrides });
  await fsp.writeFile(path.join(dir, `${key}.json`), JSON.stringify(sidecar));
  return sidecar;
}

describe('pdf-cache', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.mocked(getValkeyClient).mockReset();
    tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'pdf-cache-test-'));
    process.env.PDF_CACHE_ENABLED = 'true';
    process.env.EPI_ENV = 'test';
    process.env.PDF_CACHE_BASE_DIR = tmpRoot;
    delete process.env.PDF_CACHE_ROOT; // defaults to "pdf-cache"
  });

  afterEach(async () => {
    delete process.env.PDF_CACHE_ENABLED;
    delete process.env.PDF_CACHE_MODE;
    delete process.env.EPI_ENV;
    delete process.env.PDF_CACHE_BASE_DIR;
    delete process.env.PDF_CACHE_ROOT;
    delete process.env.PDF_CACHE_MAX_AGE_SECONDS;
    delete process.env.PDF_CACHE_ENQUEUE_TTL_SECONDS;
    delete process.env.PDF_CACHE_CHANNEL;
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  });

  function cacheRootDir(): string {
    return path.join(tmpRoot, 'test', 'pdf-cache');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Key & paths
  // ───────────────────────────────────────────────────────────────────────

  describe('getCacheKey / isValidCacheKey', () => {
    it('is a deterministic sha256 hex digest of the URL', async () => {
      const { getCacheKey } = await import('../pdf-cache');
      const url = 'https://zenodo.org/record/1/file.pdf';
      const expected = createHash('sha256').update(url).digest('hex');
      expect(getCacheKey(url)).toBe(expected);
      expect(getCacheKey(url)).toBe(getCacheKey(url));
    });

    it('produces different keys for different URLs (no normalization)', async () => {
      const { getCacheKey } = await import('../pdf-cache');
      expect(getCacheKey('https://zenodo.org/a.pdf')).not.toBe(getCacheKey('https://zenodo.org/A.pdf'));
    });

    it('validates a 64-char hex string', async () => {
      const { isValidCacheKey, getCacheKey } = await import('../pdf-cache');
      expect(isValidCacheKey(getCacheKey('https://zenodo.org/a.pdf'))).toBe(true);
    });

    it.each(['', 'not-hex', 'a'.repeat(63), 'a'.repeat(65), `${'A'.repeat(64)}`])(
      'rejects invalid key %j',
      async invalid => {
        const { isValidCacheKey } = await import('../pdf-cache');
        expect(isValidCacheKey(invalid)).toBe(false);
      }
    );
  });

  describe('getCachePaths', () => {
    it('returns null for an invalid key, without touching EPI_ENV', async () => {
      const { getCachePaths } = await import('../pdf-cache');
      expect(getCachePaths('not-a-valid-key')).toBeNull();
    });

    it('returns null when EPI_ENV is missing', async () => {
      delete process.env.EPI_ENV;
      const { getCachePaths, getCacheKey } = await import('../pdf-cache');
      expect(getCachePaths(getCacheKey('https://zenodo.org/a.pdf'))).toBeNull();
    });

    it('returns null when EPI_ENV has an invalid shape', async () => {
      process.env.EPI_ENV = 'Prod!';
      const { getCachePaths, getCacheKey } = await import('../pdf-cache');
      expect(getCachePaths(getCacheKey('https://zenodo.org/a.pdf'))).toBeNull();
    });

    it('shards on a single level (first 2 hex chars), not two', async () => {
      const { getCachePaths, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const paths = getCachePaths(key);
      expect(paths).not.toBeNull();
      expect(paths!.dir).toBe(path.join(cacheRootDir(), key.slice(0, 2)));
      expect(paths!.pdfPath).toBe(path.join(cacheRootDir(), key.slice(0, 2), `${key}.pdf`));
      expect(paths!.jsonPath).toBe(path.join(cacheRootDir(), key.slice(0, 2), `${key}.json`));
    });

    it('honors PDF_CACHE_ROOT as a bare directory name', async () => {
      process.env.PDF_CACHE_ROOT = 'custom-cache';
      const { getCachePaths, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const paths = getCachePaths(key);
      expect(paths!.dir).toBe(path.join(tmpRoot, 'test', 'custom-cache', key.slice(0, 2)));
    });

    it('rejects a PDF_CACHE_ROOT that looks like a path', async () => {
      process.env.PDF_CACHE_ROOT = '../../etc';
      const { getCachePaths, getCacheKey } = await import('../pdf-cache');
      expect(getCachePaths(getCacheKey('https://zenodo.org/a.pdf'))).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // readCacheEntry
  // ───────────────────────────────────────────────────────────────────────

  describe('readCacheEntry', () => {
    it('returns null without touching the filesystem when the cache is disabled', async () => {
      process.env.PDF_CACHE_ENABLED = 'false';
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      // No directories created at all — a fs call here would throw ENOENT,
      // proving the disabled short-circuit runs before any fs access.
      const entry = await readCacheEntry(getCacheKey('https://zenodo.org/a.pdf'));
      expect(entry).toBeNull();
    });

    it('returns null on a cold miss (nothing on disk)', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const entry = await readCacheEntry(getCacheKey('https://zenodo.org/a.pdf'));
      expect(entry).toBeNull();
    });

    it('returns a hit with the correct bytes and authoritative byteLength', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const url = 'https://zenodo.org/record/1/file.pdf';
      const key = getCacheKey(url);
      const content = Buffer.from('%PDF-1.4 fake pdf content');
      await seedEntry(cacheRootDir(), key, content, { sourceUrl: url });

      const entry = await readCacheEntry(key);
      expect(entry).not.toBeNull();
      expect(entry!.byteLength).toBe(content.length);
      expect(entry!.sidecar.sourceUrl).toBe(url);
      await expect(readAllBytes(entry!.stream)).resolves.toEqual(content);
    });

    it('computes ageSeconds from fetchedAt', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const fetchedAt = new Date(Date.now() - 120_000).toISOString(); // 2 min ago
      await seedEntry(cacheRootDir(), key, Buffer.from('x'), { fetchedAt });

      const entry = await readCacheEntry(key);
      expect(entry!.ageSeconds).toBeGreaterThanOrEqual(115);
      expect(entry!.ageSeconds).toBeLessThan(130);
    });

    it('returns null when the sidecar exists but the pdf file is missing', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const dir = path.join(cacheRootDir(), key.slice(0, 2));
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, `${key}.json`), JSON.stringify(buildSidecar({ key })));

      const entry = await readCacheEntry(key);
      expect(entry).toBeNull();
    });

    it('returns null when the sidecar is corrupt JSON', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const dir = path.join(cacheRootDir(), key.slice(0, 2));
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, `${key}.pdf`), Buffer.from('x'));
      await fsp.writeFile(path.join(dir, `${key}.json`), '{not json');

      const entry = await readCacheEntry(key);
      expect(entry).toBeNull();
    });

    it('returns null when schemaVersion is unknown (forward-compat miss)', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      await seedEntry(cacheRootDir(), key, Buffer.from('content'), { schemaVersion: 999 });

      const entry = await readCacheEntry(key);
      expect(entry).toBeNull();
    });

    it('returns null and logs a warning when byteLength does not match the real file size', async () => {
      const { readCacheEntry, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      await seedEntry(cacheRootDir(), key, Buffer.from('12345'), { byteLength: 999 });

      const entry = await readCacheEntry(key);
      expect(entry).toBeNull();
    });
  });

  describe('isEntryStale', () => {
    it('is false for a fresh entry', async () => {
      const { readCacheEntry, isEntryStale, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      await seedEntry(cacheRootDir(), key, Buffer.from('x'));
      const entry = await readCacheEntry(key);
      expect(isEntryStale(entry!, 3600)).toBe(false);
    });

    it('is true once past the given max age', async () => {
      const { readCacheEntry, isEntryStale, getCacheKey } = await import('../pdf-cache');
      const key = getCacheKey('https://zenodo.org/a.pdf');
      const fetchedAt = new Date(Date.now() - 10_000).toISOString();
      await seedEntry(cacheRootDir(), key, Buffer.from('x'), { fetchedAt });
      const entry = await readCacheEntry(key);
      expect(isEntryStale(entry!, 5)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // enqueuePopulateJob
  // ───────────────────────────────────────────────────────────────────────

  describe('enqueuePopulateJob', () => {
    it('does nothing when the cache is disabled', async () => {
      process.env.PDF_CACHE_ENABLED = 'false';
      const fakeClient = createFakeValkeyClient('OK');
      vi.mocked(getValkeyClient).mockReturnValue(fakeClient as never);
      const { enqueuePopulateJob } = await import('../pdf-cache');

      await enqueuePopulateJob('https://zenodo.org/a.pdf', 'a'.repeat(64));

      expect(fakeClient.set).not.toHaveBeenCalled();
      expect(fakeClient.publish).not.toHaveBeenCalled();
    });

    it('does nothing (and never throws) when no Valkey client is available', async () => {
      vi.mocked(getValkeyClient).mockReturnValue(null);
      const { enqueuePopulateJob } = await import('../pdf-cache');

      await expect(
        enqueuePopulateJob('https://zenodo.org/a.pdf', 'a'.repeat(64))
      ).resolves.toBeUndefined();
    });

    it('publishes when the dedup lock is acquired (SET NX returns OK)', async () => {
      const fakeClient = createFakeValkeyClient('OK');
      vi.mocked(getValkeyClient).mockReturnValue(fakeClient as never);
      const { enqueuePopulateJob, getCacheKey } = await import('../pdf-cache');
      const url = 'https://zenodo.org/a.pdf';
      const key = getCacheKey(url);

      await enqueuePopulateJob(url, key, 'populate');

      expect(fakeClient.set).toHaveBeenCalledWith(`pdfcache:enq:${key}`, '1', 'EX', 3600, 'NX');
      expect(fakeClient.publish).toHaveBeenCalledTimes(1);
      const [channel, payload] = fakeClient.publish.mock.calls[0];
      expect(channel).toBe('pdf-cache-populate');
      expect(JSON.parse(payload)).toMatchObject({ url, key, reason: 'populate' });
    });

    it('does NOT publish when the dedup lock is already held (SET NX returns null)', async () => {
      // This is the guard against doubling upstream traffic: without it, every
      // request for a popular PDF would ask the worker to re-fetch it.
      const fakeClient = createFakeValkeyClient(null);
      vi.mocked(getValkeyClient).mockReturnValue(fakeClient as never);
      const { enqueuePopulateJob, getCacheKey } = await import('../pdf-cache');
      const url = 'https://zenodo.org/a.pdf';

      await enqueuePopulateJob(url, getCacheKey(url));

      expect(fakeClient.set).toHaveBeenCalledTimes(1);
      expect(fakeClient.publish).not.toHaveBeenCalled();
    });

    it('never throws when the Valkey client rejects', async () => {
      const fakeClient = {
        set: vi.fn().mockRejectedValue(new Error('connection reset')),
        publish: vi.fn(),
      };
      vi.mocked(getValkeyClient).mockReturnValue(fakeClient as never);
      const { enqueuePopulateJob } = await import('../pdf-cache');

      await expect(
        enqueuePopulateJob('https://zenodo.org/a.pdf', 'a'.repeat(64))
      ).resolves.toBeUndefined();
      expect(fakeClient.publish).not.toHaveBeenCalled();
    });

    it('honors a custom PDF_CACHE_ENQUEUE_TTL_SECONDS and PDF_CACHE_CHANNEL', async () => {
      process.env.PDF_CACHE_ENQUEUE_TTL_SECONDS = '120';
      process.env.PDF_CACHE_CHANNEL = 'custom-channel';
      const fakeClient = createFakeValkeyClient('OK');
      vi.mocked(getValkeyClient).mockReturnValue(fakeClient as never);
      const { enqueuePopulateJob, getCacheKey } = await import('../pdf-cache');
      const url = 'https://zenodo.org/a.pdf';
      const key = getCacheKey(url);

      await enqueuePopulateJob(url, key);

      expect(fakeClient.set).toHaveBeenCalledWith(`pdfcache:enq:${key}`, '1', 'EX', 120, 'NX');
      expect(fakeClient.publish).toHaveBeenCalledWith('custom-channel', expect.any(String));
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Config helpers
  // ───────────────────────────────────────────────────────────────────────

  describe('config helpers', () => {
    it('isCacheEnabled reflects PDF_CACHE_ENABLED exactly', async () => {
      const { isCacheEnabled } = await import('../pdf-cache');
      expect(isCacheEnabled()).toBe(true);
      process.env.PDF_CACHE_ENABLED = 'false';
      expect(isCacheEnabled()).toBe(false);
      delete process.env.PDF_CACHE_ENABLED;
      expect(isCacheEnabled()).toBe(false);
    });

    it('getCacheMode defaults to fallback for anything other than "systematic"', async () => {
      const { getCacheMode } = await import('../pdf-cache');
      expect(getCacheMode()).toBe('fallback');
      process.env.PDF_CACHE_MODE = 'systematic';
      expect(getCacheMode()).toBe('systematic');
      process.env.PDF_CACHE_MODE = 'bogus';
      expect(getCacheMode()).toBe('fallback');
    });

    it('getCacheMaxAgeSeconds defaults to 180 days', async () => {
      const { getCacheMaxAgeSeconds } = await import('../pdf-cache');
      expect(getCacheMaxAgeSeconds()).toBe(15552000);
      process.env.PDF_CACHE_MAX_AGE_SECONDS = '60';
      expect(getCacheMaxAgeSeconds()).toBe(60);
    });
  });
});
