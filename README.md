# 🚀 Episciences Front Next.js

[![CI Tests](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/ci.yml)
[![CodeQL](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml/badge.svg)](https://github.com/CCSDForge/episciences-front-next/actions/workflows/codeql.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.17.0-brightgreen)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18)](https://vitest.dev/)

## 📝 Description
Next.js 14 (App Router) version of Episciences front-end. This version is configured for **Node.js Server rendering with Incremental Static Regeneration (ISR)** and Multi-tenant Middleware support.

## 🛠 Technologies
- Next.js 14/15 (App Router)
- Node.js Server (Standalone)
- TypeScript
- SCSS
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

# Run development server (Multi-tenant mode via localhost subdomains or paths)
npm run dev

# Production build (Standalone Node.js)
npm run build

# Start production server
npm run start
```

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

## 🔧 Available Scripts
- `npm run dev` : Start development server
- `npm run build` : Build for production (Standalone)
- `npm run start` : Run production version
- `npm run lint` : Run ESLint checks
- `npm run test` : Run tests in watch mode
- `npm run test:ui` : Run tests with UI interface
- `npm run test:run` : Run tests once (CI mode)
- `npm run test:coverage` : Run tests with coverage report

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

### Running Tests

```bash
# Run tests in watch mode
npm run test
```

## 🔄 Multi-Tenant Architecture

This application uses a multi-tenant architecture where a single Next.js instance serves multiple journals.

- **Middleware**: `src/middleware.ts` intercepts requests and maps the hostname (e.g., `journal.episciences.org`) to a journal code (e.g., `journal`).
- **Dynamic Routing**: The rewritten URL points to `/sites/[journalId]/[lang]/...`.
- **ISR**: Pages are cached and revalidated on demand or after a timeout, ensuring performance similar to static sites with the flexibility of a dynamic server.

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
Ensure `public` and `.next/static` are correctly copied if moving the standalone folder (automatically handled by the build process usually, but check Dockerfile).

### Docker
A `Dockerfile` is provided for containerized deployment.

```bash
docker build -t episciences-front .
docker run -p 3000:3000 episciences-front
```

## 🤝 Contributing
Please follow the code conventions and migration rules defined in the documentation files.
 