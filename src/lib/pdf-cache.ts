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

import { createReadStream, promises as fsp } from 'node:fs';
import { createHash } from 'node:crypto';
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
  /** Authoritative size, from fstat — not from the sidecar. */
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

/**
 * Reads one cache entry. Returns null on any miss condition — including any
 * fs error (ENOENT, ESTALE, EACCES, EIO…) — never throws, so a cache read
 * failure always degrades to "treat as a miss" for the caller.
 */
export async function readCacheEntry(key: string): Promise<PdfCacheEntry | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  const paths = getCachePaths(key);
  if (!paths) {
    return null;
  }

  let sidecar: PdfCacheSidecar;
  try {
    const raw = await fsp.readFile(paths.jsonPath, 'utf8');
    sidecar = JSON.parse(raw);
  } catch {
    // Missing/corrupt sidecar — including a fresh write not yet visible from
    // this instance (NFS attribute cache) — is a plain miss.
    return null;
  }

  if (!sidecar || sidecar.schemaVersion !== CACHE_SCHEMA_VERSION) {
    // Forward-compat: an entry written by a newer/older schema is a miss, not
    // a crash — this is what makes a rolling deploy of the worker safe.
    return null;
  }

  let stat;
  try {
    stat = await fsp.stat(paths.pdfPath);
  } catch {
    // Sidecar present but pdf missing (race with a sweep, or crash between
    // the two renames on write) — miss, self-heals on next populate.
    return null;
  }

  if (stat.size !== sidecar.byteLength) {
    log.warn('Cache entry size mismatch, treating as miss', {
      key,
      sidecarByteLength: sidecar.byteLength,
      fstatSize: stat.size,
    });
    return null;
  }

  const nodeStream = createReadStream(paths.pdfPath);
  const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  const fetchedAtMs = Date.parse(sidecar.fetchedAt);
  const ageSeconds = Number.isFinite(fetchedAtMs)
    ? Math.max(0, (Date.now() - fetchedAtMs) / 1000)
    : Number.POSITIVE_INFINITY;

  return { sidecar, byteLength: stat.size, ageSeconds, stream };
}

export function isEntryStale(entry: PdfCacheEntry, maxAgeSeconds = getCacheMaxAgeSeconds()): boolean {
  return entry.ageSeconds > maxAgeSeconds;
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

    const lockKey = `pdfcache:enq:${key}`;
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
