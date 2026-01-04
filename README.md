# 🚀 Episciences Front Next.js

[![CI Tests](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml)
[![CodeQL](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.17.0-brightgreen)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18)](https://vitest.dev/)

## 📝 Description
Next.js 14 (App Router) version of Episciences front-end. This version is configured for **Node.js Server rendering with Incremental Static Regeneration (ISR)** and Multi-tenant Middleware support.

## 🛠 Technologies
- Next.js 14 (App Router)
- Node.js Server (Standalone)
- TypeScript
- SCSS / Tailwind CSS
- i18next for internationalization
- Middleware for multi-tenancy

## 🚦 Prerequisites
- Node.js >= 18.17.0
- npm >= 9.x.x

## 🏁 Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev

# Production build (Standalone Node.js)
npm run build

# Start production server
npm run start
```

## 🧪 Local Development & Multi-Tenancy

The application uses Middleware to handle multiple journals (tenants) from a single instance.

### Testing different journals locally

There are two ways to switch journals during development:

#### 1. Via Subdomains (Recommended)
The middleware detects the journal ID from the subdomain. To test `epijinfo`, `jds`, etc., you can use:
- `http://epijinfo.localhost:3000` (Works automatically in most modern browsers)
- Or update your `/etc/hosts` (Linux/macOS) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
  ```text
  127.0.0.1 epijinfo.localhost
  127.0.0.1 jds.localhost
  ```

#### 2. Via Environment Variable
Set the default journal ID in your `.env.local`:
```env
NEXT_PUBLIC_JOURNAL_RVCODE=epijinfo
```
When accessing `http://localhost:3000` directly, the middleware will fall back to this value.

## 📁 Project Structure
```
episciences-front-next/
├── src/
│   ├── app/           
│   │   ├── sites/     # Multi-tenant page routes ([journalId]/[lang])
│   │   └── api/       # API routes
│   ├── components/    # Reusable React components
│   ├── middleware.ts  # Multi-tenant routing logic
│   ├── hooks/         # Custom React hooks
│   ├── services/      # Services and API calls
│   ├── styles/        # Global styles and SCSS variables
│   ├── types/         # TypeScript types
│   └── utils/         # Utilities and helpers
├── public/            # Static assets
└── config/            # Configuration files
```

### 🔄 Multi-Tenant Architecture

This application uses a multi-tenant architecture where a single Next.js instance serves multiple journals.

- **Middleware**: `src/middleware.ts` intercepts requests and maps the hostname (e.g., `journal.episciences.org`) to a journal code (e.g., `journal`).
- **Dynamic Routing**: Internal rewrites map requests to `/sites/[journalId]/[lang]/...`.
- **CORS & API Proxy**: To avoid CORS issues when using subdomains (like `epijinfo.localhost`), all API requests should go through the local proxy `/api-proxy`. The `next.config.js` is configured to forward these to the pre-prod API.
- **Logos**: Logos are loaded dynamically from `/public/logos/logo-[journalCode]-[size].svg`. Make sure all journal logos are present in the `public/logos` folder.
- **Configurations**: Currently, journal-specific UI toggles (e.g., `NEXT_PUBLIC_JOURNAL_MENU_NEWS_RENDER`) are read from environment variables. In a full multi-tenant Node.js deployment, these should eventually be moved to a database or a dynamic configuration API, as `.env` files are global to the process.

## 🚀 Production Deployment

The project is built as a standalone Node.js application.

1. **Build**
```bash
npm run build
```
This creates a `.next/standalone` directory containing everything needed to run the server.

2. **Run**
```bash
node .next/standalone/server.js
```

### Docker
A `Dockerfile` is provided for containerized deployment.

```bash
docker build -t episciences-front .
docker run -p 3000:3000 episciences-front
```

## 🤝 Contributing
Please follow the code conventions and migration rules defined in the documentation files (`CLAUDE.md` / `GEMINI.md`).
 3. Use `git add <file>` specifically. NEVER use `git add .` or `git add -A`.