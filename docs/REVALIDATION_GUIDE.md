# Revalidation & Webhook Guide

This document explains how to configure webhook security, which cache tag to use for each
content type, and how to call the revalidation endpoint from your Symfony application.
It also covers the Pub/Sub alternative and server-side systemd setup.

---

## 1. Security Configuration

Security is enforced at three levels. Variables must be defined in `.env.production.local`
(or the equivalent for your environment).

### A. IP Whitelist (Network Level)

Only the IP addresses listed here may call the webhook. Use your Symfony server's IP.

```env
# Comma-separated list
ALLOWED_IPS=10.0.1.5,10.0.1.6
```

If `ALLOWED_IPS` is empty, all IPs are allowed (not recommended in production).

### B. Per-Journal Tokens (Recommended)

Define a secret for each journal. The environment variable name follows the pattern
`REVALIDATION_TOKEN_<JOURNAL_CODE_UPPERCASE>` — hyphens become underscores.

```env
REVALIDATION_TOKEN_EPIJINFO=a_long_random_secret_for_epijinfo
REVALIDATION_TOKEN_JTAM=another_secret_for_jtam
REVALIDATION_TOKEN_JSEDI_PREPROD=yet_another_secret
```

Generate secrets with: `openssl rand -base64 32`

### C. Global Fallback Token

Used when no per-journal token matches.

```env
REVALIDATION_SECRET=global_fallback_secret
```

---

## 2. Webhook Endpoint

```
POST /api/revalidate
```

### Required Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-episciences-token` | The secret for the journal (or the global one) |

### Request Body

```json
{
  "journalId": "epijinfo",
  "tag": "<cache-tag>"
}
```

`journalId` is used to look up the correct token (`REVALIDATION_TOKEN_EPIJINFO`).

### Success Response

```json
{ "revalidated": true, "now": 1712150400000, "journalId": "epijinfo", "tag": "article-4256" }
```

### Rate Limiting

- Default: 100 requests / minute / IP
- Override with `REVALIDATE_RATE_LIMIT` and `REVALIDATE_RATE_WINDOW` (ms)

---

## 3. Complete Cache Tag Reference

Replace `{rvcode}` with the journal code (e.g. `epijinfo`) and `{id}` with the numeric
identifier.

> **Cross-page content** — Some data appears on multiple pages (e.g. board members on
> the home page and the Boards page, the About text on the About page and the home page,
> the Indexing text on the Indexing page and a home page section). The fetch calls in all
> these pages are tagged consistently, so **a single `revalidateTag` call invalidates
> the data everywhere it is displayed**.

---

### Articles

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| One article (title, abstract, DOI…) | `article-{id}` | Article detail, home, volume detail |
| All articles of a journal | `articles-{rvcode}` | Article list, home, accepted list |
| Accepted articles only | `articles-accepted-{rvcode}` | Accepted articles list |

---

### Volumes

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Volume metadata (title, description) | `volume-{id}` | Volume detail page |
| Article order changed inside a volume | `volume-{id}` | Volume detail page |
| New volume / volume list changed | `volumes-{rvcode}` | Volume list + home |

---

### Sections

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Section metadata (title, description) | `section-{id}-{rvcode}` | Section detail page |
| Article order changed in a section | `section-articles-{id}-{rvcode}` | Section article list |
| All sections of a journal | `sections-{rvcode}` | Sections list page |

---

### News

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| All news of a journal | `news-{rvcode}` | News list + home news block |

---

### Boards (Editorial / Scientific Committee)

The Boards page and the home page **share the same data source** for board members. A
single tag invalidates both.

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Board member list (roles, names, affiliations) | `members-{rvcode}` | Boards page + home members block |
| Everything on the Boards page (members + section structure) | `boards-{rvcode}` | Boards page + home members block |

`boards-{rvcode}` is the broadest tag: it covers both board section pages
(`fetchBoardPages`) and board member data (`fetchBoardMembers`).

---

### About Page

The About text appears on **two routes**: the dedicated `/about` page and a section of
the home page. Both are invalidated by the same tag.

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| About page content | `about-{rvcode}` | About page + home about section |

---

### Indexing Page

The "journal indexing" editorial page appears both on the standalone `/indexing` route
and as a section on the home page. Both are invalidated together.

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Indexing editorial content | `indexing-{rvcode}` | Indexing page + home indexing section |

> **Note:** `indexation-{rvcode}` is a **separate tag** for the journal metrics endpoint
> (`/journals/{rvcode}/indexation`) — different data, different page.

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Journal indexation metrics | `indexation-{rvcode}` | Indexation metrics page |

---

### Other Editorial Pages

Each of these pages has its own tag. They do **not** appear on the home page.

| Page | Tag |
|------|-----|
| Credits | `credits-{rvcode}` |
| For reviewers | `for-reviewers-{rvcode}` |
| For conference organisers | `for-conference-organisers-{rvcode}` |
| Proposing special issues | `proposing-special-issues-{rvcode}` |
| Acknowledgements | `acknowledgements-{rvcode}` |

