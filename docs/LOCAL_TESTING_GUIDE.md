# Local Testing & Multi-Tenancy Guide

This guide explains how to simulate the production multi-tenant environment on your local machine. The application uses a single Next.js instance to serve multiple journals based on the hostname (domain).

## 🌍 How it works

The application relies on **Middleware** (`src/middleware.ts`) to intercept requests:

1.  It reads the **Hostname** from the request header.
2.  It extracts the subdomain (e.g., `epijinfo` from `epijinfo.localhost`).
3.  It maps this subdomain to a valid **Journal Code** (rvcode).
4.  It rewrites the internal URL to `/sites/[journalId]/[lang]/...`.

## 🛠️ Method 1: Subdomains (Recommended)

The best way to test is to use subdomains that mimic production behavior. Most modern browsers and operating systems automatically resolve `*.localhost` to `127.0.0.1`.

### 1. Direct Access

Try accessing these URLs directly in your browser:

- [http://epijinfo.localhost:3000](http://epijinfo.localhost:3000)
- [http://jds.localhost:3000](http://jds.localhost:3000)
- [http://lmcs.localhost:3000](http://lmcs.localhost:3000)

### 2. Configuring `/etc/hosts` (If needed)

If automatic resolution doesn't work, or if you want to test specific custom domains, you need to edit your hosts file.

**Linux / macOS:**

1.  Open terminal.
2.  Run `sudo nano /etc/hosts`.
3.  Add the following lines:
    ```text
    127.0.0.1   epijinfo.localhost
    127.0.0.1   jds.localhost
    127.0.0.1   lmcs.localhost
    127.0.0.1   arima.localhost
    ```
4.  Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

## ⚙️ Method 2: Environment Variable (Fallback)

If you cannot edit your hosts file, or if you simply want to work on a single journal without dealing with subdomains, you can force a specific journal ID.

1.  Open or create `.env.local`.
2.  Set the `NEXT_PUBLIC_JOURNAL_RVCODE` variable:
    ```env
    # Forces the app to serve 'epijinfo' even on localhost:3000
    NEXT_PUBLIC_JOURNAL_RVCODE=epijinfo
    ```
3.  Restart the server (`npm run dev`).
4.  Access [http://localhost:3000](http://localhost:3000).

**Note:** This overrides the middleware detection logic. Remember to comment it out to test other journals.

## ⚙️ 3. Journal Configuration & External Assets

Each journal can have its own specific configuration (API URL, feature flags, etc.).
The application looks for these configurations in the `external-assets/` directory.

### Configuration File

To define specific environment variables for a journal (e.g., `dc`), create a file named `.env.local.dc` in `external-assets/`.

**File path:** `external-assets/.env.local.dc`

**Example Content:**

```env
# API Endpoint specific for this journal (optional)
NEXT_PUBLIC_API_ROOT_ENDPOINT=https://api-preprod.episciences.org/api

# Specific feature flags
NEXT_PUBLIC_SHOW_NEWS=true
```

### Logos

Journal logos are also loaded from `external-assets/logos/`.
Ensure the file `logo-dc.svg` exists if you are testing the `dc` journal.

## ⚠️ Common Issues

### 1. CORS Errors & Multiple APIs

When testing multiple journals simultaneously (e.g., `epijinfo.localhost` and `jds.localhost`), you might encounter CORS errors or connection issues.

**Server-Side (No Issues):**
The application reads `external-assets/.env.local.<journalCode>` for each request.

- `epijinfo` uses the URL defined in `.env.local.epijinfo`
- `jds` uses the URL defined in `.env.local.jds`
  This works automatically.

**Client-Side (CORS Risk):**
Client components (Search, Pagination) fetch data directly from the browser.

- **Scenario A (Recommended):** Your API (e.g., `api-preprod`) sends `Access-Control-Allow-Origin: *`. Everything works.
- **Scenario B (Local Backend):** If your local Symfony API does not allow `*.localhost`, requests will fail.
  - _Fix:_ Configure your local Apache/Nginx to allow your local domains.
  - _Workaround (Proxy):_ Use the built-in proxy to bypass CORS.
    1.  Open or create your `.env.local` file (this file is ignored by git).
    2.  Add the following variables:

        ```env
        # 1. Force ALL journals to use the local proxy (Relative URL handles subdomains correctly)
        NEXT_PUBLIC_API_URL_FORCE=/api-proxy

        # 2. Tell the proxy where to forward requests (Local Backend or Preprod)
        API_PROXY_TARGET=http://127.0.0.1:8000/api
        ```

    3.  Restart the server (`npm run dev`).

    **Result:**
    - `epijinfo.localhost` calls `/api-proxy` -> proxies to `127.0.0.1:8000`.
    - `jds.localhost` calls `/api-proxy` -> proxies to `127.0.0.1:8000`.
    - No need to touch `external-assets/`.

### 2. "Journal not found"

If you see a 404 or a generic error:

- Check that the subdomain exactly matches a known journal code (rvcode).
- Verify in `src/config/journals-generated.ts` (or the API response) that the journal exists.
