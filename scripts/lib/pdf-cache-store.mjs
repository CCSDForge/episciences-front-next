/**
 * PDF disk cache — on-disk store (worker-side, write path).
 *
 * Mirrors the path/key logic of src/lib/pdf-cache.ts (the read side, used by
 * the Next.js route). The two are intentionally duplicated rather than
 * shared: this script runs standalone via `node scripts/pdf-cache-worker.mjs`,
 * outside the Next.js build, on the same model as scripts/revalidate-worker.mjs.
 *
 * This is the ONLY code in the whole feature allowed to write to the cache —
 * every app instance only reads (src/lib/pdf-cache.ts) or asks this worker to
 * populate/refresh via a Valkey pub/sub message. That single-writer design is
 * what eliminates concurrent-write races on the shared NFS mount by
 * construction, without any file locking.
 */

import { createWriteStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Must match src/lib/pdf-cache.ts's CACHE_SCHEMA_VERSION. A reader that sees
// an unknown version treats the entry as a miss, so bumping this here alone
// (without a matching reader change) is safe to roll out gradually.
export const CACHE_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function isValidCacheKey(key) {
  return /^[0-9a-f]{64}$/.test(key);
}

function isValidEpiEnv(env) {
  return /^[a-z0-9-]{2,20}$/.test(env);
}

function isValidCacheRootName(root) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(root);
}

/**
 * @returns {string|null} the cache root dir, or null if EPI_ENV is missing/invalid.
 */
export function getCacheRootDir(env = process.env) {
  const epiEnv = env.EPI_ENV;
  if (!epiEnv || !isValidEpiEnv(epiEnv)) return null;
  const baseDir = env.PDF_CACHE_BASE_DIR || '/data/epi';
  const root = env.PDF_CACHE_ROOT || 'pdf-cache';
  if (!isValidCacheRootName(root)) return null;
  return path.join(baseDir, epiEnv, root);
}

/**
 * Single-level shard ({key[0:2]}/), not git's two-level scheme: at most a
 * few hundred thousand PDFs are expected over the cache's lifetime, so 256
 * directories keep `readdir` (used by the sweep) cheap on NFS, where a
 * 65536-directory tree would mean tens of thousands of network round trips
 * per sweep pass for no benefit at this scale.
 */
export function getCachePaths(key, env = process.env) {
  if (!isValidCacheKey(key)) return null;
  const root = getCacheRootDir(env);
  if (!root) return null;
  const shard = key.slice(0, 2);
  const dir = path.join(root, shard);
  return {
    dir,
    pdfPath: path.join(dir, `${key}.pdf`),
    jsonPath: path.join(dir, `${key}.json`),
  };
}

// ---------------------------------------------------------------------------
// Sidecar read (to decide on a conditional revalidation) & atomic write
// ---------------------------------------------------------------------------

/**
 * @returns {object|null} the existing sidecar, or null if absent/corrupt.
 */
