/**
 * PDF Cache Populate Worker — Valkey Pub/Sub → NFS disk cache
 *
 * Subscribes to the Valkey "pdf-cache-populate" channel. When a message
 * arrives (published by the pdf-proxy route on any app instance), it
 * independently re-fetches the PDF from upstream, validates it, and writes
 * it atomically to the shared NFS cache.
 *
 * This is the ONLY process allowed to write to the cache. A single instance
 * (no replication) eliminates concurrent-write races on the NFS mount by
 * construction — see docs/PDF_CACHE_STRATEGY.md for the full rationale.
 *
 * Managed by systemd via pdf-cache-worker.service, on the same model as
 * revalidate-worker.mjs / revalidate-worker.service — deliberately not
 * sharing code with it (this script has its own Sentinel client, like
 * revalidate-worker.mjs does, rather than importing src/lib/valkey-client.js,
 * which is built into the Next.js app, not this standalone script).
 *
 * Message format (JSON), published by src/lib/pdf-cache.ts:
 *   { "url": "https://zenodo.org/...", "key": "<sha256 hex>", "reason": "populate" | "refresh" }
 *
 * Environment variables:
 *   VALKEY_SENTINEL_HOSTS       — comma-separated "host:port" pairs (required)
 *   VALKEY_MASTER_NAME          — sentinel master group name (default: mymaster)
 *   VALKEY_USERNAME             — Valkey ACL username (optional)
 *   VALKEY_PASSWORD             — Valkey auth password
 *   VALKEY_SENTINEL_USERNAME    — Sentinel ACL username (optional)
 *   VALKEY_SENTINEL_PASSWORD    — Sentinel auth password
 *   PDF_CACHE_CHANNEL           — Pub/Sub channel (default: pdf-cache-populate)
 *   EPI_ENV                     — "prod"/"preprod"/... (required, ^[a-z0-9-]{2,20}$)
 *   PDF_CACHE_BASE_DIR          — cache root prefix (default: /data/epi)
 *   PDF_CACHE_ROOT              — cache subdirectory name (default: pdf-cache)
 *   PDF_CACHE_MAX_BYTES         — per-file size cap (default: 104857600, 100MB)
 *   PDF_CACHE_MAX_TOTAL_BYTES   — cache-wide size cap, 0 = unlimited (default: 0)
 *   PDF_CACHE_MIN_FREE_PERCENT  — refuse writes below this free-space % (default: 10)
 *   PDF_CACHE_FETCH_TIMEOUT_MS  — upstream fetch timeout (default: 20000)
 *   PDF_CACHE_WORKER_CONCURRENCY— max jobs in flight at once (default: 4)
 *   PDF_CACHE_QUEUE_MAX         — bounded in-memory queue, extra jobs dropped (default: 500)
 *   PDF_CACHE_RETENTION_DAYS    — delete entries older than this, by fetchedAt (default: 365)
 *   PDF_CACHE_SWEEP_ENABLED     — periodic retention/orphan sweep (default: true)
 *   PDF_CACHE_SWEEP_INTERVAL_HOURS — time to sweep the whole tree once (default: 24)
 */

import pkg from 'ioredis';
import { createHash } from 'node:crypto';
import { isAllowedPdfDomain } from './lib/allowed-pdf-domains.mjs';
import {
  getCacheRootDir,
  readSidecarIfExists,
  writeEntryAtomic,
  touchSidecar,
  hasEnoughFreeSpace,
  sweepShardBatch,
  evictOldestUntilUnderCap,
  TOTAL_SHARD_COUNT,
} from './lib/pdf-cache-store.mjs';
import {
  fetchUpstream,
  buildConditionalHeaders,
  createValidatingStream,
  PdfValidationError,
} from './lib/pdf-cache-fetch.mjs';

const { Redis } = pkg;

