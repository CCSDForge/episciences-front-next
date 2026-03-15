# Local Testing & Multi-Tenancy Guide

This guide explains how to simulate the production multi-tenant environment on your local machine.
The application uses a single Next.js instance to serve multiple journals based on the hostname.

## How it works

The application relies on **Middleware** (`src/middleware.ts`) to intercept requests:

1. It reads the **Hostname** from the request header.
2. It extracts the subdomain (e.g., `epijinfo` from `epijinfo.localhost`).
3. It maps this subdomain to a valid **Journal Code** (rvcode).
4. It rewrites the internal URL to `/sites/[journalId]/[lang]/...`.

---

## Method 1: Nginx in Docker + npm run dev (recommended)

This is the closest to production: Nginx handles multi-tenant routing and injects the same
security headers (CSP, `X-Frame-Options`, etc.) as the production server,
while `npm run dev` provides hot-reload.

### Setup

1. Add the required `/etc/hosts` entries (one-time):

   ```text
   127.0.0.1  epijinfo.episciences.test
   127.0.0.1  dmtcs.episciences.test
   ```

   Or run `make hosts` to see the entries for the current `JOURNALS` variable.

2. Start the dev server and the Nginx container:

   ```bash
   # Terminal 1
   npm run dev

   # Terminal 2
   make dev-nginx
   ```

3. Access `http://epijinfo.episciences.test:8080`.

### Useful commands

| Command | Description |
|---|---|
| `make dev-nginx` | Start Nginx (builds image if needed) |
| `make dev-nginx-down` | Stop Nginx |
| `make dev-nginx-logs` | Stream Nginx access/error logs |
| `make dev-nginx-rebuild` | Rebuild Nginx image (after template changes) |

See [Nginx Integration](NGINX_INTEGRATION.md) for full details on the Docker setup.

---

## Method 2: Subdomains with npm run dev (simple)

No Docker required. The middleware detects the journal from the subdomain.

Most systems resolve `*.localhost` automatically to `127.0.0.1`. Try directly:

- `http://epijinfo.localhost:8080`
- `http://jds.localhost:8080`
- `http://lmcs.localhost:8080`

If automatic resolution does not work, add entries to `/etc/hosts`:

```text
127.0.0.1  epijinfo.localhost
127.0.0.1  jds.localhost
127.0.0.1  lmcs.localhost
127.0.0.1  arima.localhost
```

**Note:** This method skips Nginx, so production security headers (CSP, etc.) are not applied.

---

## Method 3: Environment Variable (single journal, no hosts file)

Force a specific journal by setting `NEXT_PUBLIC_JOURNAL_RVCODE` in `.env.local`:

```env
NEXT_PUBLIC_JOURNAL_RVCODE=epijinfo
```

Then access `http://localhost:8080`. This bypasses middleware detection.
Remember to remove this override when testing other journals.

---

## Journal Configuration & External Assets

Each journal can have its own configuration (API URL, feature flags, colors, etc.)
loaded from `external-assets/`.

### Configuration file

Create `external-assets/.env.local.<journal-code>`:

```env
NEXT_PUBLIC_API_ROOT_ENDPOINT=https://api-preprod.episciences.org/api
NEXT_PUBLIC_JOURNAL_RVCODE=epijinfo
NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR=#49737e
```

### Logos

Journal logos are loaded from `public/logos/`.
The file must be named `logo-<journal-code>.svg` (e.g., `logo-epijinfo.svg`).

---

## Common Issues

### CORS errors when testing multiple journals

**Server-side (no issues):** Each request loads `external-assets/.env.local.<journalCode>` independently.

**Client-side (potential CORS):** Client components fetch directly from the browser.

- If the API sends `Access-Control-Allow-Origin: *`, everything works.
- If not, use the built-in proxy to bypass CORS:

  ```env
  # .env.local
  NEXT_PUBLIC_API_URL_FORCE=/api-proxy
  API_PROXY_TARGET=http://127.0.0.1:8000/api
  ```

  Then restart `npm run dev`. All journals will route API calls through the local proxy.

### "Journal not found" (404 or generic error)

- Check that the subdomain exactly matches a known journal code (rvcode).
- Verify the journal exists in the API or in `src/config/`.
- Ensure `external-assets/.env.local.<journal-code>` exists.