export async function readSidecarIfExists(key, env = process.env) {
  const paths = getCachePaths(key, env);
  if (!paths) return null;
  try {
    const raw = await fsp.readFile(paths.jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeFileAtomic(finalPath, dir, writeFn) {
  await fsp.mkdir(dir, { recursive: true, mode: 0o750 });
  const tmpPath = path.join(dir, `.tmp-${process.pid}-${randomUUID()}`);
  try {
    await writeFn(tmpPath);
    await fsp.rename(tmpPath, finalPath);
  } catch (error) {
    await fsp.unlink(tmpPath).catch(() => {});
    throw error;
  }
}

/**
 * Streams `sourceStream` (a Node Readable) to the final `.pdf` path via a
 * temp file in the same directory + rename (atomic on the same filesystem),
 * then writes the `.json` sidecar the same way — strictly AFTER the pdf
 * rename succeeds. That order is what makes "the sidecar exists" a reliable
 * completeness marker for readers: a reader that finds a sidecar can trust
 * the pdf is fully written; a crash between the two renames leaves an
 * orphaned pdf with no sidecar, which is just a miss, self-healing on the
 * next populate request.
 *
 * @param {string} key
 * @param {import('node:stream').Readable} sourceStream
 * @param {(chunkTotal: number) => void} [onBytes] progress callback
 * @param {object} sidecarFields - everything except schemaVersion/key/fetchedAt
 */
export async function writeEntryAtomic(key, sourceStream, sidecarFields, env = process.env) {
  const paths = getCachePaths(key, env);
  if (!paths) {
    throw new Error(`Cannot resolve cache paths for key ${key} (invalid EPI_ENV or key)`);
  }

  const { pipeline } = await import('node:stream/promises');

  await writeFileAtomic(paths.pdfPath, paths.dir, async tmpPath => {
    const writeStream = createWriteStream(tmpPath, { mode: 0o640 });
    await pipeline(sourceStream, writeStream);
  });

  // Read back the real size rather than counting bytes in transit: attaching
  // a 'data' listener directly on sourceStream would switch it to flowing
  // mode ahead of pipeline()'s own consumption, racing it for the data.
  const { size: bytesWritten } = await fsp.stat(paths.pdfPath);

  const sidecar = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    key,
    fetchedAt: new Date().toISOString(),
    byteLength: bytesWritten,
    ...sidecarFields,
  };

  await writeFileAtomic(paths.jsonPath, paths.dir, async tmpPath => {
    await fsp.writeFile(tmpPath, JSON.stringify(sidecar), { mode: 0o640 });
  });

  return { bytesWritten, sidecar };
}

/**
 * Rewrites only the sidecar (fetchedAt refreshed, ETag/Last-Modified kept) —
 * used after a 304 Not Modified from a conditional revalidation, so a
 * refresh of a still-current PDF costs one empty HTTP round trip instead of
 * re-downloading the whole file.
 */
export async function touchSidecar(key, existingSidecar, env = process.env) {
  const paths = getCachePaths(key, env);
  if (!paths) return;
  const sidecar = {
    ...existingSidecar,
    schemaVersion: CACHE_SCHEMA_VERSION,
    key,
    fetchedAt: new Date().toISOString(),
  };
  await writeFileAtomic(paths.jsonPath, paths.dir, async tmpPath => {
    await fsp.writeFile(tmpPath, JSON.stringify(sidecar), { mode: 0o640 });
  });
}

// ---------------------------------------------------------------------------
// Disk-space guard
// ---------------------------------------------------------------------------

/**
 * Refuses new writes when free space on the cache's filesystem drops below
 * the configured floor — a shared NFS mount filling up is a fleet-wide
 * incident, not something the cache should be able to cause on its own.
 */
export async function hasEnoughFreeSpace(rootDir, minFreePercent = 10) {
  try {
    const stat = await fsp.statfs(rootDir);
    if (!stat.blocks) return true; // can't tell — don't block on a filesystem that doesn't report this
    const freePercent = (stat.bavail / stat.blocks) * 100;
    return freePercent >= minFreePercent;
  } catch {
    // statfs unsupported/unavailable on this platform — fail open rather
    // than refuse every write because of a diagnostics gap.
    return true;
  }
}

// ---------------------------------------------------------------------------
// Sweep: retention, orphaned tmp files, pdf-without-sidecar
// ---------------------------------------------------------------------------

const ALL_SHARDS = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/**
 * Sweeps a bounded slice of shards (not the whole tree at once — a full NFS
 * `readdir` sweep can take minutes and would starve the job queue). Call
 * repeatedly with an advancing `cursor`; it wraps around automatically.
 *
 * Also returns every surviving `.pdf` entry it visited (`visited`), so that
 * once a full cycle (all 256 shards) completes, the caller can enforce
 * PDF_CACHE_MAX_TOTAL_BYTES with a correct oldest-first eviction — correct
 * because, by the time a cycle wraps, every entry in the cache has been
 * seen exactly once, which a flat/sharded store without a separate size
 * index cannot otherwise guarantee cheaply.
 *
 * @returns {{ nextCursor: number, removed: { retention: number, orphanTmp: number, orphanPdf: number }, visited: Array<{ pdfPath: string, jsonPath: string, size: number, fetchedAtMs: number }>, cycleCompleted: boolean }}
 */
export async function sweepShardBatch(cursor, options, env = process.env) {
  const root = getCacheRootDir(env);
  const removed = { retention: 0, orphanTmp: 0, orphanPdf: 0 };
  const visited = [];
  if (!root) return { nextCursor: cursor, removed, visited, cycleCompleted: false };

  const {
    retentionDays = 365,
    shardsPerBatch = 8,
    tmpOrphanMaxAgeMs = 60 * 60 * 1000, // 1h
  } = options ?? {};

  const retentionCutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (let i = 0; i < shardsPerBatch; i++) {
    const shard = ALL_SHARDS[(cursor + i) % ALL_SHARDS.length];
    const dir = path.join(root, shard);

    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue; // shard directory doesn't exist yet — nothing to sweep
    }

    const names = new Set(entries.map(e => e.name));

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.name.startsWith('.tmp-')) {
        const stat = await fsp.stat(fullPath).catch(() => null);
        if (stat && now - stat.mtimeMs > tmpOrphanMaxAgeMs) {
          await fsp.unlink(fullPath).catch(() => {});
          removed.orphanTmp++;
        }
        continue;
      }

      if (entry.name.endsWith('.pdf')) {
        const key = entry.name.slice(0, -4);
        const hasSidecar = names.has(`${key}.json`);
        if (!hasSidecar) {
          // Crash between the pdf rename and the sidecar rename — orphan.
          await fsp.unlink(fullPath).catch(() => {});
          removed.orphanPdf++;
          continue;
        }

        const sidecarPath = path.join(dir, `${key}.json`);
        const sidecar = await fsp
          .readFile(sidecarPath, 'utf8')
          .then(JSON.parse)
          .catch(() => null);
        const fetchedAtMs = sidecar ? Date.parse(sidecar.fetchedAt) : NaN;
        if (Number.isFinite(fetchedAtMs) && fetchedAtMs < retentionCutoffMs) {
          // Sidecar removed first, pdf second — mirrors the write order, so
          // a reader never observes a sidecar pointing at a deleted pdf.
          await fsp.unlink(sidecarPath).catch(() => {});
          await fsp.unlink(fullPath).catch(() => {});
          removed.retention++;
          continue;
        }

        if (Number.isFinite(fetchedAtMs) && sidecar) {
          const stat = await fsp.stat(fullPath).catch(() => null);
          if (stat) {
            visited.push({ pdfPath: fullPath, jsonPath: sidecarPath, size: stat.size, fetchedAtMs });
          }
        }
      }
    }
  }

  const nextCursor = (cursor + shardsPerBatch) % ALL_SHARDS.length;
  return { nextCursor, removed, visited, cycleCompleted: nextCursor <= cursor };
}

