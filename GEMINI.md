# CLAUDE.md / GEMINI.md

Instructions for AI assistants (Claude, Gemini) when working with this repository.

---

## Project Overview

Next.js 16 application for Episciences academic journals.

- Architecture: Node.js server with Incremental Static Regeneration (ISR).
- Routing: Multi-tenant using Middleware to map hostnames to journal codes.
- Rendering: Hybrid (Server Components for data/SEO, Client Components for interactivity).
- Deployment: Standalone Docker build with multi-tenant support (45+ journals).

---

## Essential Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build (standalone Node.js)
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run linter
```

---

## Multi-Tenant ISR Architecture

### Routing & Middleware

- Middleware (`src/middleware.ts`):
  - Intercepts requests.
  - Maps `hostname` (e.g., `journal.episciences.org`) to `journalId` (e.g., `journal`).
  - Rewrites URL to `/sites/[journalId]/[lang]/...`.
  - `[lang]` is extracted from the URL path or defaults to a predefined language.

### Data Fetching & Caching

- Server Components (`page.tsx`): Fetch initial data (Articles, Volumes, Boards).
- ISR: Pages use differentiated revalidation strategies based on content type (see `docs/ISR_STRATEGY.md`).
  - Static pages (about, credits): `revalidate = false`
  - Moderately dynamic (home, volumes): `revalidate = 86400` (24h)
  - Frequently updated (news): `revalidate = 3600` (1h)
  - Detail pages (articles, volumes, sections): `revalidate = 604800` (7d) + on-demand revalidation
- Client Components: Receive initial data as props.
- Hydration: Client components use `useClientSideFetch` to fetch fresh data on mount, displaying server data first.

### Hydration Strategy (CRITICAL)

To prevent "Text content does not match" errors:

- Translations: Static labels (Titles, Breadcrumbs) MUST be translated server-side and passed as props.
- Language Consistency: Client components must use the `lang` prop from the server for the first render.
- Memoization: Use `useMemo`/`useCallback` for props and event handlers to prevent infinite loops.

---

## Directory Structure

| Path                                | Description                             |
| ----------------------------------- | --------------------------------------- |
| `src/app/sites/[journalId]/[lang]/` | Dynamic routes for all journals         |
| `src/middleware.ts`                 | Core multi-tenant routing logic         |
| `src/components/`                   | Shared UI components                    |
| `external-assets/`                  | Environment files and logos per journal |

---

## Development Guidelines

### Language

- Use English for code, comments, and documentation.
- Store plans in `./tmp/`.

### Adding New Pages

1. Create `page.tsx` in `src/app/sites/[journalId]/[lang]/[newPage]`.
2. Fetch data server-side.
3. Pass data and translated labels to a `ClientComponent`.
4. Ensure `ClientComponent` handles `initialData` correctly.

---

## Resilience Architecture

### Graceful Degradation Strategy

The application is designed to render pages even when the API is unavailable, ensuring continuity of service.

### Error Handling Patterns

**API Services:**

- All API services use `safeFetch()` utility that returns valid fallback values instead of throwing exceptions
- Services NEVER throw errors - they always return usable data (empty arrays, null objects, etc.)
- Failed requests are logged with `console.warn()` for monitoring

**Server Components (Pages):**

- All data fetches are wrapped in try/catch blocks
- Pages pass `null` or empty values to client components when API fails
- Client components are designed to handle null initialData gracefully

**Retry Mechanism:**

- Network requests use `fetchWithRetry()` utility with exponential backoff (1s, 2s, 4s, 8s)
- Automatic retry with jitter to prevent thundering herd
- Timeout of 15 seconds per request (enforced by global fetch interceptor)

### Security Measures

**Input Validation:**

- `journalId` format validation: `/^[a-z0-9-]{2,50}$/` (prevents path traversal)
- Revalidation API path validation: `/^\/sites\/[a-z0-9-]+\/[a-z]{2}(\/.*)?$/`
- All user inputs sanitized before usage in file paths or API calls

**Rate Limiting:**

- Revalidation API: 10 requests/minute per IP address
- In-memory sliding window implementation
- Returns HTTP 429 when limit exceeded

**Security Headers:**

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Restrictive (camera, microphone, geolocation blocked)

### Monitoring

All resilience-related events are logged:

- `[SafeFetch]` - API failures with fallback usage
- `[FetchRetry]` - Retry attempts and delays
- `[Revalidate API]` - On-demand revalidation requests
- `[Middleware]` - Invalid journalId detection

---

## Troubleshooting

| Issue                          | Solution                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Hydration Error                | Ensure server and client text match by passing translated strings as props.              |
| Infinite Loop                  | Check `useEffect` dependencies and memoize props.                                        |
| Pages Not Rendering (API Down) | Verify services use `safeFetch()` and pages have try/catch blocks.                       |
| ISR Not Revalidating           | Check `revalidate` is exported at page level, not in layout. See `docs/ISR_STRATEGY.md`. |

---

## Git Workflow

### Commits

- Use conventional commits (feat, fix, refactor, chore, etc.).
- Add files specifically: `git add <file>`, never `git add .`.
- Forbidden: `git add -A`, `git add --all`.

---

## Token Efficiency & MCP Rules

- Filesystem: Avoid reading entire files; use `rg` or `grep` or line ranges.
- context7 : Specify library IDs for documentation searches.
- Output: Be concise; use diff-like descriptions.
- State Management: Skip summaries unless explicitly requested.

---

**Would you like any further refinements or additional details on a specific section?**
