# CLAUDE.md / GEMINI.md

Instructions for AI assistants working with this repository.

## Project Overview

Next.js 16 (React 19) multi-tenant application for Episciences academic journals (45+ journals).

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Essential Commands

```bash
make sonar           # Run tests with coverage and SonarQube scan
make build && make up # Test with Nginx (production-like)
```

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

| Content Type                | Revalidate                         | On-demand |
| --------------------------- | ---------------------------------- | --------- |
| Static (about, credits)     | `false`                            | Yes       |
| Dynamic (home, volumes)     | `86400` (24h)                      | Yes       |
| News                        | `3600` (1h)                        | Yes       |
| Articles (detail, list)     | `false` (via `CACHE_TTL_ARTICLES`) | Yes       |
| Details (volumes, sections) | `604800` (7d)                      | Yes       |

Layouts MUST NOT define `revalidate`. See `docs/ISR_STRATEGY.md`.

### Logging

Use the centralized logger (`src/lib/logger.ts`) — never `console.*` directly:

```ts
const log = logger.child({ service: 'my-service' });
log.info('message', { extraData });
```

- Dev: human-readable output; Prod: structured JSON for log aggregators
- `LOG_LEVEL` env var overrides the default level

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
