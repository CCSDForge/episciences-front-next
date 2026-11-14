# PDF Disk Cache Strategy

A shared-NFS disk cache for the PDFs proxied by `src/app/api/pdf-proxy/route.ts`
(arXiv, Zenodo, HAL, Software Heritage — see `isAllowedPdfDomain()` in
`src/utils/pdf.ts`). Disabled by default (`PDF_CACHE_ENABLED=false`); every
piece of this feature is inert until that flag is turned on.

## Table of Contents

1. [Why](#1-why)
2. [Architecture](#2-architecture)
3. [Cache key and on-disk layout](#3-cache-key-and-on-disk-layout)
4. [Read path (the route)](#4-read-path-the-route)
5. [Write path (the worker)](#5-write-path-the-worker)
6. [Retention, eviction, disk-space guard](#6-retention-eviction-disk-space-guard)
7. [Invalidation](#7-invalidation)
8. [Environment variables](#8-environment-variables)
9. [Failure modes](#9-failure-modes)
10. [Production rollout](#10-production-rollout)
11. [Verification & troubleshooting](#11-verification--troubleshooting)
12. [Non-goals / explicitly out of scope](#12-non-goals--explicitly-out-of-scope)

---

## 1. Why

Two independent motivations, in order of how much this design actually buys:

1. **Resilience** — serve a cached copy if the upstream (arXiv, Zenodo, HAL,
   Software Heritage) is down, slow, or rate-limiting us, instead of a hard
   error. This is the reliable win: `PDF_CACHE_MODE=fallback` delivers 100% of
   it for a small fraction of the complexity of the alternative mode.
2. **Latency** — avoid re-fetching the same PDF from upstream on every
   preview/download. This one comes with a caveat worth being explicit about
   before deciding whether to ever turn it on:

   The route already sends `Cache-Control: public, max-age=604800, immutable`
   (7 days). Browsers already cache the PDF client-side. This disk cache does
   **not** speed up a reader re-opening a PDF they already fetched — it only
   helps the *first* fetch of a given PDF by any new reader, and removes the
   redundant upstream round trip our own infrastructure would otherwise make
   for a popular PDF across many readers. Whether that is worth the added
   moving parts is exactly what `PDF_CACHE_MODE=fallback` (the default,
   resilience-only) vs. `systematic` (also-for-latency) lets you decide with
   real data — see [§10](#10-production-rollout).

## 2. Architecture

```
                     ┌─────────────────────────────────────────────┐
                     │   3 prod VMs (or 2 preprod), each behind     │
                     │   HAProxy, each running its own Nginx+Node   │
                     └───────────────┬───────────────────────────────┘
                                     │ GET /api/pdf-proxy?url=...
                                     ▼
                      ┌───────────────────────────┐
                      │  pdf-proxy route (reads    │  READ ONLY — never
                      │  only, src/lib/pdf-cache)  │  writes to the cache
                      └──────────┬───────┬─────────┘
                    cache hit    │       │ cache miss / stale / fallback
                    stream file  │       │ needed
                                 │       ▼
                                 │   upstream fetch (arXiv/Zenodo/HAL/SWH),
                                 │   streamed straight to the client exactly
                                 │   as before this feature existed
                                 │       │
                                 │       ▼
                                 │   PUBLISH pdf-cache-populate  (Valkey)
                                 │   deduplicated via SET NX EX first —
                                 │   without it, every request for a
                                 │   popular PDF would ask the worker to
                                 │   re-fetch it
                                 ▼
                      ┌───────────────────────────┐
                      │   shared NFS mount         │
                      │   /data/epi/${EPI_ENV}/    │
                      │   pdf-cache/{shard}/{key}  │
                      └──────────▲─────────────────┘
                                 │ atomic write (tmp + rename)
                                 │ THE ONLY WRITER
                      ┌───────────────────────────┐
                      │  pdf-cache-worker.mjs      │
                      │  (single instance, systemd)│
                      │  SUBSCRIBE pdf-cache-populate
                      └───────────────────────────┘
```

**The one idea that matters most**: every app instance (route handler) only
ever *reads* the cache and *asks* for it to be populated. A single, dedicated
background worker is the only process that ever writes to it. That single-
writer design is what eliminates concurrent-write races on the shared NFS
mount **by construction** — no file locking, no distributed lock on the
write path, nothing to get subtly wrong under concurrent load from 3–5 app
instances.

This mirrors the only prior art for a background worker in this repo,
`scripts/revalidate-worker.mjs` / `revalidate-worker.service` (see
[docs/DEPLOYMENT_VALKEY.md §6](DEPLOYMENT_VALKEY.md#6-revalidation-worker-systemd)):
same Valkey Sentinel pub/sub pattern, same systemd hardening
(`ProtectSystem=strict` + a narrow `ReadWritePaths`), same "duplicate the
client construction, don't import the app's code" reasoning (this script runs
standalone via `node scripts/pdf-cache-worker.mjs`, entirely outside the
Next.js build).

## 3. Cache key and on-disk layout

- **Key**: `sha256(pdfUrl)` as a 64-char hex string, computed on the *exact*
  URL string already validated by `isAllowedPdfDomain()` — no normalization.
  The route (`src/lib/pdf-cache.ts`) and the worker
  (`scripts/lib/pdf-cache-store.mjs`) each compute this independently and must
  always land on the same value for the same URL.
- **Sharding**: a **single level**, `{key[0:2]}/` — 256 directories. This is a
  deliberate departure from git's two-level object scheme: git shards two
  levels deep because it indexes millions of objects; this cache will hold at
  most a few hundred thousand PDFs over its lifetime. A two-level scheme would
  mean up to 65,536 directories, and the retention sweep (§6) would have to
  `readdir` every one of them over NFS — minutes of network round trips per
  pass for no benefit at this scale.
- **Paths**:
  ```
  ${PDF_CACHE_BASE_DIR}/${EPI_ENV}/${PDF_CACHE_ROOT}/{key[0:2]}/{key}.pdf
  ${PDF_CACHE_BASE_DIR}/${EPI_ENV}/${PDF_CACHE_ROOT}/{key[0:2]}/{key}.json
  ```
  `PDF_CACHE_BASE_DIR` (default `/data/epi`) mirrors the prefix Nginx already
  uses (`set $epi_data_root "/data/epi/${EPI_ENV}/$journal_code";` in
  `deployment/production/nginx-episciences.conf.template`). In production it
  stays at its default; the variable exists so local/CI testing can point the
  whole tree at e.g. `/tmp/pdf-cache-test` without ever touching the real NFS
  mount. `PDF_CACHE_ROOT` is only the **subdirectory name** under that root
  (default `pdf-cache`), not a path.
- **`EPI_ENV`** (`prod`/`preprod`) did not previously exist as a Node runtime
  variable — only as a shell variable for the Nginx template (`envsubst`). It
  is now a required Node env var for both the app and the worker, validated
  against `^[a-z0-9-]{2,20}$`. **If it's missing or invalid, the cache
  disables itself silently (fails closed) — it never guesses the
  environment.**
- **Sidecar** (`{key}.json`): `schemaVersion`, `sourceUrl`, `finalUrl` (after
  redirects), `key`, `fetchedAt` (ISO8601 — the only freshness signal),
  `byteLength`, `upstreamContentType`, `httpStatus`, `etag`/`lastModified` (if
  present, used for conditional revalidation), `host`. **No negative
  caching**: a failed populate leaves no sidecar behind, so it's just a plain
  miss on the next request — nothing to explicitly invalidate.
- **`schemaVersion`** exists so a reader that doesn't recognize it treats the
  entry as a miss rather than crashing — this is what makes a rolling
  deploy of the worker (or of a future schema change) safe.

## 4. Read path (the route)

`src/app/api/pdf-proxy/route.ts`, gated by `PDF_CACHE_ENABLED` (default
`false`, in which case the route behaves byte-for-byte like it did before
this feature — this is directly covered by the pre-existing test suite,
unmodified). `runtime = 'nodejs'` is set explicitly: the cache read touches
`fs` and the Valkey client, neither of which exist on the Edge runtime.

Every response carries an `X-Pdf-Cache` header — `HIT`, `STALE`, `MISS`,
`FALLBACK`, or `OFF` — **always present, not just in a debug mode**. This is
the only cheap way to measure the cache's real hit rate from Nginx/production
access logs (`$upstream_http_x_pdf_cache`) without instrumenting Node, and is
what the [rollout](#10-production-rollout) decision between `fallback` and
`systematic` is based on.

`PDF_CACHE_MODE` selects between two behaviors:

- **`fallback`** (default): today's behavior first — fetch upstream, stream
  it to the client. On success, a populate job is enqueued afterwards (see
  below). Only if the upstream fetch fails (non-2xx, disallowed redirect
  host, wrong content-type, timeout, network error) does the route consult
  the cache — with **no freshness check**, because an old cached copy beats a
  hard error — and serve it with `X-Pdf-Cache: FALLBACK`.

  Two upstream timeouts apply in every mode, cache enabled or not:
  - **10 seconds for the response headers** (all redirect hops included).
    When it expires, the cached copy is served if there is one, otherwise a
    `504`.
  - **10 seconds of inactivity while streaming the body**: the time allowed
    between two chunks from upstream, not a total duration, so a large PDF on
    a slow but steady link is not cut. The timer only runs while waiting for
    upstream, never while waiting for a slow client. The response has already
    started at that point, so no fallback is possible: the stream is aborted
    (the client sees an interrupted download) instead of hanging forever.
- **`systematic`**: the cache is consulted **first**. A fresh hit is streamed
  straight from disk (`HIT`). A stale hit (`fetchedAt` older than
  `PDF_CACHE_MAX_AGE_SECONDS`) is still served immediately
  (stale-while-revalidate) with a refresh enqueued in the background
  (`STALE`). A miss falls through to the exact same upstream fetch as
  `fallback` mode, and also enqueues a populate job on success (`MISS`).

  **Exception, URLs whose content can change**: an arXiv PDF URL without a
  version suffix (`/pdf/2101.00001`, `/pdf/math/0601001`) always serves the
  latest version. Episciences links versioned URLs (`.../2101.00001v2`), which
  never change, but if an unversioned one comes through, it is always handled
  like `fallback` mode, even in `systematic` mode (live fetch first, cache
  only on failure), and the worker never skips a `populate` for it, so its
  fallback copy is re-validated at most once per
  `PDF_CACHE_ENQUEUE_TTL_SECONDS`. The check is `isMutablePdfUrl()`, in
  `src/utils/pdf.ts` and `scripts/lib/allowed-pdf-domains.mjs` (parity-tested).

**Enqueuing** (`enqueuePopulateJob()` in `src/lib/pdf-cache.ts`) is
deduplicated *before* publishing, via a Valkey lock:

```
SET pdfcache:enq:{key} 1 EX <PDF_CACHE_ENQUEUE_TTL_SECONDS> NX
```

Only the instance that wins the lock publishes to `pdf-cache-populate`. This
is the single most important correctness property of the read path: without
it, `fallback` mode would ask the worker to re-fetch a popular PDF on *every*
request that serves it, doubling upstream traffic instead of reducing it. The
lock is shared across every app instance (it lives in Valkey, not in
process memory), so it catches the "troubled herd" case a per-process
in-memory guard cannot see.

The enqueue itself runs via `next/server`'s `after()` when a live request
scope is available (always true in production), so it never delays or can
ever fail the response; it falls back to firing immediately when `after()`
isn't usable (e.g. a unit test invoking the route handler directly) —
`enqueuePopulateJob()` never throws either way.

## 5. Write path (the worker)

`scripts/pdf-cache-worker.mjs` — the **only** process allowed to write to the
cache. A single instance, no replication: this is what removes the need for
any file locking on the NFS write path. If throughput ever demanded more than
one writer, the in-memory dedup `Set` described below would need to become a
distributed lock (`SET NX PX` + a Lua compare-and-delete), but nothing today
requires that.

Split into two testable library modules plus a thin entrypoint, unlike
`revalidate-worker.mjs` (which is intentionally not unit-tested):

- **`scripts/lib/pdf-cache-fetch.mjs`** — re-fetches and validates a PDF,
  independently of the message that requested it (a pub/sub message is not
  authenticated, so this is the real security boundary, not the publishing
  route):
  - domain allowlist re-checked (shared JSON config, see below) on the
    requested URL and on **every redirect hop, before that hop is requested**:
    redirects are followed manually (`redirect: 'manual'`, at most 5 hops,
    `https` only), because with the default `redirect: 'follow'` a whitelisted
    domain redirecting to an internal address would already have made the
    request by the time `response.url` could be checked. The route applies the
    same rule to its own upstream fetch;
  - `Accept-Encoding: identity` is sent so that `Content-Length` describes the
    bytes actually received (`fetch()` decodes gzip/br transparently). A
    `Content-Length` that is missing, malformed, or sent with a
    `Content-Encoding` is ignored rather than enforced;
  - a rejected body (bad status, content-type, magic bytes, size) is
    cancelled at once, so it does not keep its upstream socket open until the
    fetch timeout;
  - HTTP status and `Content-Type` validated the same way the route does;
  - the body must start with the PDF magic bytes (`%PDF-`) — checked as the
    stream flows, without buffering. The route's `Content-Type` check can be
    fooled by an upstream error page served with a misleading header (already
    a known arXiv/Zenodo behavior, documented in the route itself); the magic
    bytes can't be, and this is what stops a captcha/rate-limit page from
    poisoning the cache (an entry is kept until invalidated, see §6);
  - if the upstream declared a `Content-Length`, the actual bytes written
    must match it exactly — a connection cut mid-download must not produce a
    truncated file that later gets served as valid;
  - conditional revalidation (`If-None-Match` / `If-Modified-Since`) is sent
    when a **complete** entry (sidecar plus a `.pdf` of the recorded size)
    with an `etag`/`lastModified` already exists — a `304` just
    refreshes `fetchedAt` on the existing sidecar, so refreshing a
    still-current PDF costs one empty round trip instead of a full
    re-download. On PDFs this is the common case: published articles are
    quasi-immutable.
  - a `populate` job for an entry younger than `PDF_CACHE_MAX_AGE_SECONDS`
    is skipped without any upstream request. In `fallback` mode the route
    publishes `populate` after every successful live fetch (it never reads the
    cache there), so without this check a popular PDF would be re-downloaded
    each time the enqueue lock expires. `refresh` jobs always proceed.
- **`scripts/lib/pdf-cache-store.mjs`** — the actual disk I/O:
  - tmp+rename atomic write, temp file in the *same* directory as the final
    path (`{final}.tmp-{pid}-{uuid}`), so the rename is atomic on the same
    filesystem;
  - the `.json` sidecar is written **strictly after** the `.pdf` rename
    succeeds — this ordering is what makes "the sidecar exists" a reliable
    completeness marker for readers; a crash between the two renames leaves
    an orphaned `.pdf` with no sidecar, which self-heals as a plain miss
    (cleaned up by the sweep, §6);
  - a free-space guard (`hasEnoughFreeSpace()`, `PDF_CACHE_MIN_FREE_PERCENT`)
    refuses new writes when the NFS mount is running low — a shared mount
    filling up is a fleet-wide incident, not something this cache should be
    able to cause on its own; refusing just stops the cache from growing,
    reads are unaffected;
  - the incremental sweep (§6).
- **`scripts/pdf-cache-worker.mjs`** — the entrypoint: Valkey Sentinel
  subscriber (independently constructed, not imported from
  `src/lib/valkey-client.js`, same reasoning as `revalidate-worker.mjs`), a
  bounded in-memory job queue (`PDF_CACHE_QUEUE_MAX`, dropping — not
  buffering indefinitely — when full) with bounded concurrency
  (`PDF_CACHE_WORKER_CONCURRENCY`), and an in-memory `Set` of in-flight keys
  as a *second*, cheaper dedup barrier on top of the route's Valkey lock (it
  only matters for an intra-process burst faster than one job completes, or
  a lock TTL that expired mid-download — under normal operation the Valkey
  lock already prevents duplicate jobs from ever being published).

**Domain allowlist**: `src/config/allowed-pdf-domains.json` is the single
source of truth for the *list* of allowed domains, read independently by
`src/utils/pdf.ts` (the app, bundled) and `scripts/lib/allowed-pdf-domains.mjs`
(the worker, via `fs.readFileSync` at startup — it cannot import TypeScript
from `src/`). Only the *check logic* is duplicated, never the list itself:
letting the list itself drift between the route and the worker would be a
much easier way to introduce a security gap than a code duplication ever is.
A parity test (`scripts/lib/__tests__/allowed-pdf-domains.test.mjs`) asserts
both implementations agree on a shared sample of URLs.

## 6. Retention, eviction, disk-space guard

Published PDFs are quasi-immutable, so there is no proactive eviction on
write. All of the following happens **inside the same worker process** — no
separate systemd timer, so there is never a second writer:

- **Retention: off by default** (`PDF_CACHE_RETENTION_DAYS=0`). Published
  PDFs almost never change, a corrected PDF is handled by the explicit
  invalidation (§7), and age is a bad signal here: `fetchedAt` only moves on
  a successful fetch (or `304`), so an entry whose upstream has been down or
  returning errors for a long time keeps an old `fetchedAt`. Deleting by age
  would remove exactly the copy `fallback` mode exists to serve. Set a
  positive number of days to opt in (by `fetchedAt`, not last access:
  tracking last access would mean the *read* path writing to NFS on every
  hit, which this design avoids). The only real source of growth is dead
  entries (a PDF whose URL changed is never requested again under its old
  key); the disk-space guard below and the optional size cap bound it.
- **Incremental sweep**: processes a handful of shards
  (`SHARDS_PER_BATCH = 8`, out of 256) per tick, spread evenly across
  `PDF_CACHE_SWEEP_INTERVAL_HOURS`, rather than a single full-tree `readdir`
  that could take minutes on NFS and starve the job queue.
- **Orphan cleanup**: `.tmp-*` files older than an hour (crash mid-write),
  a `.pdf` with no matching `.json` (crash between the two renames), and a
  `.json` with no matching `.pdf` (an invalidation or eviction interleaved
  with a write) are removed opportunistically during the same sweep. Orphan
  `.pdf`/`.json` files get the same one-hour grace period as `.tmp-*` files,
  and their counterpart is re-checked right before deletion: a `.pdf` renamed
  into place a moment before its sidecar is a write in progress, not an
  orphan.
- **Global size cap**: once a full sweep cycle (all 256 shards) completes,
  every surviving entry has been seen exactly once in that cycle — which is
  what lets `PDF_CACHE_MAX_TOTAL_BYTES` (default `0` = unlimited) be enforced
  correctly with a true oldest-first eviction, down to 90% of the cap. A
  flat/sharded store with no separate size index couldn't otherwise do this
  cheaply outside of a full cycle.
- **Escape hatch**: `PDF_CACHE_SWEEP_ENABLED=false` disables all of the above
  (including the orphan cleanup, which is the part worth keeping),
  for operators who'd rather manage retention with an external
  `find -mtime +N -delete` (the flat/sharded layout is well suited to that).

Deletion order mirrors the write order: sidecar first, then `.pdf` — so a
reader never observes a sidecar pointing at an already-deleted file.

## 7. Invalidation

For the one case that needs an immediate, explicit invalidation — an editor
corrects a PDF after publication — `POST /api/revalidate` (already
authenticated via `x-episciences-token` / IP allowlist) accepts an optional
`pdfUrl` field:

```bash
curl -X POST https://your-journal.episciences.org/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-episciences-token: $REVALIDATION_SECRET" \
  -d '{"pdfUrl": "https://zenodo.org/record/123/files/paper.pdf"}'
```

The route recomputes `sha256(pdfUrl)` itself and never trusts a client-
supplied key. Every field of the request (`pdfUrl` must be a string on an
allowed domain, `path` must be valid) is validated **before** anything is
deleted, so a rejected request has no side effect. It then deletes the
sidecar then the `.pdf` (same ordering as the sweep), releases the Valkey
dedup lock for that key (so the next request re-enqueues a populate at once
instead of waiting for `PDF_CACHE_ENQUEUE_TTL_SECONDS`), and returns. This is the **one deliberate exception** to "app
instances never write to the NFS cache" — and it's narrow: delete-only,
already authenticated, and impossible to race the worker in a harmful way (a
delete racing a populate is, at worst, a self-healing miss on the next
request).

`pdfUrl` can be combined with `tag`/`path` in the same request, or sent alone.

**Caveat worth stating plainly**: the route's `Cache-Control: public,
max-age=604800, immutable` header means a reader whose browser already cached
the old PDF will keep seeing it for up to 7 days regardless of this
invalidation — only the *server-side* cache is cleared, and only new
requests benefit. This is a pre-existing property of the route (present
before this feature), not something introduced here.

## 8. Environment variables

**Where to set them: in the app's env file, and nowhere else.** In
deployment that is `.env.production.local` (preprod: `.env.preprod.local`),
which Ansible uploads to `shared/.env.local`, linked into every release. The
Next.js app reads it, and so does the worker: it runs from the release
directory (`WorkingDirectory` of `pdf-cache-worker.service`) and loads the
same files with the same loader, `@next/env` (`.env.production.local`,
`.env.local`, `.env.production`, `.env`, first match wins). The app and the
worker therefore always see the same values; the "Used by" column below is
informational only.

- **Set only what differs per environment**: `PDF_CACHE_ENABLED`,
  `PDF_CACHE_MODE`, `EPI_ENV`, plus the Valkey variables already there. Every
  other variable has a default in the code; set it only to change that
  default.
- **Never in the tracked `.env`**: it is shared by every environment, so
  `EPI_ENV` would be the same in prod and preprod and both would write into
  the same cache directory, and switching the cache on or off would need a
  commit.
- **`/etc/episciences/worker.env` is optional** for this worker. A variable
  set there (or anywhere in the process environment) overrides `.env.local`
  for the worker only, so keep `PDF_CACHE_*` and `EPI_ENV` out of it: an old
  value left there silently wins. At startup the worker logs which env files
  it loaded.
- **A change applies after a restart** of the app and of the worker. The
  deploy does both (see §10); a change made by hand on a server needs a
  manual restart of both.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `PDF_CACHE_ENABLED` | `false` | app | Master switch. Rollback is always "set this back to `false`". The worker does not read it: it processes whatever the app publishes. |
| `PDF_CACHE_MODE` | `fallback` | app | `fallback` (resilience only) or `systematic` (also latency) — see [§10](#10-production-rollout). |
| `EPI_ENV` | *(required)* | app + worker | `prod` / `preprod` / ...; `^[a-z0-9-]{2,20}$`. Missing/invalid ⇒ cache disables itself (app) / worker refuses to start. |
| `PDF_CACHE_BASE_DIR` | `/data/epi` | app + worker | Root prefix, mirrors Nginx's `$epi_data_root`. Override only for local/CI. |
| `PDF_CACHE_ROOT` | `pdf-cache` | app + worker | Subdirectory **name** under `${PDF_CACHE_BASE_DIR}/${EPI_ENV}/` — not a path. |
| `PDF_CACHE_MAX_AGE_SECONDS` | `15552000` (180d) | app + worker | Staleness threshold in `systematic` mode (app); a `populate` job for an entry younger than this is skipped (worker). |
| `PDF_CACHE_READ_TIMEOUT_MS` | `2000` | app | Per-operation timeout on cache reads (sidecar read, open, fstat). On timeout the request is a miss and cache reads are skipped for 30s. |
| `PDF_CACHE_ENQUEUE_TTL_SECONDS` | `3600` | app | TTL of the Valkey dedup lock before (re-)publishing a populate job. |
| `PDF_CACHE_CHANNEL` | `pdf-cache-populate` | app + worker | Valkey pub/sub channel, distinct from `revalidate-cache`. |
| `PDF_CACHE_RETENTION_DAYS` | `0` (off) | worker | Delete entries older than this many days, by `fetchedAt`. `0` = never. Off by default on purpose, see §6. |
| `PDF_CACHE_SWEEP_ENABLED` | `true` | worker | Set `false` to manage retention externally instead. |
| `PDF_CACHE_SWEEP_INTERVAL_HOURS` | `24` | worker | Time to sweep the whole 256-shard tree once. |
| `PDF_CACHE_MAX_BYTES` | `104857600` (100MB) | worker | Per-file cap. |
| `PDF_CACHE_MAX_TOTAL_BYTES` | `0` (unlimited) | worker | Cache-wide cap, enforced once per full sweep cycle. |
| `PDF_CACHE_MIN_FREE_PERCENT` | `10` | worker | Refuse new writes below this free space % on the cache filesystem. |
| `PDF_CACHE_FETCH_TIMEOUT_MS` | `20000` | worker | Wait for the upstream response headers (all redirect hops). |
| `PDF_CACHE_BODY_IDLE_TIMEOUT_MS` | `20000` | worker | Longest wait between two body chunks. Only runs while waiting for upstream, not while the NFS write applies backpressure. |
| `PDF_CACHE_FETCH_MAX_DURATION_MS` | `600000` (10 min) | worker | Cap on a whole download, so an upstream trickling data cannot hold a worker slot forever. |
| `PDF_CACHE_WORKER_CONCURRENCY` | `4` | worker | Max jobs in flight at once. |
| `PDF_CACHE_QUEUE_MAX` | `500` | worker | Bounded in-memory queue; extra jobs are dropped (logged), not buffered. |

`VALKEY_ENABLED`, `VALKEY_SENTINEL_HOSTS`, and the other existing Valkey
variables (see [docs/DEPLOYMENT_VALKEY.md §3](DEPLOYMENT_VALKEY.md#3-environment-variables-reference))
are reused as-is — this feature adds no new Valkey infrastructure, only a new
channel on the existing cluster.

## 9. Failure modes

| Situation | Behavior |
|---|---|
| `PDF_CACHE_ENABLED=true` but `VALKEY_ENABLED` isn't | **Deployment precondition, not a silent degradation** — logged once at first enqueue attempt. Valkey is the *only* channel between the reader (route) and the writer (worker); without it, the cache can never be populated and every request behaves as a permanent miss, falling back to the live fetch — reads are never broken, the cache just never fills. |
| Valkey down (transient) | Enqueue fails silently (caught); the `SET NX` also fails, so nothing gets published either. Response is never affected. |
| NFS unreachable for reads (route) | Every fs error is treated as a miss; falls back to the live fetch. A read slower than `PDF_CACHE_READ_TIMEOUT_MS` is also a miss, and cache reads are then skipped for 30s. |
| NFS unreachable for writes (worker) | Job lost, logged; retried naturally on the next request for that URL once the dedup lock (§4) expires. |
| NFS filling up | The free-space guard (§5) stops new writes; reads are unaffected. |
| Worker down | Pub/sub has no replay — messages published while it's down are lost, accepted as such (no persistent queue). Real traffic re-enqueues naturally once the worker is back; the user-facing path never depended on the worker being up. |
| A cache entry gets poisoned (HTML page cached as a PDF) | Prevented by the magic-byte check (§5); if it ever happens anyway, the manual invalidation in §7 is the fix. |
| NFS mount hangs (not erroring, just unresponsive) | The route stops waiting after `PDF_CACHE_READ_TIMEOUT_MS` and skips cache reads for 30s, so requests keep being served live. That only bounds the damage: the blocked fs call itself still holds one of libuv's threadpool threads (4 by default, shared with DNS and crypto) until the kernel gives up. **Mount the cache path `soft`** (e.g. `soft,timeo=50,retrans=2`) on every host that reads it, so that call fails instead of hanging forever. With the default `hard` mount a long NFS outage can still freeze the process. |
| Cross-VM visibility lag | NFS attribute caching (`acregmax`, typically 30–60s) can make a file the worker just wrote briefly invisible from another VM. This is just an extra miss, not a bug — don't conclude "the cache doesn't work" from one immediate cross-VM check during testing, and don't mount `noac` to "fix" it. |

## 10. Production rollout

Each phase is reversible by flipping a single variable back.

| Phase | Scope | Config | Go/no-go criterion |
|---|---|---|---|
| **0** | Code merged, nothing active | `PDF_CACHE_ENABLED=false` everywhere (already the default) | Test suite green, `make sonar` clean. |
| **1** | Preprod, worker installed | Install `pdf-cache-worker.service` on the designated preprod host (§11). `PDF_CACHE_ENABLED=true`, `PDF_CACHE_MODE=fallback`. | The cache visibly populates (`ls` under `PDF_CACHE_BASE_DIR`); no change in `/api/pdf-proxy`'s error rate; disk usage stays within what was agreed with ops. |
| **2** | Prod, `fallback` mode | Same install on the designated prod host, on all 3 prod VMs' app config. | One week with no incident; `X-Pdf-Cache` observable in Nginx/production logs. |
| **3** | Prod, `systematic` mode | Flip `PDF_CACHE_MODE=systematic` | **Only if** the hit rate measured in phase 2 (`(HIT+STALE) / total`, from `X-Pdf-Cache`) exceeds ~30% — otherwise `fallback` alone already captures the reliable win (§1) and `systematic` isn't worth its extra moving part. |
| **4** *(optional, separate from this feature's initial scope)* | `X-Accel-Redirect` delivery via Nginx instead of streaming through Node | Requires an `internal;` Nginx `location` pointing at the cache dir — not part of this rollout; revisit only if Node CPU/latency from streaming cache hits becomes a measured problem. | Compare Node CPU/latency before/after on a canary VM. |

**Rollback, at any phase**: set `PDF_CACHE_ENABLED=false` and restart the app
— this returns to the exact pre-feature behavior without touching the worker
or the NFS tree at all (the worker keeps running harmlessly with nothing
publishing to it; stopping `pdf-cache-worker.service` is optional cleanup,
not required for the rollback itself). **Verify this in phase 1**, not during
an actual incident.

**Installing the worker** (phases 1–2), on the model of the existing
revalidation worker (see
[docs/DEPLOYMENT_VALKEY.md §6](DEPLOYMENT_VALKEY.md#6-revalidation-worker-systemd)
for the sibling install this mirrors):

```bash
# Configuration: nothing to write on the worker host. The variables are set
# once in .env.production.local (see §8), which Ansible deploys to every VM;
# the worker reads it from /var/www/episciences-front-next/current/.env.local.
#
# If /etc/episciences/worker.env already exists (revalidation worker), check
# that it holds no PDF_CACHE_* or EPI_ENV line: it would override .env.local
# for this worker. This must print nothing:
grep -E '^(PDF_CACHE_|EPI_ENV)' /etc/episciences/worker.env

# Install the systemd unit
sudo cp /var/www/episciences-front-next/current/scripts/pdf-cache-worker.service \
  /etc/systemd/system/episciences-pdf-cache-worker.service

sudo systemctl daemon-reload
sudo systemctl enable episciences-pdf-cache-worker
sudo systemctl start episciences-pdf-cache-worker
```

**Restarts**: the last play of `deployment/ansible/deploy.yml` runs
`systemctl try-restart episciences-pdf-cache-worker` on every host, after the
app's rolling restart. It only acts where the unit is installed and running,
so the worker always runs the deployed release's code and `.env.local`; a
stopped worker stays stopped. It needs a sudoers rule on the worker host, see
[deployment/ansible/SETUP.md](../deployment/ansible/SETUP.md#pdf-cache-worker-host-sudoers-rule).
After a change made by hand on a server, restart it yourself:
`sudo systemctl restart episciences-pdf-cache-worker`.

Only **one host per environment** should run this worker — pick the same
designated host that already runs `revalidate-worker.service`, or a
different single host if operationally preferable; the important constraint
is exactly one instance per environment, not which VM it is. Then set
`PDF_CACHE_ENABLED`, `PDF_CACHE_MODE` and `EPI_ENV` in that environment's
`.env.production.local` / `.env.preprod.local` and deploy: Ansible ships it to
every app VM (all 3 prod / 2 preprod) and restarts the Next.js service; then
restart the worker.

Before enabling in an environment, confirm the designated worker host has
write access to `${PDF_CACHE_BASE_DIR}/${EPI_ENV}/${PDF_CACHE_ROOT}` on the
NFS mount, and that `systemd`'s `RequiresMountsFor=/data/epi` in
`pdf-cache-worker.service` matches where NFS is actually mounted on that host
(adjust the unit file if the mount point differs). On every app host, check
that the mount is `soft` with a short `timeo` (see §9, "NFS mount hangs").

## 11. Verification & troubleshooting

### Monitor

```bash
journalctl -u episciences-pdf-cache-worker -f
systemctl status episciences-pdf-cache-worker
```

### Manual end-to-end test (local, no NFS involved)

```bash
# Start Valkey locally (see docs/DEPLOYMENT_VALKEY.md §4)
docker compose -f docker-compose.valkey.yml up -d

export VALKEY_ENABLED=true
export PDF_CACHE_ENABLED=true
export EPI_ENV=test
export PDF_CACHE_BASE_DIR=/tmp/pdf-cache-test   # never point this at real NFS
# The worker also reads the repository's .env* files, like `next`; the
# exported variables above take precedence over them.

# Terminal 1
npm run dev

# Terminal 2
node scripts/pdf-cache-worker.mjs

# Terminal 3
curl -sD - "http://localhost:3000/api/pdf-proxy?url=https://arxiv.org/pdf/2301.00001" -o /tmp/a.pdf
# first call: X-Pdf-Cache: MISS (fallback mode) or MISS (systematic, cold)
ls -la /tmp/pdf-cache-test/test/pdf-cache/          # populated shortly after, by the worker

curl -sD - "http://localhost:3000/api/pdf-proxy?url=https://arxiv.org/pdf/2301.00001" -o /tmp/b.pdf
# with PDF_CACHE_MODE=systematic: X-Pdf-Cache: HIT
```

To exercise the resilience path (§1, the actual point of `fallback` mode),
block the upstream domain temporarily (e.g. a local `/etc/hosts` entry or a
firewall rule) after the first successful fetch, and confirm the second
request still succeeds with `X-Pdf-Cache: FALLBACK`.

### Common issues

| Symptom | Likely cause |
|---|---|
| `X-Pdf-Cache` always `OFF` | `PDF_CACHE_ENABLED` isn't `true` on the app instance actually serving the request. |
| Cache never populates, no worker errors | `VALKEY_ENABLED` is off, or the worker sees other Valkey or `PDF_CACHE_CHANNEL` values than the app because of an override in `/etc/episciences/worker.env` (§8). Check for the one-time "PDF_CACHE_ENABLED=true but no Valkey client" warning in the app logs. |
| Worker logs `EPI_ENV env var is required...` and exits | `EPI_ENV` missing or doesn't match `^[a-z0-9-]{2,20}$` in the `.env.local` of the release the worker runs from. The `Env files loaded from ...` line logged at startup shows what it read. |
| Worker still uses old settings or old code | It was not restarted: the last play of the deploy failed on the worker host (missing sudoers rule, see §10), or `.env.local` was edited by hand without a restart. |
| Worker logs `Free space below N%...` | Expected behavior of the disk-space guard (§5) — the cache stops growing; the NFS mount needs attention or `PDF_CACHE_MIN_FREE_PERCENT` needs revisiting, not the worker. |
| A file just written by the worker isn't visible yet from another VM | NFS attribute cache lag (§9) — not a bug, wait a few seconds. |

## 12. Non-goals / explicitly out of scope

- **HTTP `Range`/206 support.** The route doesn't do this today either; not
  introduced alongside the cache. (It would come for free if delivery ever
  moves to Nginx's `X-Accel-Redirect` — phase 4, §10 — since Nginx handles
  ranges natively; that's an argument for that phase, not a reason to add it
  here.)
- **Negative caching.** A failed populate leaves no sidecar; the next request
  is just a plain miss.
- **A persistent job queue.** Messages published while the worker is down are
  lost; real traffic re-triggers the enqueue once it's back.
- **Worker replication.** One instance, on purpose (§5).
- **Last-access tracking.** Would require the read path to write to NFS on
  every hit — exactly what this design avoids.
