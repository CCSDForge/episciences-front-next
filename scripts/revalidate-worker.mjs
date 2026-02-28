/**
 * Revalidation Worker — Valkey Pub/Sub → Next.js API
 *
 * Subscribes to the Valkey "revalidate-cache" channel.
 * When a message arrives (from Symfony or other publishers),
 * it calls POST /api/revalidate on the local Next.js server.
 *
 * Message format (JSON):
 *   { "tag": "article-4256" }          — invalidate by tag
 *   { "path": "/sites/epijinfo/en/" }  — invalidate by path
 *   { "tag": "...", "journalId": "..." } — journal-scoped invalidation
 *
 * Managed by systemd via revalidate-worker.service.
 *
 * Environment variables:
 *   VALKEY_SENTINEL_HOSTS   — comma-separated "host:port" pairs
 *   VALKEY_MASTER_NAME      — sentinel master group name (default: mymaster)
 *   VALKEY_PASSWORD         — Valkey auth password
 *   VALKEY_SENTINEL_PASSWORD — Sentinel auth password
 *   REVALIDATION_SECRET     — token sent to /api/revalidate
 *   NEXT_APP_URL            — Next.js base URL (default: http://localhost:3000)
 *   REVALIDATE_CHANNEL      — Pub/Sub channel (default: revalidate-cache)
 */

import { createClient } from 'ioredis';
import { Redis } from 'ioredis';

const CHANNEL = process.env.REVALIDATE_CHANNEL || 'revalidate-cache';
const NEXT_APP_URL = (process.env.NEXT_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;
const MAX_RETRIES = 10;

if (!REVALIDATION_SECRET) {
  console.error('[Worker] REVALIDATION_SECRET env var is required');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse sentinel hosts
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
  console.error('[Worker] VALKEY_SENTINEL_HOSTS env var is required (e.g. "sentinel-1:26379,sentinel-2:26379")');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Create subscriber client
// ---------------------------------------------------------------------------

function createSubscriberClient() {
  return new Redis({
    sentinels,
    name: process.env.VALKEY_MASTER_NAME || 'mymaster',
    password: process.env.VALKEY_PASSWORD || undefined,
    sentinelPassword: process.env.VALKEY_SENTINEL_PASSWORD || undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // subscriber clients must retry indefinitely
    connectTimeout: 5000,
    commandTimeout: 5000,
    retryStrategy(retries) {
      const delay = Math.min(retries * 500, 30000);
      console.log(`[Worker] Retrying connection in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  });
}

// ---------------------------------------------------------------------------
// Call Next.js revalidation API
// ---------------------------------------------------------------------------

async function callRevalidateApi(payload) {
  const url = `${NEXT_APP_URL}/api/revalidate`;
  const body = JSON.stringify(payload);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-episciences-token': REVALIDATION_SECRET,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Worker] Revalidation successful:', JSON.stringify(result));
        return;
      }

      const text = await response.text();
      console.warn(`[Worker] Revalidation API returned ${response.status}: ${text} (attempt ${attempt})`);
    } catch (err) {
      console.error(`[Worker] Failed to call revalidation API (attempt ${attempt}):`, err.message);
    }

    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  console.error('[Worker] All revalidation attempts failed for payload:', body);
}

// ---------------------------------------------------------------------------
// Main loop with reconnection
// ---------------------------------------------------------------------------

let subscriber = null;
let retries = 0;
let isShuttingDown = false;

async function start() {
  if (isShuttingDown) return;

  subscriber = createSubscriberClient();

  subscriber.on('error', err => {
    console.error('[Worker] Subscriber error:', err.message);
  });

  subscriber.on('connect', () => {
    console.log('[Worker] Connected to Valkey');
    retries = 0;
  });

  subscriber.on('reconnecting', delay => {
    console.log(`[Worker] Reconnecting in ${delay}ms...`);
  });

  try {
    await subscriber.connect();
    console.log(`[Worker] Subscribing to channel: ${CHANNEL}`);

    subscriber.subscribe(CHANNEL, (err, count) => {
      if (err) {
        console.error('[Worker] Subscribe error:', err.message);
        return;
      }
      console.log(`[Worker] Subscribed to ${count} channel(s)`);
    });

    subscriber.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;

      let payload;
      try {
        payload = JSON.parse(message);
      } catch (err) {
        console.error('[Worker] Invalid JSON message:', message);
        return;
      }

      if (!payload.tag && !payload.path) {
        console.warn('[Worker] Message missing "tag" or "path":', message);
        return;
      }

      console.log(`[Worker] Received revalidation request: ${message}`);
      callRevalidateApi(payload).catch(err => {
        console.error('[Worker] Unhandled error in callRevalidateApi:', err.message);
      });
    });

    // Keep process alive
    subscriber.on('end', () => {
      if (!isShuttingDown) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.error(`[Worker] Max retries (${MAX_RETRIES}) exceeded. Exiting.`);
          process.exit(1);
        }
        const delay = Math.min(retries * 1000, 30000);
        console.log(`[Worker] Connection ended, restarting in ${delay}ms (retry ${retries}/${MAX_RETRIES})...`);
        setTimeout(() => start(), delay);
      }
    });
  } catch (err) {
    console.error('[Worker] Failed to start:', err.message);
    if (!isShuttingDown) {
      retries++;
      if (retries > MAX_RETRIES) {
        console.error(`[Worker] Max retries (${MAX_RETRIES}) exceeded. Exiting.`);
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
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);

  if (subscriber) {
    try {
      await subscriber.unsubscribe(CHANNEL);
      subscriber.disconnect();
    } catch (err) {
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

console.log('[Worker] Starting Episciences Revalidation Worker...');
console.log(`[Worker] Target: ${NEXT_APP_URL}/api/revalidate`);
console.log(`[Worker] Channel: ${CHANNEL}`);
console.log(`[Worker] Sentinels: ${sentinels.map(s => `${s.host}:${s.port}`).join(', ')}`);

start().catch(err => {
  console.error('[Worker] Fatal error:', err.message);
  process.exit(1);
});
