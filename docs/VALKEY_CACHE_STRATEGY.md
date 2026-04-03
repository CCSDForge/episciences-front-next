# Distributed Cache Strategy & Resilience (Valkey)

This document covers the target architecture for the Next.js ISR cache using Valkey,
including HA setup, cache key isolation, and the Pub/Sub revalidation flow.

---

## 1. Why Valkey

**Valkey** is an open-source, BSD-licensed fork of Redis with native multi-threaded
optimisations. It is a drop-in replacement for all Node.js (`ioredis`) and PHP libraries.

---

## 2. High Availability Architecture

Three Debian VMs each run a Valkey node and a Sentinel process.

```
┌──────────────────────────────────────────────────────┐
│  VM1: Valkey Master + Sentinel                        │
│  VM2: Valkey Replica + Sentinel                       │
│  VM3: Valkey Replica + Sentinel                       │
│                                                       │
│  Quorum = 2 — cluster survives loss of 1 VM          │
└──────────────────────────────────────────────────────┘
```

Next.js connects via `ioredis` with Sentinel:

```env
VALKEY_SENTINEL_HOSTS=vm1:26379,vm2:26379,vm3:26379
VALKEY_MASTER_NAME=mymaster
```

---

## 3. Next.js Cache Handler

`src/lib/cache-handler.js` replaces the default file-based cache. It stores Data Cache
entries in Valkey, making the cache:

- **Shared** across all Next.js nodes (no per-node inconsistency)
- **Persistent** across deployments and process restarts
- **HA-ready** — the circuit breaker falls back to an in-memory LRU if Valkey is unavailable

Activate by setting `VALKEY_ENABLED=true` **at build time** (in your Ansistrano task
or Dockerfile `ENV`). The handler is wired into the Next.js config at build time and
must be present in the compiled output.

---

## 4. Cache Key Isolation

### Between Journals (Multi-Tenant)

Data Cache keys are derived from the full `fetch()` URL. Since every journal uses its
own API endpoint via `getJournalApiUrl(rvcode)`, keys are naturally isolated:

```
next:data:https://api.episciences.org/api/epijinfo/news/?page=1&...
next:data:https://api.episciences.org/api/jtam/news/?page=1&...
```

No collision is possible between journals — even when sharing the same Valkey cluster.

### Between Environments (Preprod / Prod)

If preprod and production share the same Valkey cluster, use distinct key prefixes:

```env
# .env.preprod.local
VALKEY_KEY_PREFIX="preprod:"

# .env.production.local
VALKEY_KEY_PREFIX="next:"
```

### Between Applications (Next.js / Symfony)

Symfony sessions use a separate prefix (`sess:*`). Access is controlled by Valkey ACLs:

| Application | Valkey user | Prefix |
|-------------|-------------|--------|
| Next.js | `nextjs-user` | `next:*` |
| Symfony (sessions) | `symfony-user` | `sess:*` |

ACL example:
```
# Valkey ACL (valkey.conf or ACL commands)
ACL SETUSER nextjs-user on >nextjs_password ~next:* +@all
ACL SETUSER symfony-user on >symfony_password ~sess:* +@all
```

---

## 5. Resilience: Stale-While-Revalidate

```
1. User requests page
2. Next.js finds stale entry in Valkey → serves it immediately (< 1 ms)
3. Background: Next.js calls the Episciences API to regenerate
4. If API is down: regeneration fails, Valkey entry kept → user never sees a 500
5. If API is up: fresh entry stored in Valkey, served on next request
```

The circuit breaker in `cache-handler.js` adds an additional safety layer:

| State | Behaviour |
|-------|-----------|
| CLOSED | Normal — all reads/writes go to Valkey |
| OPEN (after 5 consecutive errors) | Immediate fallback to in-memory LRU |
| HALF_OPEN (after 30 s) | One probe attempt to Valkey |

Configure thresholds with:
```env
VALKEY_CIRCUIT_BREAKER_THRESHOLD=5      # errors before opening
VALKEY_CIRCUIT_BREAKER_PROBE_INTERVAL=30 # seconds before probing
```

---

## 6. Revalidation via Pub/Sub

When Symfony cannot reach Next.js nodes directly, it publishes a message on the Valkey
channel `revalidate-cache`. A lightweight worker on each Next.js node subscribes and
forwards the message to the local API.

### Flow

```
Symfony (back-office)
  │
  │  PUBLISH revalidate-cache '{"journalId":"epijinfo","tag":"article-4256"}'
  ▼
Valkey (shared channel)
  │
  ├──▶ revalidate-worker @ Next.js Node 1 → POST localhost:3000/api/revalidate
  ├──▶ revalidate-worker @ Next.js Node 2 → POST localhost:3000/api/revalidate
  └──▶ revalidate-worker @ Next.js Node 3 → POST localhost:3000/api/revalidate
                                               │
                                               ▼
                                          revalidateTag("article-4256")
                                               │
                                               ▼
                                          Valkey: delete data:…article-4256… entries
```

All nodes invalidate the same Valkey Data Cache entry simultaneously — no per-node
coordination is needed.

### Pub/Sub Message Schema

```json
{
  "journalId": "epijinfo",
  "tag": "article-4256"
}
```

### PHP Example

```php
// Using Predis
$predis->publish('revalidate-cache', json_encode([
    'journalId' => 'epijinfo',
    'tag'       => 'article-4256',
]));
```

See the `scripts/revalidate-worker.mjs` file for the worker implementation, and
[Revalidation Guide](./REVALIDATION_GUIDE.md#5-server-side-setup-revalidate-worker-systemd)
for the systemd service setup.

---

## 7. Configurable Cache TTL

All fetch-level TTLs are configurable via environment variables (default: 3600 s / 1 hour).
See `.env.production.local.example` for the full list and
[ISR Strategy](./ISR_STRATEGY.md#cache-ttl-environment-variables) for the mapping
between variables and services.

---

## 8. Implementation Summary

| Component | File | Status |
|-----------|------|--------|
| Cache Handler | `src/lib/cache-handler.js` | Implemented |
| Valkey Client | `src/lib/valkey-client.js` | Implemented |
| Cache TTL utility | `src/utils/cache-ttl.ts` | Implemented |
| Revalidation API | `src/app/api/revalidate/route.ts` | Implemented |
| Pub/Sub Worker | `scripts/revalidate-worker.mjs` | Implemented |
| Docker Compose | `docker-compose.valkey.yml` | Available |
| Ansible / Ansistrano | — | Manual setup (see DEPLOYMENT_VALKEY.md) |

---

## Related Documentation

- [ISR Strategy](./ISR_STRATEGY.md) — Cache TTL config, tag hierarchy
- [Revalidation Guide](./REVALIDATION_GUIDE.md) — Tag reference, Symfony examples
- [Valkey Deployment](./DEPLOYMENT_VALKEY.md) — Infrastructure, Sentinel, systemd