const CHANNEL = process.env.PDF_CACHE_CHANNEL || 'pdf-cache-populate';
const MAX_RETRIES = 10;
const CONCURRENCY = Number(process.env.PDF_CACHE_WORKER_CONCURRENCY) || 4;
const QUEUE_MAX = Number(process.env.PDF_CACHE_QUEUE_MAX) || 500;
const FETCH_TIMEOUT_MS = Number(process.env.PDF_CACHE_FETCH_TIMEOUT_MS) || 20000;
const MAX_BYTES = Number(process.env.PDF_CACHE_MAX_BYTES) || 104857600;
const MAX_TOTAL_BYTES = Number(process.env.PDF_CACHE_MAX_TOTAL_BYTES) || 0;
const MIN_FREE_PERCENT = Number(process.env.PDF_CACHE_MIN_FREE_PERCENT) || 10;
const RETENTION_DAYS = Number(process.env.PDF_CACHE_RETENTION_DAYS) || 365;
const SWEEP_ENABLED = process.env.PDF_CACHE_SWEEP_ENABLED !== 'false';
const SWEEP_INTERVAL_HOURS = Number(process.env.PDF_CACHE_SWEEP_INTERVAL_HOURS) || 24;
const SHARDS_PER_BATCH = 8;

if (!process.env.EPI_ENV || !/^[a-z0-9-]{2,20}$/.test(process.env.EPI_ENV)) {
  console.error('[PdfCacheWorker] EPI_ENV env var is required and must match /^[a-z0-9-]{2,20}$/');
  process.exit(1);
}

// Files 0640, directories 0750 — Nginx (X-Accel-Redirect mode) and Node read
// as the same www-data user/group that this worker writes as; nothing on the
// shared NFS mount should be written world-readable.
process.umask(0o027);

// ---------------------------------------------------------------------------
// Parse sentinel hosts (duplicated from revalidate-worker.mjs — this script
// is standalone by design, see the module docblock)
// ---------------------------------------------------------------------------

function parseSentinels(hostsStr) {
  if (!hostsStr) return [];
  return hostsStr
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
    .map(e => {
      const lastColon = e.lastIndexOf(':');
      return lastColon === -1
        ? { host: e, port: 26379 }
        : { host: e.slice(0, lastColon), port: parseInt(e.slice(lastColon + 1), 10) || 26379 };
    });
}

const sentinels = parseSentinels(process.env.VALKEY_SENTINEL_HOSTS);
if (sentinels.length === 0) {
  console.error(
    '[PdfCacheWorker] VALKEY_SENTINEL_HOSTS env var is required (e.g. "sentinel-1:26379,sentinel-2:26379")'
  );
  process.exit(1);
}

