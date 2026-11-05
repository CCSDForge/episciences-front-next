/**
 * PDF disk cache — read path (server-only).
 *
 * Populated exclusively by the background worker (scripts/pdf-cache-worker.mjs)
 * on the shared NFS mount. This module never writes to disk: it only reads a
 * cache entry, and asks the worker (via a Valkey pub/sub message) to populate
 * or refresh one. See docs/PDF_CACHE_STRATEGY.md for the full design.
 *
 * PDF_CACHE_ENABLED=false (the default) short-circuits every exported
 * function to a no-op / null before any fs or Valkey call is made.
 */

import { promises as fsp } from 'node:fs';
import { createHash } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { logger } from '@/lib/logger';
// valkey-client.js is the same CJS singleton used by src/lib/cache-handler.js
// for the Next.js ISR cache (esModuleInterop makes this import work with its
// `module.exports = {...}`).
import { getValkeyClient } from '@/lib/valkey-client';

const log = logger.child({ service: 'pdf-cache' });

// Bump only if the sidecar shape changes in a way older readers can't parse.
// A reader that sees an unknown version treats the entry as a miss — this is
// what makes a rolling deploy safe.
export const CACHE_SCHEMA_VERSION = 1;

export interface PdfCacheSidecar {
  schemaVersion: number;
  sourceUrl: string;
  finalUrl?: string;
  key: string;
  fetchedAt: string; // ISO8601 — the only freshness signal
  byteLength: number;
  upstreamContentType: string;
  httpStatus: number;
  etag?: string;
  lastModified?: string;
  host: string;
}

export interface PdfCacheEntry {
  sidecar: PdfCacheSidecar;
  /** Authoritative size, from fstat on the open file handle, not from the sidecar. */
  byteLength: number;
  ageSeconds: number;
  stream: ReadableStream<Uint8Array>;
}

export type PdfCacheEnqueueReason = 'populate' | 'refresh';

