/**
 * PDF disk cache - pub/sub job parsing & scheduling decisions (worker-side).
 *
 * Kept out of scripts/pdf-cache-worker.mjs (an entrypoint with top-level side
 * effects: env checks, Valkey connection, timers) so it can be unit-tested.
 */

import { isMutablePdfUrl } from './allowed-pdf-domains.mjs';

const REASONS = new Set(['populate', 'refresh']);

/**
 * Parses one pub/sub message into a job, or returns null. The channel is not
 * authenticated, so anything that is not a JSON object with string `url` and
 * `key` is rejected here, before it can reach a property access that would
 * throw inside the ioredis 'message' listener and crash the process. The
 * deeper checks (key = sha256(url), domain allowlist) stay in processJob().
 *
 * @param {string} message
 * @returns {{ url: string, key: string, reason: 'populate' | 'refresh' } | null}
 */
export function parsePopulateMessage(message) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { url, key, reason } = payload;
  if (typeof url !== 'string' || !url || typeof key !== 'string' || !key) return null;
  return { url, key, reason: REASONS.has(reason) ? reason : 'populate' };
}

/**
 * True when a 'populate' job can be skipped: the entry already exists and is
 * younger than the staleness threshold. The route publishes 'populate' after
 * every successful upstream fetch in fallback mode (it never reads the cache
 * there), so without this check a popular PDF would be re-downloaded each
 * time the enqueue lock expires. 'refresh' jobs, sent for an entry the route
 * found stale, always proceed, as does any job for a URL whose content can
 * change (unversioned arXiv): its fallback copy is then re-validated at most
 * once per enqueue-lock TTL, usually with a cheap conditional request.
 *
 * @param {{ reason: string, url?: string }} job
 * @param {{ fetchedAt?: string } | null} existingSidecar a complete entry's sidecar, or null
 * @param {number} maxAgeSeconds
 * @param {number} [now]
 */
export function shouldSkipPopulate(job, existingSidecar, maxAgeSeconds, now = Date.now()) {
  if (job.reason !== 'populate' || !existingSidecar) return false;
  if (typeof job.url === 'string' && isMutablePdfUrl(job.url)) return false;
  const fetchedAtMs = Date.parse(existingSidecar.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) return false;
  return now - fetchedAtMs < maxAgeSeconds * 1000;
}
