# Valkey Distributed Cache — Deployment Guide

This guide covers the complete deployment of the Valkey Sentinel cluster for the Episciences Next.js application in staging and production environments.

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Local Development (Docker)](#4-local-development-docker)
5. [Staging / Production (Debian VMs)](#5-staging--production-debian-vms)
6. [Revalidation Worker (systemd)](#6-revalidation-worker-systemd)
7. [Valkey ACL Configuration](#7-valkey-acl-configuration)
8. [Verification & Troubleshooting](#8-verification--troubleshooting)
9. [Circuit Breaker Behaviour](#9-circuit-breaker-behaviour)
10. [Migration from PEER_SERVERS](#10-migration-from-peer_servers)

---

## 1. Overview

The Valkey Sentinel cluster replaces the local file-based ISR cache and the `PEER_SERVERS` HTTP broadcast mechanism.

```
[Symfony] → PUBLISH revalidate-cache → [Valkey Pub/Sub]
                                              ↓
[Node Worker (systemd)] ← SUBSCRIBE ─────────┘
       ↓
POST /api/revalidate (localhost)
       ↓
[Next.js] → revalidateTag() → [Cache Handler] → DELETE from Valkey
                                                    ↓
                                              [Valkey Sentinel Cluster]
                                              (3 nodes + 3 sentinels)
                                                    ↑
[Next.js ISR] → get/set cache entries ─────────────┘
       ↑
[Fallback: in-memory LRU] ← Circuit Breaker (if Valkey down)
```

**Key properties:**
- Shared cache across all Next.js instances — no more cache inconsistency between VMs
- Cache survives deployments (stored in Valkey, not local disk)
- Stale-while-revalidate preserved — if the Episciences API is down, stale pages continue to be served
- Automatic failover via Sentinel (quorum = 2/3)

---

## 2. Prerequisites

| Component | Version |
|-----------|---------|
| Valkey | 8.0+ |
| Node.js | 22+ |
| ioredis | 5.4.0+ |
| Debian | 12 (Bookworm) |

---

## 3. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VALKEY_ENABLED` | Yes | `false` | Enable distributed cache (`true` in staging/prod) |
| `VALKEY_SENTINEL_HOSTS` | Yes* | — | Comma-separated `host:port` pairs for sentinels |
| `VALKEY_MASTER_NAME` | No | `mymaster` | Sentinel master group name |
| `VALKEY_PASSWORD` | No | — | Valkey node authentication password |
| `VALKEY_SENTINEL_PASSWORD` | No | — | Sentinel authentication password |
| `VALKEY_KEY_PREFIX` | No | `next:` | Key prefix for Next.js cache entries |
| `VALKEY_CIRCUIT_BREAKER_THRESHOLD` | No | `5` | Consecutive errors before circuit opens |
| `VALKEY_CIRCUIT_BREAKER_PROBE_INTERVAL` | No | `30` | Seconds before probing Valkey recovery |
| `REVALIDATION_SECRET` | Yes | — | Token for `/api/revalidate` calls from the worker |

*Required when `VALKEY_ENABLED=true`

---

## 4. Local Development (Docker)

### Start with Valkey cluster

```bash
docker compose -f docker-compose.yml -f docker-compose.valkey.yml up -d
```

The `docker-compose.valkey.yml` file adds:
- `valkey-node-1/2/3` — Valkey master + 2 replicas
- `sentinel-1/2/3` — Sentinel processes
- `revalidate-worker` — Node.js Pub/Sub worker

### Set required environment variables

Add to your `.env.local` (or `external-assets/.env.local.epijinfo`):

```env
VALKEY_ENABLED=true
VALKEY_SENTINEL_HOSTS=sentinel-1:26379,sentinel-2:26379,sentinel-3:26379
VALKEY_MASTER_NAME=mymaster
VALKEY_PASSWORD=           # leave empty for local dev
VALKEY_SENTINEL_PASSWORD=  # leave empty for local dev
REVALIDATION_SECRET=dev-secret-change-me
```

### Verify the cluster

```bash
# Check Valkey nodes
docker exec valkey-node-1 valkey-cli ping      # → PONG
docker exec valkey-node-1 valkey-cli info replication

# Check Sentinel
docker exec sentinel-1 valkey-cli -p 26379 sentinel masters

# Check cache keys (after loading a page)
docker exec valkey-node-1 valkey-cli keys "next:*"
```

### Test invalidation via Pub/Sub

```bash
# Publish a revalidation message (simulates Symfony)
docker exec valkey-node-1 valkey-cli PUBLISH revalidate-cache '{"tag":"articles"}'

# Watch worker logs
docker logs revalidate-worker -f
```

### Test circuit breaker (fallback)

```bash
# Stop all Valkey nodes
docker stop valkey-node-1 valkey-node-2 valkey-node-3

# Pages should still be served from in-memory fallback
curl -I http://epijinfo.episciences.test:8080/

# Restart Valkey — circuit breaker will re-close after probe interval
docker start valkey-node-1 valkey-node-2 valkey-node-3
```

---

## 5. Staging / Production (Debian VMs)

### Architecture

3 Debian VMs, each running:
- `valkey-server` (one master, two replicas)
- `valkey-sentinel`
- `node` (Next.js application)
- `revalidate-worker` (systemd service)

### Install Valkey

```bash
# On each VM
curl -fsSL https://packages.valkey.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/valkey-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/valkey-archive-keyring.gpg] https://packages.valkey.io/debian bookworm main" \
  | sudo tee /etc/apt/sources.list.d/valkey.list
sudo apt-get update && sudo apt-get install -y valkey
```

### Configure Valkey nodes

**`/etc/valkey/valkey.conf` on VM1 (master):**
```conf
bind 0.0.0.0
port 6379
requirepass YOUR_STRONG_PASSWORD
masterauth YOUR_STRONG_PASSWORD
# Persistence
save 900 1
save 300 10
appendonly yes
```

**`/etc/valkey/valkey.conf` on VM2 and VM3 (replicas):**
```conf
bind 0.0.0.0
port 6379
requirepass YOUR_STRONG_PASSWORD
masterauth YOUR_STRONG_PASSWORD
replicaof VM1_IP 6379
appendonly yes
```

### Configure Sentinel

**`/etc/valkey/sentinel.conf` on all 3 VMs:**
```conf
port 26379
sentinel resolve-hostnames yes
sentinel monitor mymaster VM1_IP 6379 2
sentinel auth-pass mymaster YOUR_STRONG_PASSWORD
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

### Enable and start services

```bash
sudo systemctl enable valkey valkey-sentinel
sudo systemctl start valkey valkey-sentinel
```

### Configure Next.js application

In `/etc/episciences/app.env` (loaded by your deploy script or systemd):

```env
VALKEY_ENABLED=true
VALKEY_SENTINEL_HOSTS=vm1-ip:26379,vm2-ip:26379,vm3-ip:26379
VALKEY_MASTER_NAME=mymaster
VALKEY_PASSWORD=YOUR_STRONG_PASSWORD
VALKEY_SENTINEL_PASSWORD=  # same as VALKEY_PASSWORD unless configured separately
VALKEY_KEY_PREFIX=next:
REVALIDATION_SECRET=YOUR_REVALIDATION_SECRET
```

---

## 6. Revalidation Worker (systemd)

The worker subscribes to the Valkey `revalidate-cache` channel and calls `/api/revalidate` when a message arrives.

### Install

```bash
# Create environment file (not world-readable)
sudo install -m 0640 -o root -g www-data /dev/null /etc/episciences/worker.env
sudo tee /etc/episciences/worker.env <<EOF
VALKEY_SENTINEL_HOSTS=vm1-ip:26379,vm2-ip:26379,vm3-ip:26379
VALKEY_MASTER_NAME=mymaster
VALKEY_PASSWORD=YOUR_STRONG_PASSWORD
REVALIDATION_SECRET=YOUR_REVALIDATION_SECRET
NEXT_APP_URL=http://localhost:3000
EOF

# Install systemd service
sudo cp /var/www/episciences-front-next/current/scripts/revalidate-worker.service \
  /etc/systemd/system/episciences-revalidate-worker.service

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable episciences-revalidate-worker
sudo systemctl start episciences-revalidate-worker
```

### Monitor

```bash
# View logs
journalctl -u episciences-revalidate-worker -f

# Status
systemctl status episciences-revalidate-worker
```

### Test end-to-end

```bash
# On the Symfony server (or any VM with Valkey access):
valkey-cli -h vm1-ip -a YOUR_STRONG_PASSWORD \
  PUBLISH revalidate-cache '{"tag":"article-4256"}'

# On the Next.js VM, check worker logs:
journalctl -u episciences-revalidate-worker -n 20
```

---

## 7. Valkey ACL Configuration

For production, use dedicated ACL users to limit permissions:

**`/etc/valkey/valkey.conf` — add ACL rules:**

```conf
# Disable default user
user default off

# Next.js cache handler: full access to next:* namespace
user nextjs on >NEXTJS_PASSWORD ~next:* +@read +@write +@generic +@string +@set -FLUSHALL -FLUSHDB

# Revalidation worker: subscribe/publish only
user worker on >WORKER_PASSWORD ~revalidate-* +subscribe +publish +ping

# Symfony sessions: full access to sess:* namespace
user symfony on >SYMFONY_PASSWORD ~sess:* +@read +@write +@generic +@string
```

Update environment variables accordingly:
- `VALKEY_PASSWORD=NEXTJS_PASSWORD` for Next.js
- Worker uses a separate password in `/etc/episciences/worker.env`

---

## 8. Verification & Troubleshooting

### Check if cache handler is active

```bash
# In Next.js startup logs, look for:
# [Valkey] Connected to master
# [Valkey] Client ready

# Or check env:
node -e "console.log(process.env.VALKEY_ENABLED)"
```

### Inspect cache keys

```bash
# List all Next.js cache keys
valkey-cli -a PASSWORD keys "next:data:*" | head -20

# Check a specific tag set
valkey-cli -a PASSWORD smembers "next:tags:articles"

# Count total cached pages
valkey-cli -a PASSWORD dbsize
```

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[Valkey] Connection error: ECONNREFUSED` | Valkey not running | Start `valkey` service |
| Circuit breaker opens immediately | Wrong password | Check `VALKEY_PASSWORD` |
| Pages served stale after revalidation | Worker not running | Check `episciences-revalidate-worker` service |
| `[Worker] REVALIDATION_SECRET env var is required` | Missing env | Add to `/etc/episciences/worker.env` |
| Sentinel failover not working | Quorum not reached | Ensure 2/3 sentinels are up |

### Sentinel failover test

```bash
# Kill the current master
sudo systemctl stop valkey   # on VM1

# Watch sentinel elect a new master (should take ~5s)
valkey-cli -p 26379 sentinel master mymaster

# Restore VM1 (becomes a replica now)
sudo systemctl start valkey
```

---

## 9. Circuit Breaker Behaviour

The cache handler implements a 3-state circuit breaker:

```
CLOSED → (5 consecutive errors) → OPEN → (30s probe interval) → HALF_OPEN
  ↑                                                                   |
  └──────────────── (successful probe) ──────────────────────────────┘
```

- **CLOSED**: All requests go to Valkey. Normal operation.
- **OPEN**: All requests use the in-memory LRU fallback. No Valkey calls.
- **HALF_OPEN**: One probe request allowed to test recovery.

Configure via env vars:
```env
VALKEY_CIRCUIT_BREAKER_THRESHOLD=5       # errors before OPEN
VALKEY_CIRCUIT_BREAKER_PROBE_INTERVAL=30  # seconds before probe
```

The in-memory LRU holds up to 500 entries. In the event of a prolonged Valkey outage, older entries are evicted (LRU policy).

---

## 10. Migration from PEER_SERVERS

The `PEER_SERVERS` mechanism (HTTP broadcast between Next.js instances) has been removed. The shared Valkey cache makes it unnecessary.

### Migration steps

1. **Deploy new code** with Valkey support.
2. **Enable Valkey** by setting `VALKEY_ENABLED=true`.
3. **Remove `PEER_SERVERS`** from all environment files and deployment configs.
4. **Verify** that pages are cached in Valkey (`valkey-cli keys "next:data:*"`).
5. **Test** that revalidation propagates correctly (using the Pub/Sub flow).

### Environment file diff

```diff
- PEER_SERVERS="http://vm2:3000,http://vm3:3000"
+ VALKEY_ENABLED=true
+ VALKEY_SENTINEL_HOSTS=vm1-ip:26379,vm2-ip:26379,vm3-ip:26379
```
