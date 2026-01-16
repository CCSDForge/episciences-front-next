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

## 🧪 Local Testing with Docker

The project includes a complete Docker setup to test the multi-tenant ISR architecture locally with Apache as reverse proxy.

### Quick Start

```bash
# 1. Build the application and Docker images
make build

# 2. Add entries to /etc/hosts (see output of make hosts)
sudo sh -c 'echo "127.0.0.1 epijinfo.episciences.test" >> /etc/hosts'
sudo sh -c 'echo "127.0.0.1 dmtcs.episciences.test" >> /etc/hosts'

# 3. Start containers
make up

# 4. Access the journals
# http://epijinfo.episciences.test:8080
# http://dmtcs.episciences.test:8080
```

### Available Commands

| Command        | Description                           |
| -------------- | ------------------------------------- |
| `make help`    | Show all available commands           |
| `make build`   | Build Next.js app and Docker images   |
| `make up`      | Start containers                      |
| `make down`    | Stop containers                       |
| `make logs`    | Show container logs                   |
| `make rebuild` | Rebuild and restart everything        |
| `make clean`   | Remove images and volumes             |
| `make hosts`   | Show /etc/hosts entries to add        |

### Testing Multiple Journals

You can test with different journals by setting the `JOURNALS` variable:

```bash
# Test with specific journals
make rebuild JOURNALS=epijinfo,dmtcs,jtcam

# Use a different port
make up PORT=9000
```

### Architecture

```
Browser (epijinfo.episciences.test:8080)
    ↓
Apache Container (port 80)
    ↓ ProxyPass
Next.js Container (port 3000)
    ↓ Middleware
/sites/epijinfo/en/...
```

### Files

| File                          | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `docker-compose.apache.yml`   | Docker Compose configuration               |
| `docker/Dockerfile`           | Next.js standalone build                   |
| `docker/Dockerfile.apache`    | Apache reverse proxy image                 |
| `docker/docker-entrypoint.sh` | Dynamic vhost generation                   |
| `docker/apache-config/`       | Apache configuration files                 |
| `Makefile`                    | Build and run commands                     |

## 🔍 Troubleshooting

| Issue                  | Cause                                          | Solution                                                                                               |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **502 Bad Gateway**    | Node.js server is down or unreachable.         | Check if Next.js container is running and port 3000 is exposed.                                        |
| **404 on Homepage**    | Middleware cannot detect the journal.          | Ensure `ProxyPreserveHost On` is enabled in Apache.                                                    |
| **PDFs returning 404** | Alias configuration is incorrect.              | Verify the `Alias` paths point to the correct mounted volumes.                                         |
| **Hydration Mismatch** | HTML generated by Server doesn't match Client. | Often caused by mismatched locales. Ensure Apache passes `Accept-Language` headers (default behavior). |
