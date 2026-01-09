# Apache Integration Guide (Reverse Proxy)

This document explains how to integrate the Next.js application with the Apache HTTP Server in a production environment.

## 🔄 Architecture Overview

Unlike the previous version (Static HTML Export), the application now runs as a **Node.js Server** (ISR/SSR).
Apache acts as a **Reverse Proxy** and a Gateway, while Next.js handles the routing and business logic.

```mermaid
graph LR
    User[User Browser] -->|HTTP/443| Apache[Apache Web Server]

    subgraph Apache Handling
        Apache -->|Legacy Files (PDFs, Images)| NFS[Shared Storage /data/epi/...]
        Apache -->|App Requests| NextJS[Next.js Server (Port 3000)]
    end

    subgraph Next.js Handling
        NextJS -->|Middleware| Routing[Multi-Tenant Routing]
        NextJS -->|SSR/ISR| Page[Page Rendering]
    end
```

## 🚀 Key Responsibilities

### 1. Apache (The Gateway)

- **SSL Termination**: Handles HTTPS certificates.
- **Legacy Assets**: Serves static files (PDFs of articles, volumes) directly from the filesystem (NFS mounts) via `Alias` directives. This avoids loading large binaries through Node.js.
- **Security**: Blocks sensitive file extensions (`.sql`, `.sh`, `.git`).
- **Proxying**: Forwards all other traffic to the Next.js container/process.

### 2. Next.js (The Application)

- **Multi-Tenancy**: The `middleware.ts` detects the `Host` header passed by Apache to determine the current journal.
- **Routing**: Handles localization (`/en/`, `/fr/`) and dynamic routes.
- **Caching**: Manages the ISR cache (Incremental Static Regeneration).

## 📝 Configuration Example (VirtualHost)

Here is the standard macro used for Episciences journals:

```apache
<Macro EpiHost $environment $journal-code>
<VirtualHost *:80>
    ServerName $journal-code.episciences.org

    # 1. CRITICAL: Preserve Host header for Next.js Middleware
    ProxyPreserveHost On

    # 2. Serve Legacy Assets directly (Performance)
    # These paths map to the NFS storage, bypassing Node.js
    Alias /public/documents/ "/data/epi/$environment/$journal-code/public/documents/"
    Alias /volumes-full/ "/data/epi/$environment/$journal-code/public/volume-pdf/"

    # Exclude these aliases from the Proxy
    ProxyPass /public/documents/ !
    ProxyPass /volumes-full/ !

    # 3. Reverse Proxy to Next.js
    # Assuming Next.js runs on port 3000 (e.g., http://localhost:3000 or http://app:3000)
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # 4. Security Headers
    <IfModule mod_headers.c>
        Header set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
    </IfModule>
</VirtualHost>
</Macro>
```

## ⚠️ Important Considerations

### ProxyPreserveHost

You **MUST** set `ProxyPreserveHost On`.
The Next.js Middleware uses the `Host` header (e.g., `epijinfo.episciences.org`) to identify the tenant. If this is off, Next.js will see `localhost:3000` and fail to resolve the journal configuration.

### Static Assets (Next.js)

Next.js serves its own static assets (JS bundles, CSS) via `/_next/static/`. The `ProxyPass /` directive correctly handles this. You do not need specific rules for `/_next/` unless you are offloading them to a CDN.

### Legacy URL Redirection

Historically, Apache handled redirects (e.g., `/browse/latest` -> `/articles`).

- **New approach**: These redirects are now handled **inside Next.js** (via `next.config.js` or Middleware) to keep the logic centralized.
- **Exception**: If you have specific rewrite rules that _must_ happen at the edge, place them before the `ProxyPass` directive.

## 🧪 Docker Testing

The project includes a `docker/` directory to simulate this architecture.

1.  **Build the app**:

    ```bash
    docker build -t episciences-next .
    ```

2.  **Run with Apache (Compose)**:
    Ensure you have a `docker-compose.yml` that links the `httpd` service to the `nextjs` service.
    - Apache Container: Maps port 80 -> 80.
    - Next.js Container: Exposes port 3000.
    - Apache config uses `ProxyPass / http://nextjs:3000/`.

## 🔍 Troubleshooting

| Issue                  | Cause                                          | Solution                                                                                               |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **502 Bad Gateway**    | Node.js server is down or unreachable.         | Check if Next.js container is running and port 3000 is exposed.                                        |
| **404 on Homepage**    | Middleware cannot detect the journal.          | Ensure `ProxyPreserveHost On` is enabled in Apache.                                                    |
| **PDFs returning 404** | Alias configuration is incorrect.              | Verify the `Alias` paths point to the correct mounted volumes.                                         |
| **Hydration Mismatch** | HTML generated by Server doesn't match Client. | Often caused by mismatched locales. Ensure Apache passes `Accept-Language` headers (default behavior). |