function createSubscriberClient() {
  return new Redis({
    sentinels,
    name: process.env.VALKEY_MASTER_NAME || 'mymaster',
    username: process.env.VALKEY_USERNAME || undefined,
    password: process.env.VALKEY_PASSWORD || undefined,
    sentinelUsername: process.env.VALKEY_SENTINEL_USERNAME || undefined,
    sentinelPassword: process.env.VALKEY_SENTINEL_PASSWORD || undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // subscriber clients must retry indefinitely
    connectTimeout: 5000,
    commandTimeout: 5000,
    retryStrategy(retries) {
      const delay = Math.min(retries * 500, 30000);
      console.log(`[PdfCacheWorker] Retrying connection in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  });
}

// ---------------------------------------------------------------------------
// Bounded job queue with bounded concurrency and an in-memory dedup guard.
//
// The route already deduplicates via a Valkey SET NX EX lock before ever
// publishing, so under normal operation this Set rarely does anything — it
// is a second, cheaper barrier for the cases the distributed lock can't see:
// an intra-process burst arriving faster than the first job completes, or a
// lock TTL that expired mid-download.
// ---------------------------------------------------------------------------

const queue = [];
const inFlightKeys = new Set();
let activeCount = 0;
let droppedForQueueFull = 0;

function enqueue(job) {
  if (inFlightKeys.has(job.key)) return;
  if (queue.length >= QUEUE_MAX) {
    droppedForQueueFull++;
    console.warn(
      `[PdfCacheWorker] Queue full (${QUEUE_MAX}), dropping job for key ${job.key} (${droppedForQueueFull} dropped total)`
    );
    return;
  }
  queue.push(job);
  inFlightKeys.add(job.key);
  pump();
}

function pump() {
  while (activeCount < CONCURRENCY && queue.length > 0) {
    const job = queue.shift();
    activeCount++;
    processJob(job)
      .catch(err => {
        console.error(`[PdfCacheWorker] Unhandled error processing job ${job.key}:`, err.message);
      })
      .finally(() => {
        inFlightKeys.delete(job.key);
        activeCount--;
        pump();
      });
  }
}

// ---------------------------------------------------------------------------
// Process one job: independent re-validation, conditional fetch, atomic write
// ---------------------------------------------------------------------------

async function processJob(job) {
  const { url, key, reason } = job;

  // A pub/sub message is not authenticated — this is the real security
  // boundary for what gets fetched and written, not the publishing route.
  if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key)) {
    console.warn('[PdfCacheWorker] Rejected job: malformed key');
    return;
  }
  if (typeof url !== 'string' || createHash('sha256').update(url).digest('hex') !== key) {
    console.warn(`[PdfCacheWorker] Rejected job: key does not match sha256(url) for ${url}`);
    return;
  }
  if (!isAllowedPdfDomain(url)) {
    console.warn(`[PdfCacheWorker] Rejected job: domain not allowed for ${url}`);
    return;
  }

  const root = getCacheRootDir();
  if (!root) {
    console.error('[PdfCacheWorker] Cannot resolve cache root (check EPI_ENV/PDF_CACHE_ROOT) — skipping job');
    return;
  }

  if (!(await hasEnoughFreeSpace(root, MIN_FREE_PERCENT))) {
    console.error(
      `[PdfCacheWorker] Free space below ${MIN_FREE_PERCENT}% on ${root} — refusing to write, cache stops growing but reads are unaffected`
    );
    return;
  }

  const existingSidecar = await readSidecarIfExists(key);
  const conditionalHeaders = buildConditionalHeaders(existingSidecar);

  let result;
  try {
    result = await fetchUpstream(url, { timeoutMs: FETCH_TIMEOUT_MS, conditionalHeaders });
  } catch (err) {
    const code = err instanceof PdfValidationError ? err.code : 'FETCH_ERROR';
    console.warn(`[PdfCacheWorker] Fetch failed for ${url} (${code}): ${err.message}`);
    return;
  }

  if (result.notModified) {
    if (existingSidecar) {
      await touchSidecar(key, existingSidecar);
      console.log(`[PdfCacheWorker] 304 Not Modified — refreshed fetchedAt for key ${key}`);
    }
    return;
  }

  try {
    const validatedStream = createValidatingStream(result.body, {
      maxBytes: MAX_BYTES,
      expectedBytes: result.expectedBytes,
    });
    const { bytesWritten } = await writeEntryAtomic(key, validatedStream, {
      sourceUrl: url,
      finalUrl: result.finalUrl,
      upstreamContentType: result.contentType,
      httpStatus: result.httpStatus,
      etag: result.etag,
      lastModified: result.lastModified,
      host: new URL(result.finalUrl).hostname,
    });
    console.log(`[PdfCacheWorker] Cached ${bytesWritten} bytes for key ${key} (${reason || 'populate'})`);
  } catch (err) {
    if (err instanceof PdfValidationError) {
      console.warn(`[PdfCacheWorker] Validation failed for ${url} (${err.code}): ${err.message}`);
    } else {
      console.error(`[PdfCacheWorker] Write failed for ${url}:`, err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Periodic sweep — retention, orphaned tmp files, pdf-without-sidecar, and
// (once a full cycle across all shards completes) a global-size cap.
// Runs in this same process: no separate systemd timer, so there is never a
// second writer.
// ---------------------------------------------------------------------------

let sweepCursor = 0;
let cycleVisited = [];
let sweepTimer = null;

async function runSweepOnce() {
  const { nextCursor, removed, visited, cycleCompleted } = await sweepShardBatch(sweepCursor, {
    retentionDays: RETENTION_DAYS,
    shardsPerBatch: SHARDS_PER_BATCH,
  });
  sweepCursor = nextCursor;
  cycleVisited.push(...visited);

  if (removed.retention || removed.orphanTmp || removed.orphanPdf) {
    console.log(
      `[PdfCacheWorker] Sweep: removed ${removed.retention} expired, ${removed.orphanTmp} orphan tmp, ${removed.orphanPdf} orphan pdf`
    );
  }

  if (cycleCompleted) {
    if (MAX_TOTAL_BYTES > 0) {
      const { evicted, freedBytes } = await evictOldestUntilUnderCap(cycleVisited, MAX_TOTAL_BYTES);
      if (evicted > 0) {
        console.log(
          `[PdfCacheWorker] Evicted ${evicted} oldest entries (${freedBytes} bytes) to stay under PDF_CACHE_MAX_TOTAL_BYTES`
        );
      }
    }
    cycleVisited = [];
  }
}

function startSweepLoop() {
  if (!SWEEP_ENABLED) {
    console.log('[PdfCacheWorker] Sweep disabled (PDF_CACHE_SWEEP_ENABLED=false)');
    return;
  }
  const batchesPerCycle = Math.ceil(TOTAL_SHARD_COUNT / SHARDS_PER_BATCH);
  const intervalMs = (SWEEP_INTERVAL_HOURS * 60 * 60 * 1000) / batchesPerCycle;
  console.log(
    `[PdfCacheWorker] Sweep enabled: ${batchesPerCycle} batches of ${SHARDS_PER_BATCH} shards, one every ${Math.round(intervalMs / 1000)}s (full cycle every ${SWEEP_INTERVAL_HOURS}h)`
  );
  sweepTimer = setInterval(() => {
    runSweepOnce().catch(err => console.error('[PdfCacheWorker] Sweep error:', err.message));
  }, intervalMs);
}

// ---------------------------------------------------------------------------
// Main loop with reconnection (same shape as revalidate-worker.mjs)
// ---------------------------------------------------------------------------

let subscriber = null;
let retries = 0;
let isShuttingDown = false;

async function start() {
  if (isShuttingDown) return;

  subscriber = createSubscriberClient();

  subscriber.on('error', err => {
    console.error('[PdfCacheWorker] Subscriber error:', err.message);
  });

  subscriber.on('connect', () => {
    console.log('[PdfCacheWorker] Connected to Valkey');
    retries = 0;
  });

  subscriber.on('reconnecting', delay => {
    console.log(`[PdfCacheWorker] Reconnecting in ${delay}ms...`);
  });

  try {
    await subscriber.connect();
    console.log(`[PdfCacheWorker] Subscribing to channel: ${CHANNEL}`);

    subscriber.subscribe(CHANNEL, (err, count) => {
      if (err) {
        console.error('[PdfCacheWorker] Subscribe error:', err.message);
        return;
      }
      console.log(`[PdfCacheWorker] Subscribed to ${count} channel(s)`);
    });

    subscriber.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;

      let payload;
      try {
        payload = JSON.parse(message);
      } catch {
        console.error('[PdfCacheWorker] Invalid JSON message:', message);
        return;
      }

      if (!payload.url || !payload.key) {
        console.warn('[PdfCacheWorker] Message missing "url" or "key":', message);
        return;
      }

      enqueue(payload);
    });

    subscriber.on('end', () => {
      if (!isShuttingDown) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.error(`[PdfCacheWorker] Max retries (${MAX_RETRIES}) exceeded. Exiting.`);
          process.exit(1);
        }
        const delay = Math.min(retries * 1000, 30000);
        console.log(
          `[PdfCacheWorker] Connection ended, restarting in ${delay}ms (retry ${retries}/${MAX_RETRIES})...`
        );
        setTimeout(() => start(), delay);
      }
    });
  } catch (err) {
    console.error('[PdfCacheWorker] Failed to start:', err.message);
    if (!isShuttingDown) {
      retries++;
      if (retries > MAX_RETRIES) {
        console.error(`[PdfCacheWorker] Max retries (${MAX_RETRIES}) exceeded. Exiting.`);
        process.exit(1);
      }
      const delay = Math.min(retries * 1000, 30000);
      setTimeout(() => start(), delay);
    }
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown (systemd SIGTERM / Ctrl-C SIGINT)
// ---------------------------------------------------------------------------

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[PdfCacheWorker] Received ${signal}, shutting down gracefully...`);

  if (sweepTimer) clearInterval(sweepTimer);

  if (subscriber) {
    try {
      await subscriber.unsubscribe(CHANNEL);
      subscriber.disconnect();
    } catch {
      // Ignore errors during shutdown
    }
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

console.log('[PdfCacheWorker] Starting Episciences PDF Cache Worker...');
console.log(`[PdfCacheWorker] Channel: ${CHANNEL}`);
console.log(`[PdfCacheWorker] Cache root: ${getCacheRootDir() || '(unresolved)'}`);
console.log(`[PdfCacheWorker] Concurrency: ${CONCURRENCY}, queue max: ${QUEUE_MAX}`);
console.log(`[PdfCacheWorker] Sentinels: ${sentinels.map(s => `${s.host}:${s.port}`).join(', ')}`);

startSweepLoop();

start().catch(err => {
  console.error('[PdfCacheWorker] Fatal error:', err.message);
  process.exit(1);
});
