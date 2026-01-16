# Episciences Front Next.js

[![CI Tests](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml)
[![CodeQL](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18)](https://vitest.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

## Description

Episciences front-end application built with **Next.js 16**.
This project features a **Hybrid ISR (Incremental Static Regeneration)** architecture designed for high availability, SEO performance, and multi-tenancy.

It combines:

- **Static Generation (SSG)** for critical pages (Home, About).
- **Just-in-Time ISR** for 7000+ articles (generated on first visit, then cached).
- **On-Demand Revalidation** triggered by the Symfony Back-Office via Webhooks.

## Technologies

- **Next.js 16** (App Router, Turbopack)
- **Node.js** (Standalone Output)
- **TypeScript**
- **SCSS** for styling
- **Redux Toolkit** for state management
- **i18next** for internationalization
- **Vitest** for testing
- **better-react-mathjax** for math rendering
- **Middleware** for multi-tenancy

## Prerequisites

- Node.js >= 20.0.0
- npm >= 9.x.x

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server (port 8080)
npm run dev

# Run with Turbopack
npm run dev:turbo

# Production Build (Environment Aware)
# Build ONLY production journals (Fast)
BUILD_ENV=prod npm run build

# Build ONLY pre-production journals (epijinfo + *-preprod)
BUILD_ENV=preprod npm run build

# Start production server
npm run start
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 8080 |
| `npm run dev:turbo` | Start development server with Turbopack |
| `npm run build` | Production build (standalone Node.js) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI mode) |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Generate test coverage report |

## Testing

The project uses **Vitest** as the test runner with **@testing-library/react** for component testing.

```bash
# Run tests in watch mode
npm run test

# Run tests once (for CI)
npm run test:run

# Generate coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

Test configuration:
- **Environment:** happy-dom
- **Coverage:** v8 provider with text, JSON, HTML, and LCOV reports

## Architecture & Caching Strategy

### 1. Multi-Tenant ISR

The application serves ~40+ journals from a single codebase.
To maintain fast build times (< 5min) while serving thousands of articles:

- **Homepages & Static Pages**: Pre-rendered at build time (SSG) based on `BUILD_ENV`.
- **Articles, Volumes, Sections**: Rendered on first request (SSR), then cached indefinitely (ISR) until revalidated.
- **Fallback**: If the API is down, the Next.js cache serves the last known good version of the page.

### 2. On-Demand Revalidation (Webhooks)

Content updates in the Symfony Back-Office trigger a webhook to purge the Next.js cache.

- **Endpoint**: `POST /api/revalidate`
- **Payload**: `{ "tag": "article-123", "secret": "YOUR_SECRET" }`
- **Tags**:
  - `articles`: Invalidates all articles.
  - `article-[ID]`: Invalidates a specific article.
  - `volumes`, `news`, `pages`: Invalidates respective collections.

### 3. Build Environments (`BUILD_ENV`)

To avoid building unnecessary pages, use the `BUILD_ENV` variable:

- `BUILD_ENV=prod`: Builds all production journals.
- `BUILD_ENV=preprod`: Builds `epijinfo` and any journal code containing `-preprod`.

## Local Development

The application uses Middleware to handle multiple journals (tenants) from a single instance.

### Testing different journals locally

#### 1. Via Subdomains (Recommended)

The middleware detects the journal ID from the subdomain:

- `http://epijinfo.localhost:8080`
- `http://jds.localhost:8080`

Add to your hosts file if needed:

```text
127.0.0.1 epijinfo.localhost
127.0.0.1 jds.localhost
```

#### 2. Via Environment Variable

Set the default journal ID in your `.env.local`:

```env
NEXT_PUBLIC_JOURNAL_RVCODE=epijinfo
```

## Project Structure

```
episciences-front-next/
├── src/
│   ├── app/
│   │   ├── sites/       # Multi-tenant page routes ([journalId]/[lang])
│   │   └── api/         # API routes (including /revalidate)
│   ├── components/      # Reusable React components
│   ├── config/          # Configuration files
│   ├── hooks/           # React hooks
│   ├── middleware.ts    # Multi-tenant routing logic
│   ├── services/        # Data fetching with Cache Tags
│   ├── store/           # Redux store
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities (including journal-filter.ts)
├── external-assets/     # Environment files and logos per journal
└── docker/              # Docker configuration
```

## Configuration

The project uses a **Dynamic Runtime Configuration** system.

- **Multi-Tenancy**: A single build serves multiple journals with different colors and settings.
- **Performance**: Configurations are loaded from `external-assets/` and cached in memory.
- **Updates**: Changing a color or setting requires a **Server Restart** (not a Rebuild).

## CI/CD

The project uses GitHub Actions for continuous integration:

- **CI Tests** (`ci.yml`): Runs linting and tests on Node.js 18.x and 20.x
- **CodeQL** (`codeql.yml`): Security analysis on push to main and scheduled weekly scans

## Documentation

Additional documentation is available in the `docs/` folder:

### Architecture & Caching
- [ISR Strategy](docs/ISR_STRATEGY.md) - Detailed ISR configuration by page type
- [Revalidation Guide](docs/REVALIDATION_GUIDE.md) - On-demand revalidation API & webhooks

### Configuration & Development
- [Configuration Guide](docs/CONFIGURATION_GUIDE.md) - Dynamic runtime configuration
- [Local Testing Guide](docs/LOCAL_TESTING_GUIDE.md) - Local development setup with subdomains
- [Coding Standards](docs/CODING_STANDARDS.md) - Code conventions and best practices

### Deployment & Infrastructure
- [Apache Integration](docs/APACHE_INTEGRATION.md) - Reverse proxy setup and Docker testing

### Accessibility
- [Accessible Color System](docs/ACCESSIBLE_COLOR_SYSTEM.md) - WCAG-compliant color generation

## Production Deployment

The project is built as a standalone Node.js application.

### Build

```bash
# Choose your target environment
BUILD_ENV=prod npm run build
```

This creates a `.next/standalone` directory containing everything needed to run the server.

### Run

```bash
node .next/standalone/server.js
```

### Docker

A `Dockerfile` is provided in the `docker/` directory for containerized deployment.

```bash
docker build -f docker/Dockerfile -t episciences-front .
docker run -p 3000:3000 episciences-front
```

### Testing with Apache (Production-like)

To test the multi-tenant setup with Apache reverse proxy locally:

```bash
# Build and start containers
make build
make up

# Add hosts entries (see output)
make hosts

# Access journals
# http://epijinfo.episciences.test:8080
# http://dmtcs.episciences.test:8080
```

See [Apache Integration](docs/APACHE_INTEGRATION.md) for full documentation.

## Contributing

Please follow the code conventions and migration rules defined in the documentation files (`CLAUDE.md` / `GEMINI.md`).

**Important:** Use `git add <file>` specifically. Never use `git add .` or `git add -A`.