---

### Statistics

| Scenario | Tag | Pages invalidated |
|----------|-----|-------------------|
| Journal statistics (homepage block) | `stats-{rvcode}` | Home stats block |
| Full statistics page | `statistics-{rvcode}` | Statistics page |

---

### Sitemap

| Scenario | Tag |
|----------|-----|
| Force sitemap regeneration | `sitemap-{rvcode}` |

The sitemap is also implicitly refreshed when `articles-{rvcode}` or `volumes-{rvcode}`
are invalidated, because it shares those data sources.

---

### Broad Invalidation (All Journals)

Omit the `{rvcode}` suffix to invalidate across **all** journals at once.
Use with caution in a multi-tenant setup.

| Tag | Invalidates |
|-----|-------------|
| `articles` | All articles, all journals |
| `volumes` | All volumes, all journals |
| `news` | All news, all journals |
| `sections` | All sections, all journals |
| `boards` | All board pages, all journals |

---

## 4. Symfony Examples

### 4.1 Direct HTTP Call (HttpClient)

```php
// src/Service/NextRevalidationService.php

use Symfony\Contracts\HttpClient\HttpClientInterface;

class NextRevalidationService
{
    public function __construct(
        private readonly HttpClientInterface $client,
        private readonly string $nextBaseUrl,   // e.g. https://epijinfo.episciences.org
        private readonly string $globalSecret,  // REVALIDATION_SECRET
    ) {}

    public function revalidate(string $journalId, string $tag): void
    {
        $token = $_ENV['REVALIDATION_TOKEN_' . strtoupper(str_replace('-', '_', $journalId))]
            ?? $this->globalSecret;

        $this->client->request('POST', $this->nextBaseUrl . '/api/revalidate', [
            'headers' => [
                'Content-Type'        => 'application/json',
                'x-episciences-token' => $token,
            ],
            'json' => [
                'journalId' => $journalId,
                'tag'       => $tag,
            ],
        ]);
    }
}
```

### 4.2 Common Use Cases

```php
// Article updated
$revalidation->revalidate('epijinfo', 'article-4256');

// Article published → also refresh the article list and home page
$revalidation->revalidate('epijinfo', 'article-4256');
$revalidation->revalidate('epijinfo', 'articles-epijinfo');

// Article order changed inside a volume
$revalidation->revalidate('epijinfo', 'volume-12');

// Article order changed inside a section
$revalidation->revalidate('epijinfo', 'section-articles-7-epijinfo');

// Section metadata changed (title, description)
$revalidation->revalidate('epijinfo', 'section-7-epijinfo');

// New volume published
$revalidation->revalidate('epijinfo', 'volume-42');
$revalidation->revalidate('epijinfo', 'volumes-epijinfo');

// About page content updated
$revalidation->revalidate('epijinfo', 'about-epijinfo');

// News added
$revalidation->revalidate('epijinfo', 'news-epijinfo');

// Editorial board updated
$revalidation->revalidate('epijinfo', 'members-epijinfo');
```

### 4.3 Async via Symfony Messenger (Recommended)

Avoid blocking the user by dispatching revalidation to a background queue.

```php
// src/Message/RevalidateCacheMessage.php
class RevalidateCacheMessage
{
    public function __construct(
        public readonly string $journalId,
        public readonly string $tag,
    ) {}
}

// src/MessageHandler/RevalidateCacheMessageHandler.php
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class RevalidateCacheMessageHandler
{
    public function __construct(
        private readonly NextRevalidationService $revalidation,
    ) {}

    public function __invoke(RevalidateCacheMessage $message): void
    {
        $this->revalidation->revalidate($message->journalId, $message->tag);
    }
}

// In your entity listener or event subscriber:
$this->bus->dispatch(new RevalidateCacheMessage('epijinfo', 'article-4256'));
```

Configure retries in `config/packages/messenger.yaml`:

```yaml
framework:
    messenger:
        failure_transport: failed
        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 5
                    delay: 1000
                    multiplier: 2
                    max_delay: 60000
        routing:
            'App\Message\RevalidateCacheMessage': async
```

### 4.4 Via Valkey Pub/Sub (Alternative)

If the Symfony server cannot reach the Next.js servers directly, publish a message on
the Valkey channel. The `revalidate-worker` running on each Next.js server will pick it
up and call the local API.

```php
// Using Predis or ioredis-compatible PHP client
$redis->publish('revalidate-cache', json_encode([
    'journalId' => 'epijinfo',
    'tag'       => 'article-4256',
]));
```

The message schema must match what `scripts/revalidate-worker.mjs` expects.
See section 5 below for the worker setup.

---

## 5. Server-Side Setup: revalidate-worker (systemd)

