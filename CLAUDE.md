# CLAUDE.md / GEMINI.md

Instructions for AI assistants working with this repository.

## Project Overview

Next.js 16 (React 19) multi-tenant application for Episciences academic journals (45+ journals).

- **Architecture**: Node.js server with ISR (Incremental Static Regeneration)
- **Routing**: Middleware maps hostnames to journal codes → `/sites/[journalId]/[lang]/...`
- **Rendering**: Server Components for data/SEO, Client Components for interactivity

## Essential Commands

```bash
npm run dev          # Development server (port 8080)
npm run dev:turbo    # Development server with Turbopack
npm run build        # Production build
npm run test         # Run tests (Vitest)
npm run test:coverage # Run tests with coverage
npm run lint         # Linter (ESLint)
npm run format       # Format code (Prettier)
make build && make up # Test with Nginx (production-like)
```

## Directory Structure

| Path                                | Description                     |
| ----------------------------------- | ------------------------------- |
| `src/app/sites/[journalId]/[lang]/` | Multi-tenant page routes        |
| `src/middleware.ts`                 | Hostname → journalId routing    |
| `src/services/`                     | API fetching with `safeFetch()` |
| `src/utils/`                        | Shared utility functions        |
| `external-assets/`                  | Per-journal config and logos    |
| `docs/`                             | Detailed documentation          |

## Critical Patterns

### Hydration (Prevents "Text content does not match")

- Translations MUST be passed server-side as props
- Client components use `lang` prop from server for first render
- Use `useMemo`/`useCallback` to prevent infinite loops in React 19

### Error Handling

- Services use `safeFetch()` → returns fallback values, never throws
- Pages wrap fetches in try/catch → pass `null` or fallback to client on failure
- Client components handle `null` initialData gracefully

### ISR Strategy

| Content Type            | Revalidate    | On-demand |
| ----------------------- | ------------- | --------- |
| Static (about, credits) | `false`       | Yes       |
| Dynamic (home, volumes) | `86400` (24h) | Yes       |
| News                    | `3600` (1h)   | Yes       |
| Details (articles)      | `604800` (7d) | Yes       |

Layouts MUST NOT define `revalidate`. See `docs/ISR_STRATEGY.md`.

### Accessibility

Use semantic CSS variables for text colors (WCAG compliance):

- `var(--primary-text)` for text (not `var(--primary)`)
- See `docs/ACCESSIBLE_COLOR_SYSTEM.md`
- Use `focus-trap-react` for modals and interactive overlays.

## Development Guidelines

- **Language**: English for code, comments, documentation
- **New pages**: Create in `src/app/sites/[journalId]/[lang]/`, fetch server-side, pass to client
- **Security**: Validate `journalId` with `/^[a-z0-9-]{2,50}$/` (see `src/utils/validation.ts`)
- **Styling**: Sass/SCSS with CSS Variables for journal-specific theming.

## Git Workflow

- Conventional commits: `feat`, `fix`, `refactor`, `chore`, etc.
- Add files specifically: `git add <file>` (never `git add .` or `-A`)

## Documentation Index

| Topic                   | File                              |
| ----------------------- | --------------------------------- |
| ISR & Caching           | `docs/ISR_STRATEGY.md`            |
| Webhooks & Revalidation | `docs/REVALIDATION_GUIDE.md`      |
| Runtime Configuration   | `docs/CONFIGURATION_GUIDE.md`     |
| Local Testing           | `docs/LOCAL_TESTING_GUIDE.md`     |
| Nginx & Docker          | `docs/NGINX_INTEGRATION.md`       |
| Color Accessibility     | `docs/ACCESSIBLE_COLOR_SYSTEM.md` |
| Code Standards          | `docs/CODING_STANDARDS.md`        |
| Logging (Pino)          | `docs/LOGGING.md`                 |

## Token Efficiency

- Use `rg`/`grep` or line ranges instead of reading entire files
- Be concise; skip summaries unless requested
