# Logging

The application uses [Pino](https://getpino.io/) for structured, JSON-based server-side logging.

## Architecture

```
Node.js process
    │  pino → writes JSON lines to stdout
    ▼
systemd (journald)
    │  stores structured entries
    ▼
journalctl  ──or──  log aggregator (Loki, Datadog, …)
```

Every log line is a JSON object:

```json
{
  "level": 30,
  "time": 1748606123456,
  "pid": 12345,
  "hostname": "vm1.episciences.org",
  "env": "production",
  "module": "service",
  "service": "article",
  "msg": "Failed to fetch article",
  "error": { "message": "fetch failed" },
  "paperid": "42"
}
```

## Environments

| Environment | Level | Transport | Output |
|---|---|---|---|
| `development` | `debug` | pino-pretty | Colored text in terminal |
| `production` / `preprod` | `info` (default) | stdout | NDJSON → journald |
| `test` | `silent` (forced) | — | None (no mock needed) |

`LOG_LEVEL` env var overrides the default level at runtime.  
`CACHE_DEBUG=true` activates `debug` level only for the `cache-handler` module.

## Log levels

| Level | When to use |
|---|---|
| `trace` | Very fine-grained internals (rarely used) |
| `debug` | Routing decisions, cache HIT/MISS, fetch progress |
| `warn` | Recoverable errors, unexpected-but-handled states |
| `error` | Failures that affect a user request |
| `fatal` | Process-terminating errors |

## Loggers

| Export | Module binding | Used in |
|---|---|---|
| `logger` | — | Base logger (rarely imported directly) |
| `middlewareLogger` | `module: 'middleware'` | `src/middleware.ts` |
| `apiLogger` | `module: 'api'` | API routes (`/api/*`) |
| `serviceLogger` | `module: 'service'` | Services and utils (server-side) |
| `safeFetchLogger` | `module: 'safeFetch'` | `api-error-handler.ts` |

`logger.cjs` provides the same interface for CommonJS modules (`valkey-client.js`, `cache-handler.js`).

## How to add logging to a new server-side module

```typescript
import { serviceLogger } from '@/lib/logger';

const log = serviceLogger.child({ service: 'my-service' });

export async function fetchSomething(id: string) {
  try {
    const data = await fetch(`...`);
    return data;
  } catch (error) {
    log.error({ error, id }, 'Failed to fetch something');
    return null;
  }
}
```

**Important:** `@/lib/logger` is server-side only. Client bundles automatically receive
a no-op shim (`src/lib/logger.browser.ts`) via the webpack/Turbopack alias in `next.config.js`.
Never import `pino` directly in code that may run in the browser.

## Reading logs in production

**Real-time stream:**

```bash
journalctl -u episciences-next -f
```

**Pretty-print with jq:**

```bash
journalctl -u episciences-next -o cat -f | jq .
```

**Filter by level (warn and above only):**

```bash
# Pino level numbers: trace=10 debug=20 info=30 warn=40 error=50 fatal=60
journalctl -u episciences-next -o cat | jq 'select(.level >= 40)'
```

**Filter by journal/service:**

```bash
journalctl -u episciences-next -o cat | jq 'select(.service == "article")'
journalctl -u episciences-next -o cat | jq 'select(.module == "api")'
```

**Search for errors in the last hour:**

```bash
journalctl -u episciences-next --since "1 hour ago" -o cat | jq 'select(.level >= 50)'
```

## Adjusting log level without redeploying

Edit the systemd unit (`/etc/systemd/system/episciences-next.service`) or override file:

```ini
Environment=LOG_LEVEL=debug
```

Then reload without downtime:

```bash
systemctl daemon-reload && systemctl restart episciences-next
```

Valid values: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

To activate cache debug logs specifically:

```ini
Environment=CACHE_DEBUG=true
```

This enables `debug` level only on the `cache-handler` child logger, leaving other modules
at their configured level.
