# CLAUDE.md / GEMINI.md

Instructions for AI assistants (Claude, Gemini) when working with this repository.

---

## Project Overview

Next.js 16 application for Episciences academic journals.
- Architecture: Node.js server with **Hybrid ISR (Incremental Static Regeneration)**.
- Routing: Multi-tenant using Middleware to map hostnames to journal codes.
- Rendering: Hybrid (Server Components for data/SEO, Client Components for interactivity).

---

## Essential Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server

# 🏗️ Production Build (Environment Aware)
BUILD_ENV=prod npm run build    # Build production journals
BUILD_ENV=preprod npm run build # Build pre-production journals

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
- **Server Components (`page.tsx`)**: Fetch initial data with **Cache Tags**.
- **ISR Strategy**:
    - **Homepages**: Pre-generated at build time (Selective SSG).
    - **Articles/Volumes**: Generated on first visit (Just-in-Time ISR) using empty `generateStaticParams`.
    - **Revalidation**: `revalidate = 3600` (1 hour) or On-Demand via Webhook.
- **Cache Tags**: All `fetch` calls MUST include `next: { tags: [...] }` (e.g., `['articles', 'article-123']`).

### Hydration Strategy (CRITICAL)
To prevent "Text content does not match" errors:
- Translations: Static labels (Titles, Breadcrumbs) MUST be translated server-side and passed as props.
- Language Consistency: Client components must use the `lang` prop from the server for the first render.
- **Suspense**: Wrap Client Components using `useSearchParams` in `<Suspense>` to avoid build errors.

---

## Directory Structure

| Path | Description |
|------|-------------|
| `src/app/sites/[journalId]/[lang]/` | Dynamic routes for all journals |
| `src/middleware.ts` | Core multi-tenant routing logic |
| `src/services/` | Data fetching logic with Cache Tags |
| `src/app/api/revalidate/` | Webhook endpoint for cache purging |
| `src/utils/journal-filter.ts` | Logic for filtering journals by environment |

---

## Development Guidelines

### Language
- Use English for code, comments, and documentation.
- Store plans in `docs/`.

### Adding New Pages
1. Create `page.tsx` in `src/app/sites/[journalId]/[lang]/[newPage]`.
2. Add `export const revalidate = 3600;`.
3. Add `export async function generateStaticParams() { return []; }` for JIT ISR.
4. Fetch data server-side using `fetch` with appropriate **Cache Tags**.
5. Pass data and translated labels to a `ClientComponent`.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hydration Error | Ensure server and client text match by passing translated strings as props. |
| Build Error `useSearchParams` | Wrap the Client Component in `<Suspense>`. |
| API Down | ISR will serve the last cached version. |

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