The worker listens to the Valkey Pub/Sub channel `revalidate-cache` and forwards
messages to the local Next.js API. Run one instance per Next.js node.

### Installation

```bash
# Copy the service file
sudo cp scripts/revalidate-worker.service /etc/systemd/system/

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable --now revalidate-worker.service

# Check status
sudo systemctl status revalidate-worker.service
sudo journalctl -u revalidate-worker.service -f
```

### Service Configuration (`/etc/systemd/system/revalidate-worker.service`)

```ini
[Unit]
Description=Episciences Next.js Revalidation Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/episciences-next/current
ExecStart=/usr/bin/node scripts/revalidate-worker.mjs
Restart=always
RestartSec=5

Environment=NODE_ENV=production
Environment=VALKEY_SENTINEL_HOSTS=sentinel-1:26379,sentinel-2:26379,sentinel-3:26379
Environment=VALKEY_MASTER_NAME=mymaster
Environment=VALKEY_PASSWORD=<secret>
Environment=REVALIDATION_SECRET=<global_secret>
Environment=NEXT_APP_URL=http://localhost:3000

[Install]
WantedBy=multi-user.target
```

> **Note for Ansistrano deployments:** `WorkingDirectory` should point to the symlinked
> `current/` directory. Restart the worker after each deployment:
> ```bash
> sudo systemctl restart revalidate-worker.service
> ```

### Verifying the Worker

```bash
# Publish a test message from any server with redis-cli
redis-cli -h sentinel-1 -p 26379
> SENTINEL get-master-addr-by-name mymaster
# Use the returned master host/port:
redis-cli -h <master-host> -p 6379 -a <password> \
  PUBLISH revalidate-cache '{"journalId":"epijinfo","tag":"news-epijinfo"}'
```

Then check `journalctl -u revalidate-worker.service` for the log line:
`[Worker] Revalidated tag: news-epijinfo for journal: epijinfo`

---

## 6. Webhook Deployment: Nginx / Apache Config

If Next.js runs behind a reverse proxy, ensure the revalidation endpoint is reachable
from your Symfony server but **not exposed publicly**.

### Nginx: Restrict `/api/revalidate` to Internal IPs

```nginx
location /api/revalidate {
    # Allow only Symfony server and monitoring
    allow 10.0.1.5;
    allow 10.0.1.6;
    deny all;

    proxy_pass http://nextjs_upstream;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
}
```

### Passing the Real IP to Next.js

The route handler reads `x-forwarded-for` or `x-real-ip` for IP whitelisting:

```nginx
proxy_set_header X-Real-IP       $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Set `ALLOWED_IPS` in your `.env` to the Symfony server's IP. The Next.js app will then
enforce the whitelist at the application level as a second layer of defence.

---

## 7. Configurable Cache TTL

Cache durations are controlled via environment variables (see `.env.production.local.example`).
All default to **3600 seconds (1 hour)** if not set.

| Variable | Content | Default |
|----------|---------|---------|
| `CACHE_TTL_NEWS` | News articles | 3600 |
| `CACHE_TTL_VOLUMES` | Volumes & issues | 3600 |
| `CACHE_TTL_ARTICLES` | Published articles | 3600 |
| `CACHE_TTL_PAGES` | Static editorial pages | 3600 |
| `CACHE_TTL_STATISTICS` | Journal statistics | 3600 |
| `CACHE_TTL_MEMBERS` | Editorial board | 3600 |
| `CACHE_TTL_SECTIONS` | Sections | 3600 |
| `CACHE_TTL_SITEMAP` | Sitemap data | 3600 |

Set to `false` to cache indefinitely (on-demand revalidation only):

```env
CACHE_TTL_ARTICLES=false   # Cache until revalidateTag('articles-epijinfo') is called
```

> **Note:** These TTLs control the **Data Cache** (fetch-level responses stored in Valkey).
> They are independent from the page-level `export const revalidate` which controls how
> often the HTML is regenerated (Full Route Cache).

---

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `403 Forbidden` | IP not in `ALLOWED_IPS` | Add server IP or leave `ALLOWED_IPS` empty |
| `401 Invalid secret` | Token mismatch | Check `REVALIDATION_TOKEN_*` or `REVALIDATION_SECRET` |
| `400 Missing tag or path` | Empty request body | Check JSON payload |
| `429 Too many requests` | Rate limit hit | Increase `REVALIDATE_RATE_LIMIT` or use Messenger |
| Cache not updating | Tag not used in fetch | Check `next: { tags: [...] }` in the service file |
| All journals invalidated | Using generic tag (`articles`) | Use journal-specific tag (`articles-epijinfo`) |

---

## Related Documentation

- [ISR Strategy](./ISR_STRATEGY.md)
- [Valkey Cache Strategy](./VALKEY_CACHE_STRATEGY.md)
- [Valkey Deployment](./DEPLOYMENT_VALKEY.md)
