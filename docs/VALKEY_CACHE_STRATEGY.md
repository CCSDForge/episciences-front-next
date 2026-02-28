# Distributed Cache Strategy & Resilience (Valkey)

This document details the target architecture for managing ISR cache (Next.js) and sessions (Symfony) to ensure scalability, reliability, and data consistency across a multi-node cluster.

## 1. Technological Choice: Valkey

**Recommendation:** Use **Valkey** (open-source fork of Redis under the BSD license) instead of Redis.

- **Sustainability:** Guaranteed free license (unlike new Redis licenses).
- **Performance:** Native multi-threaded optimizations.
- **Compatibility:** Transparent "drop-in replacement" for all Node.js (`ioredis`) and PHP libraries.

---

## 2. High Availability (HA) Architecture

To prevent the cache from being a Single Point of Failure (SPOF), the recommended configuration relies on **Valkey Sentinel** with 3 Debian VMs.

### Role Distribution

- **3 Debian VMs** each running a Valkey instance + a Sentinel process.
- **Master/Replica:** One Master node (read/write) and two Replicas (read-only with automatic failover).
- **Quorum:** The 3-node vote ensures that if a VM restarts, the cluster remains operational and elects a new Master within seconds.

---

## 3. Next.js Integration (Cache Handler)

Instead of the local file-based cache (problematic on restart), Next.js uses a custom `CacheHandler` pointing to the Valkey cluster.

### Advantages:

- **Immediate Consistency:** A node that restarts instantly accesses the up-to-date cache created by other nodes.
- **Broadcast Removal:** No more need for HTTP calls between Next.js servers (`PEER_SERVERS`).
- **Persistence:** The cache survives deployments and application service restarts.

---

## 4. Resilience and Survival During API Downtime

The architecture preserves and strengthens Next.js's "Stale-While-Revalidate" behavior:

1. A user requests an expired page.
2. Next.js serves the **Stale** version (obsolete but valid) from Valkey.
3. Next.js attempts to regenerate the page via the Episciences API in the background.
4. **If the API is unavailable:** Next.js fails the regeneration but **keeps the Stale version** in Valkey. The user never sees a 500 error.

---

## 5. Sharing with Symfony (Sessions & Invalidation)

The Valkey cluster is shared to simplify the infrastructure.

### Security and Segmentation:

- **ACLs:** Separate users for Next.js and Symfony with different passwords.
- **Prefixing:**
    - `next:*` for Next.js rendering cache.
    - `sess:*` for Symfony PHP sessions.
- **Network Security:** Access limited to internal application server IPs via firewall (port 6379).

---

## 6. Secure Re-validation System (Pub/Sub)

To invalidate the cache without coupling Symfony to Next.js's internal structure, we use the **Pub/Sub** pattern.

### The Flow:

1. **Symfony** publishes a message: `PUBLISH revalidate-cache {"tag": "article-4256"}`.
2. **A Node.js Worker** (managed by `systemd`) listens to this channel on each Next.js VM.
3. The Worker calls the local API `localhost:3000/api/revalidate`.
4. **Next.js** executes the official re-validation, ensuring resilience management (do not delete if the API is down).

---

## 7. Implementation Plan (Summary)

1. **Infrastructure:** Deployment of Valkey + Sentinel on 3 Debian VMs.
2. **Next.js:** Implementation of `src/lib/cache-handler.js` using `ioredis`.
3. **Worker:** Installation of the `revalidate-worker.js` script as a systemd service.
4. **Symfony:** Configuration of the session `handler_id` to Valkey and dispatching messages via Pub/Sub during back-office modifications.
5. **Cleanup:** Removal of the `PEER_SERVERS` logic in the Next.js re-validation API.