interface PdfCacheEnqueuePayload {
  url: string;
  key: string;
  enqueuedAt: string;
  reason: PdfCacheEnqueueReason;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function isCacheEnabled(): boolean {
  return process.env.PDF_CACHE_ENABLED === 'true';
}

export function getCacheMode(): 'fallback' | 'systematic' {
  return process.env.PDF_CACHE_MODE === 'systematic' ? 'systematic' : 'fallback';
}

export function getCacheMaxAgeSeconds(): number {
  const parsed = Number(process.env.PDF_CACHE_MAX_AGE_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15552000; // 180 days
}

function getEnqueueTtlSeconds(): number {
  const parsed = Number(process.env.PDF_CACHE_ENQUEUE_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}

function getChannel(): string {
  return process.env.PDF_CACHE_CHANNEL || 'pdf-cache-populate';
}

function getReadTimeoutMs(): number {
  const parsed = Number(process.env.PDF_CACHE_READ_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}

function getEnqueueLockKey(key: string): string {
  return `pdfcache:enq:${key}`;
}

// ---------------------------------------------------------------------------
// Key & paths
// ---------------------------------------------------------------------------

export function getCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export function isValidCacheKey(key: string): boolean {
  return /^[0-9a-f]{64}$/.test(key);
}

function isValidEpiEnv(env: string): boolean {
  return /^[a-z0-9-]{2,20}$/.test(env);
}

function isValidCacheRootName(root: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(root);
}

/**
 * Resolves the cache root directory, or null if the cache cannot be used
 * (EPI_ENV missing/invalid). Fails closed — never guesses the environment.
 */
function getCacheRootDir(): string | null {
  const epiEnv = process.env.EPI_ENV;
  if (!epiEnv || !isValidEpiEnv(epiEnv)) {
    return null;
  }
  const baseDir = process.env.PDF_CACHE_BASE_DIR || '/data/epi';
  const root = process.env.PDF_CACHE_ROOT || 'pdf-cache';
  if (!isValidCacheRootName(root)) {
    return null;
  }
  return path.join(baseDir, epiEnv, root);
}

export interface PdfCachePaths {
  dir: string;
  pdfPath: string;
  jsonPath: string;
}

/**
 * Computes the on-disk paths for a cache key.
 *
 * Defense in depth: `key` is derived from a sha256 hash so it is structurally
 * safe, but it also arrives over an unauthenticated pub/sub message in the
 * worker — asserting the hex shape here, before any path.join, closes path
 * traversal by construction rather than by convention.
 */
export function getCachePaths(key: string): PdfCachePaths | null {
  if (!isValidCacheKey(key)) {
    return null;
  }
  const root = getCacheRootDir();
  if (!root) {
    return null;
  }
  const shard = key.slice(0, 2);
  const dir = path.join(root, shard);
  return {
    dir,
    pdfPath: path.join(dir, `${key}.pdf`),
    jsonPath: path.join(dir, `${key}.json`),
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

// After a read timeout, cache reads are skipped for this long: on a hung NFS
// mount each blocked fs call pins one of libuv's (4 by default) threadpool
// threads, so retrying on every request would starve DNS, crypto and every
// other route of this process. The timeout only stops waiting, it cannot
// unblock the call, so the mount must still be `soft` (see
// docs/PDF_CACHE_STRATEGY.md §9).
const READ_BREAKER_COOLDOWN_MS = 30_000;
let readsDisabledUntil = 0;

class CacheReadTimeoutError extends Error {
  constructor(operation: string) {
    super(`PDF cache ${operation} timed out`);
    this.name = 'CacheReadTimeoutError';
  }
}

/**
 * Races `operation` against the read timeout. `onLateResult` receives the
 * value if it resolves after the timeout fired (used to close a file handle
 * that would otherwise leak).
 */
async function withReadTimeout<T>(
  operation: Promise<T>,
  label: string,
  onLateResult?: (value: T) => void
): Promise<T> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new CacheReadTimeoutError(label));
    }, getReadTimeoutMs());
  });
  operation.then(
    value => {
      if (timedOut) onLateResult?.(value);
    },
    () => {}
  );
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function tripReadBreaker(error: unknown): void {
  if (error instanceof CacheReadTimeoutError) {
    readsDisabledUntil = Date.now() + READ_BREAKER_COOLDOWN_MS;
    log.warn('PDF cache read timed out, skipping cache reads for a while', {
      error: error.message,
      cooldownMs: READ_BREAKER_COOLDOWN_MS,
    });
  }
}

function closeQuietly(handle: FileHandle): void {
  handle.close().catch(() => {});
}

/**
 * Reads one cache entry. Returns null on any miss condition — including any
 * fs error (ENOENT, ESTALE, EACCES, EIO…) or a read slower than
 * PDF_CACHE_READ_TIMEOUT_MS — never throws, so a cache read failure always
 * degrades to "treat as a miss" for the caller.
 *
 * The pdf is opened once and both its size and its stream come from that
 * same file handle: a worker refresh renaming a new file into place between
 * a path-based stat() and a lazy open would otherwise announce one size and
 * stream another file.
 */
export async function readCacheEntry(key: string): Promise<PdfCacheEntry | null> {
  if (!isCacheEnabled() || Date.now() < readsDisabledUntil) {
    return null;
  }

  const paths = getCachePaths(key);
  if (!paths) {
    return null;
  }

  let sidecar: PdfCacheSidecar;
  try {
    const raw = await withReadTimeout(fsp.readFile(paths.jsonPath, 'utf8'), 'sidecar read');
    sidecar = JSON.parse(raw);
  } catch (error) {
    // Missing/corrupt sidecar — including a fresh write not yet visible from
    // this instance (NFS attribute cache) — is a plain miss.
    tripReadBreaker(error);
    return null;
  }

  if (!sidecar || sidecar.schemaVersion !== CACHE_SCHEMA_VERSION) {
    // Forward-compat: an entry written by a newer/older schema is a miss, not
    // a crash — this is what makes a rolling deploy of the worker safe.
    return null;
  }

  let handle: FileHandle;
  try {
    handle = await withReadTimeout(fsp.open(paths.pdfPath, 'r'), 'pdf open', closeQuietly);
  } catch (error) {
    // Sidecar present but pdf missing (race with a sweep, or crash between
    // the two renames on write) — miss, self-heals on next populate.
    tripReadBreaker(error);
    return null;
  }

  let size: number;
  try {
    ({ size } = await withReadTimeout(handle.stat(), 'pdf fstat'));
  } catch (error) {
    tripReadBreaker(error);
    closeQuietly(handle);
    return null;
  }

  if (size !== sidecar.byteLength) {
    log.warn('Cache entry size mismatch, treating as miss', {
      key,
      sidecarByteLength: sidecar.byteLength,
      fstatSize: size,
    });
    closeQuietly(handle);
    return null;
  }

  // autoClose (the default) closes the handle on end, error or cancel.
  const nodeStream = handle.createReadStream();
  const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  const fetchedAtMs = Date.parse(sidecar.fetchedAt);
  const ageSeconds = Number.isFinite(fetchedAtMs)
    ? Math.max(0, (Date.now() - fetchedAtMs) / 1000)
    : Number.POSITIVE_INFINITY;

  return { sidecar, byteLength: size, ageSeconds, stream };
}

export function isEntryStale(entry: PdfCacheEntry, maxAgeSeconds = getCacheMaxAgeSeconds()): boolean {
  return entry.ageSeconds > maxAgeSeconds;
}

/**
 * Deletes a cache entry — sidecar first, then pdf, the same ordering the
 * worker's retention sweep uses, so a reader never observes a sidecar
 * pointing at an already-deleted pdf.
 *
 * This is the one deliberate exception to "app instances never write to the
 * NFS cache": POST /api/revalidate uses it for an editor-triggered,
 * already-authenticated PDF invalidation (a corrected article file). It is
 * delete-only — nothing here ever creates or modifies an entry — so it
 * cannot race the worker: at worst, a delete right before a populate lands
 * is a self-healing miss on the next request.
 *
 * Also releases the Valkey dedup lock for this key, so the next request
 * re-enqueues a populate right away instead of serving live fetches until
 * PDF_CACHE_ENQUEUE_TTL_SECONDS expires.
 *
 * Never throws; a missing file is treated as already deleted (idempotent).
 */
export async function deleteCacheEntry(key: string): Promise<void> {
  const paths = getCachePaths(key);
  if (!paths) {
    return;
  }
  await fsp.unlink(paths.jsonPath).catch(() => {});
  await fsp.unlink(paths.pdfPath).catch(() => {});

  try {
    await getValkeyClient()?.del(getEnqueueLockKey(key));
  } catch (error) {
    log.warn('Failed to release enqueue lock', { key, error: (error as Error)?.message });
  }
}

// ---------------------------------------------------------------------------
// Enqueue (write delegated entirely to the worker)
// ---------------------------------------------------------------------------

let warnedMissingValkey = false;

/**
 * Fire-and-forget request for the worker to populate/refresh a cache entry.
 * Never throws — always caught internally so it can never affect the HTTP
 * response, whether called directly or via next/server's after().
 *
 * Deduplicated across every app instance via a Valkey `SET NX EX` lock before
 * publishing: without it, every request for a popular PDF would ask the
 * worker to re-fetch it, doubling upstream traffic instead of reducing it.
 */
export async function enqueuePopulateJob(
  url: string,
  key: string,
  reason: PdfCacheEnqueueReason = 'populate'
): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  try {
    const client = getValkeyClient();
    if (!client) {
      if (!warnedMissingValkey) {
        warnedMissingValkey = true;
        log.warn(
          'PDF_CACHE_ENABLED=true but no Valkey client is available (VALKEY_ENABLED/VALKEY_SENTINEL_HOSTS not configured) — the cache will never be populated. This is a deployment precondition, not a silent degradation.'
        );
      }
      return;
    }

    const lockKey = getEnqueueLockKey(key);
    const ttl = getEnqueueTtlSeconds();
    const acquired = await client.set(lockKey, '1', 'EX', ttl, 'NX');
    if (acquired !== 'OK') {
      // Another instance already asked for this URL recently — skip.
      return;
    }

    const payload: PdfCacheEnqueuePayload = {
      url,
      key,
      enqueuedAt: new Date().toISOString(),
      reason,
    };
    await client.publish(getChannel(), JSON.stringify(payload));
  } catch (error) {
    log.warn('Failed to enqueue populate job', { key, error: (error as Error)?.message });
  }
}
