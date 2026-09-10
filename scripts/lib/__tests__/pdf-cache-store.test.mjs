import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'node:fs';
import { Readable } from 'node:stream';
import os from 'node:os';
import path from 'node:path';
import {
  getCacheRootDir,
  getCachePaths,
  readSidecarIfExists,
  writeEntryAtomic,
  touchSidecar,
  hasEnoughFreeSpace,
  sweepShardBatch,
  evictOldestUntilUnderCap,
  TOTAL_SHARD_COUNT,
  CACHE_SCHEMA_VERSION,
} from '../pdf-cache-store.mjs';

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const KEY_C = 'c'.repeat(64);

describe('pdf-cache-store', () => {
  let tmpRoot;
  let env;

  beforeEach(async () => {
    tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'pdf-cache-store-test-'));
    env = { EPI_ENV: 'test', PDF_CACHE_BASE_DIR: tmpRoot };
  });

  afterEach(async () => {
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  });

  function rootDir() {
    return path.join(tmpRoot, 'test', 'pdf-cache');
  }

  describe('getCacheRootDir / getCachePaths', () => {
    it('resolves the default root as BASE_DIR/EPI_ENV/pdf-cache', () => {
      expect(getCacheRootDir(env)).toBe(rootDir());
    });

    it('returns null when EPI_ENV is missing', () => {
      expect(getCacheRootDir({ PDF_CACHE_BASE_DIR: tmpRoot })).toBeNull();
    });

    it('shards on a single level', () => {
      const paths = getCachePaths(KEY_A, env);
      expect(paths.dir).toBe(path.join(rootDir(), 'aa'));
      expect(paths.pdfPath).toBe(path.join(rootDir(), 'aa', `${KEY_A}.pdf`));
      expect(paths.jsonPath).toBe(path.join(rootDir(), 'aa', `${KEY_A}.json`));
    });

    it('returns null for an invalid key', () => {
      expect(getCachePaths('short', env)).toBeNull();
    });
  });

  describe('writeEntryAtomic', () => {
    it('writes the pdf then the sidecar, both readable afterwards', async () => {
      const content = Buffer.from('%PDF-1.4 hello world');
      const stream = Readable.from([content]);

      const { bytesWritten, sidecar } = await writeEntryAtomic(
        KEY_A,
        stream,
        { sourceUrl: 'https://zenodo.org/a.pdf', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'zenodo.org' },
        env
      );

      expect(bytesWritten).toBe(content.length);
      expect(sidecar.schemaVersion).toBe(CACHE_SCHEMA_VERSION);
      expect(sidecar.byteLength).toBe(content.length);

      const paths = getCachePaths(KEY_A, env);
      const onDisk = await fsp.readFile(paths.pdfPath);
      expect(onDisk).toEqual(content);
      const sidecarOnDisk = JSON.parse(await fsp.readFile(paths.jsonPath, 'utf8'));
      expect(sidecarOnDisk.sourceUrl).toBe('https://zenodo.org/a.pdf');
    });

    it('never leaves a temp file behind on success', async () => {
      const stream = Readable.from([Buffer.from('%PDF-1.4 x')]);
      await writeEntryAtomic(KEY_A, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env);
      const paths = getCachePaths(KEY_A, env);
      const files = await fsp.readdir(paths.dir);
      expect(files.every(f => !f.startsWith('.tmp-'))).toBe(true);
    });

    it('cleans up the temp file and rejects when the source stream errors', async () => {
      const stream = Readable.from(
        (async function* () {
          throw new Error('network reset');
        })()
      );

      await expect(
        writeEntryAtomic(KEY_A, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env)
      ).rejects.toThrow('network reset');

      const paths = getCachePaths(KEY_A, env);
      await expect(fsp.access(paths.pdfPath)).rejects.toThrow();
      const dirExists = await fsp
        .readdir(paths.dir)
        .catch(() => []);
      expect(dirExists.every(f => !f.startsWith('.tmp-'))).toBe(true);
    });
  });

  describe('touchSidecar', () => {
    it('refreshes fetchedAt while keeping other fields (304 revalidation path)', async () => {
      const stream = Readable.from([Buffer.from('%PDF-1.4 x')]);
      const { sidecar: original } = await writeEntryAtomic(
        KEY_A,
        stream,
        { sourceUrl: 'https://zenodo.org/a.pdf', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'zenodo.org', etag: 'W/"abc"' },
        env
      );

      await new Promise(r => setTimeout(r, 5));
      await touchSidecar(KEY_A, original, env);

      const paths = getCachePaths(KEY_A, env);
      const updated = JSON.parse(await fsp.readFile(paths.jsonPath, 'utf8'));
      expect(updated.etag).toBe('W/"abc"');
      expect(Date.parse(updated.fetchedAt)).toBeGreaterThan(Date.parse(original.fetchedAt));
    });
  });

  describe('readSidecarIfExists', () => {
    it('returns null when nothing was ever written', async () => {
      expect(await readSidecarIfExists(KEY_A, env)).toBeNull();
    });

    it('returns the parsed sidecar after a write', async () => {
      const stream = Readable.from([Buffer.from('%PDF-1.4 x')]);
      await writeEntryAtomic(KEY_A, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env);
      const sidecar = await readSidecarIfExists(KEY_A, env);
      expect(sidecar.sourceUrl).toBe('u');
    });
  });

  describe('hasEnoughFreeSpace', () => {
    it('returns true for the real filesystem with a low threshold', async () => {
      await fsp.mkdir(rootDir(), { recursive: true });
      expect(await hasEnoughFreeSpace(rootDir(), 1)).toBe(true);
    });

    it('fails open (true) when statfs is not possible (nonexistent path)', async () => {
      expect(await hasEnoughFreeSpace(path.join(tmpRoot, 'does', 'not', 'exist'), 10)).toBe(true);
    });
  });

  describe('sweepShardBatch', () => {
    it('removes an expired entry (retention) and reports it as visited=false', async () => {
      const oldFetchedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
      const stream = Readable.from([Buffer.from('%PDF-1.4 old')]);
      await writeEntryAtomic(KEY_A, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env);
      // Backdate fetchedAt directly on disk to simulate an old entry.
      const paths = getCachePaths(KEY_A, env);
      const sidecar = JSON.parse(await fsp.readFile(paths.jsonPath, 'utf8'));
      sidecar.fetchedAt = oldFetchedAt;
      await fsp.writeFile(paths.jsonPath, JSON.stringify(sidecar));

      const shardIndex = parseInt(KEY_A.slice(0, 2), 16);
      const { removed, visited } = await sweepShardBatch(shardIndex, { retentionDays: 365, shardsPerBatch: 1 }, env);

      expect(removed.retention).toBe(1);
      expect(visited).toHaveLength(0);
      await expect(fsp.access(paths.pdfPath)).rejects.toThrow();
      await expect(fsp.access(paths.jsonPath)).rejects.toThrow();
    });

    it('keeps a fresh entry and reports it as visited', async () => {
      const stream = Readable.from([Buffer.from('%PDF-1.4 fresh')]);
      await writeEntryAtomic(KEY_A, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env);

      const shardIndex = parseInt(KEY_A.slice(0, 2), 16);
      const { removed, visited } = await sweepShardBatch(shardIndex, { retentionDays: 365, shardsPerBatch: 1 }, env);

      expect(removed.retention).toBe(0);
      expect(visited).toHaveLength(1);
      expect(visited[0].size).toBe(Buffer.from('%PDF-1.4 fresh').length);
    });

    it('removes an orphaned pdf with no sidecar', async () => {
      const paths = getCachePaths(KEY_A, env);
      await fsp.mkdir(paths.dir, { recursive: true });
      await fsp.writeFile(paths.pdfPath, Buffer.from('orphan'));

      const shardIndex = parseInt(KEY_A.slice(0, 2), 16);
      const { removed } = await sweepShardBatch(shardIndex, { shardsPerBatch: 1 }, env);

      expect(removed.orphanPdf).toBe(1);
      await expect(fsp.access(paths.pdfPath)).rejects.toThrow();
    });

    it('removes a stale .tmp- file past the orphan age, keeps a fresh one', async () => {
      const paths = getCachePaths(KEY_A, env);
      await fsp.mkdir(paths.dir, { recursive: true });
      const staleTmp = path.join(paths.dir, '.tmp-1234-stale');
      const freshTmp = path.join(paths.dir, '.tmp-5678-fresh');
      await fsp.writeFile(staleTmp, 'x');
      await fsp.writeFile(freshTmp, 'x');
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await fsp.utimes(staleTmp, oldTime, oldTime);

      const shardIndex = parseInt(KEY_A.slice(0, 2), 16);
      const { removed } = await sweepShardBatch(
        shardIndex,
        { shardsPerBatch: 1, tmpOrphanMaxAgeMs: 60 * 60 * 1000 },
        env
      );

      expect(removed.orphanTmp).toBe(1);
      await expect(fsp.access(staleTmp)).rejects.toThrow();
      await expect(fsp.access(freshTmp)).resolves.toBeUndefined();
    });

    it('reports cycleCompleted only once nextCursor wraps back to 0', async () => {
      const first = await sweepShardBatch(0, { shardsPerBatch: 8 }, env);
      expect(first.cycleCompleted).toBe(false);
      expect(first.nextCursor).toBe(8);

      const last = await sweepShardBatch(TOTAL_SHARD_COUNT - 8, { shardsPerBatch: 8 }, env);
      expect(last.nextCursor).toBe(0);
      expect(last.cycleCompleted).toBe(true);
    });
  });

  describe('evictOldestUntilUnderCap', () => {
    it('does nothing when under the cap', async () => {
      const visited = [{ pdfPath: 'a', jsonPath: 'a.json', size: 10, fetchedAtMs: 1 }];
      const result = await evictOldestUntilUnderCap(visited, 1000);
      expect(result).toEqual({ evicted: 0, freedBytes: 0 });
    });

    it('does nothing when maxTotalBytes is 0 (unlimited)', async () => {
      const visited = [{ pdfPath: 'a', jsonPath: 'a.json', size: 10_000, fetchedAtMs: 1 }];
      const result = await evictOldestUntilUnderCap(visited, 0);
      expect(result).toEqual({ evicted: 0, freedBytes: 0 });
    });

    it('evicts oldest-first until back under 90% of the cap', async () => {
      // Write three real entries so we can assert they're actually deleted.
      const entries = [
        { key: KEY_A, fetchedAtMs: 1000, size: 40 },
        { key: KEY_B, fetchedAtMs: 2000, size: 40 },
        { key: KEY_C, fetchedAtMs: 3000, size: 40 },
      ];
      const visited = [];
      for (const e of entries) {
        const stream = Readable.from([Buffer.alloc(e.size, 'x')]);
        await writeEntryAtomic(e.key, stream, { sourceUrl: 'u', upstreamContentType: 'application/pdf', httpStatus: 200, host: 'h' }, env);
        const paths = getCachePaths(e.key, env);
        visited.push({ pdfPath: paths.pdfPath, jsonPath: paths.jsonPath, size: e.size, fetchedAtMs: e.fetchedAtMs });
      }

      // Total = 120 bytes. Cap at 70 -> target 63 -> removing only the oldest
      // (A, -40 -> 80) still overshoots, so it must also evict the next
      // oldest (B, -40 -> 40) before C is left alone.
      const result = await evictOldestUntilUnderCap(visited, 70, 0.9);

      expect(result.evicted).toBe(2);
      expect(result.freedBytes).toBe(80);
      await expect(fsp.access(getCachePaths(KEY_A, env).pdfPath)).rejects.toThrow();
      await expect(fsp.access(getCachePaths(KEY_B, env).pdfPath)).rejects.toThrow();
      await expect(fsp.access(getCachePaths(KEY_C, env).pdfPath)).resolves.toBeUndefined();
    });
  });
});
