# CLAUDE.md / GEMINI.md

Instructions for AI assistants (Claude, Gemini) when working with this repository.

---

## Project Overview

Next.js 14 application for Episciences academic journals.
- Architecture: Node.js server with Incremental Static Regeneration (ISR).
- Routing: Multi-tenant using Middleware to map hostnames to journal codes.
- Rendering: Hybrid (Server Components for data/SEO, Client Components for interactivity).

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
- ISR: Pages use `revalidate = 3600` (1 hour).
- Client Components: Receive initial data as props.
- Hydration: Client components use `useClientSideFetch` to fetch fresh data on mount, displaying server data first.

### Hydration Strategy (CRITICAL)
To prevent "Text content does not match" errors:
- Translations: Static labels (Titles, Breadcrumbs) MUST be translated server-side and passed as props.
- Language Consistency: Client components must use the `lang` prop from the server for the first render.
- Memoization: Use `useMemo`/`useCallback` for props and event handlers to prevent infinite loops.

---

## Directory Structure

| Path | Description |
|------|-------------|
| `src/app/sites/[journalId]/[lang]/` | Dynamic routes for all journals |
| `src/middleware.ts` | Core multi-tenant routing logic |
| `src/components/` | Shared UI components |
| `external-assets/` | Environment files and logos per journal |

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

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hydration Error | Ensure server and client text match by passing translated strings as props. |
| Infinite Loop | Check `useEffect` dependencies and memoize props. |

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