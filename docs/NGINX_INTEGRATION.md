# Nginx Integration Guide (Reverse Proxy)

This document explains how to integrate the Next.js application with Nginx in a production environment.

## Overview

Nginx acts as a **Reverse Proxy** and a Gateway, while Next.js handles the routing and business logic.

```mermaid
graph TD
    User[User Browser] -->|HTTP/443| Nginx[Nginx Web Server]
    subgraph Nginx Handling
        Nginx -->|Legacy Files (PDFs, Images)| NFS[Shared Storage /data/epi/...]
        Nginx -->|App Requests| NextJS[Next.js Server (Port 3000)]
    end
```

## Production Architecture

In a typical production setup (e.g., Episciences infrastructure):

1.  **HAProxy**: Handles SSL termination and forwards traffic to Nginx on port 80.
2.  **Nginx (The Gateway)**:
    - Validates the `Host` header via Regex.
    - Serves heavy static assets directly from NFS mounts.
    - Forwards all other requests to the Node.js process.
3.  **Next.js (Node.js)**:
    - **Multi-Tenancy**: The `middleware.ts` detects the `Host` header passed by Nginx to determine the current journal.

## Nginx Configuration

Unlike Apache, which uses macros, Nginx allows for a dynamic configuration using regular expressions in the `server_name` directive. This allows a single block to handle all journals.

### Example Configuration

```nginx
server {
    listen 80;

    # Strictly validate the journal code format
    server_name ~^(?<journal_code>[a-z0-9-]{2,50})\.episciences\.org$;

    # Trust HAProxy for real IP
    set_real_ip_from  172.16.0.0/12; # Adjust to your network
    real_ip_header    X-Forwarded-For;

    # Variables for paths
    set $environment "prod";
    set $epi_data_root "/data/epi/$environment/$journal_code";

    # Serve static assets directly from NFS (Bypass Node.js)
    location /volumes-full/ {
        alias $epi_data_root/public/volume-pdf/;
    }

    location /user/picture/ {
        alias /data/user_photo/$environment/uuid/;
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;

        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
    }
}
```

## Docker Testing Environment

The project includes a complete Docker setup to test the multi-tenant ISR architecture locally with Nginx.

### How to use

1.  **Build and Start**:

    ```bash
    make build
    make up
    ```

2.  **Configuration**:
    The Nginx container uses a template (`docker/nginx-config/episciences.conf.template`) and injects environment variables (`EPI_ENV`, `DOMAIN_SUFFIX`) at startup.

3.  **Local Access**:
    The Nginx Regex will match any subdomain ending in the configured `DOMAIN_SUFFIX`. Use `make hosts` to see which entries to add to your `/etc/hosts`.

## Comparison with Apache

| Feature               | Apache (Old)              | Nginx (New)                      |
| --------------------- | ------------------------- | -------------------------------- |
| **Multi-tenancy**     | Requires loops/macros     | Dynamic Regex (Zero Maintenance) |
| **Performance**       | Prefork/Event MPM         | Event-driven (Lighter)           |
| **Config Complexity** | High (Multiple VHosts)    | Low (Single Server block)        |
| **Hot Reload**        | Required for new journals | Automatic (Regex-based)          |