/**
 * Evicts the oldest (by fetchedAt) entries from a fully-visited cycle until
 * total size drops to `targetRatio` of `maxTotalBytes`. Only meaningful once
 * a full sweep cycle has completed — see sweepShardBatch's `visited` field.
 *
 * @returns {{ evicted: number, freedBytes: number }}
 */
export async function evictOldestUntilUnderCap(visited, maxTotalBytes, targetRatio = 0.9) {
  if (!maxTotalBytes || maxTotalBytes <= 0) return { evicted: 0, freedBytes: 0 };

  let totalBytes = visited.reduce((sum, e) => sum + e.size, 0);
  if (totalBytes <= maxTotalBytes) return { evicted: 0, freedBytes: 0 };

  const targetBytes = maxTotalBytes * targetRatio;
  const oldestFirst = [...visited].sort((a, b) => a.fetchedAtMs - b.fetchedAtMs);

  let evicted = 0;
  let freedBytes = 0;
  for (const entry of oldestFirst) {
    if (totalBytes <= targetBytes) break;
    // Sidecar first, pdf second — same ordering as the retention sweep.
    await fsp.unlink(entry.jsonPath).catch(() => {});
    await fsp.unlink(entry.pdfPath).catch(() => {});
    totalBytes -= entry.size;
    freedBytes += entry.size;
    evicted++;
  }

  return { evicted, freedBytes };
}

export const TOTAL_SHARD_COUNT = ALL_SHARDS.length;
