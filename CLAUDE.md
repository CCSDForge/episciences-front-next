# CLAUDE.md / GEMINI.md

Instructions for AI assistants (Claude, Gemini) when working with this repository.

## Project Overview

Next.js 14 application for Episciences academic journals. 
**Architecture:** Node.js Server with Incremental Static Regeneration (ISR).
**Routing:** Multi-tenant using Middleware to map hostnames to journal codes.
**Rendering:** Hybrid approach (Server Components for data/SEO, Client Components for interactivity).

## Essential Commands

```bash
# Development
npm install
npm run dev

# Production Build (Standalone Node.js)
npm run build

# Start Production Server
npm run start

# Test/Lint
npm run test
npm run lint
```

## Multi-Tenant ISR Architecture

### Routing & Middleware
- **Middleware** (`src/middleware.ts`): Intercepts requests.
- Maps `hostname` (e.g., `journal.episciences.org`) -> `journalId` (e.g., `journal`).
- Rewrites URL to `/sites/[journalId]/[lang]/...`.
- `[lang]` is determined from URL path (e.g., `/fr/...`) or default.

### Data Fetching & Caching
- **Server Components** (`page.tsx`): Fetch initial data (Articles, Volumes, Boards).
- **ISR**: Pages use `revalidate = 3600` (1 hour) or similar.
- **Client Components** (`*Client.tsx`): Receive initial data as props.
- **Hydration**: Client components use `useClientSideFetch` (react-query-like) to fetch fresh data on mount, but display initial server data first.

### Hydration Strategy (CRITICAL)
To prevent "Text content does not match" errors:
1. **Translations**: Static labels (Titles, Breadcrumbs, Counters) MUST be translated on the Server (`page.tsx`) and passed as props to Client Components.
   - Example: `breadcrumbLabels={{ home: t('home') }}` passed to `ArticlesClient`.
2. **Language Consistency**: Client components must rely on the `lang` prop passed from the Server, NOT solely on `i18n.language` or Redux state during the first render.
3. **Memoization**: All props passed to third-party libraries (like `ReactPaginate`) and event handlers in Client Components MUST be wrapped in `useMemo` / `useCallback` to prevent infinite render loops.

## Directory Structure

- `src/app/sites/[journalId]/[lang]/` - Dynamic routes for all journals.
- `src/middleware.ts` - Core multi-tenant routing logic.
- `src/components/` - Shared UI components.
- `external-assets/` - Environment files and logos per journal.

## Development Guidelines

### Adding New Pages
1. Create `page.tsx` in `src/app/sites/[journalId]/[lang]/[newPage]`.
2. Fetch data server-side.
3. Pass data + translated labels to a `ClientComponent`.
4. Ensure `ClientComponent` handles `initialData` correctly.

### Modifying Client Components
- Always use `useCallback` for event handlers passed to children.
- If using `useEffect` to update state based on props, ensure dependency arrays are stable.
- Check for Hydration Mismatches by running `npm run dev` and viewing the console.

## Git Workflow

- **Commits**: Use conventional commits (feat, fix, refactor).
- **Specific Adds**: `git add <file>`, never `git add .` indiscriminately (though acceptable for massive refactors if carefully reviewed).

## Troubleshooting

- **Hydration Error**: Check if text rendered on server (using `t` with default lang) differs from client (using `t` with detected lang). Fix by passing the translated string as a prop.
- **Infinite Loop**: Check `useEffect` dependencies in Client Components. Ensure objects/arrays passed as props are memoized.


### Static Build System
- Uses `output: 'export'` in next.config.js
- Routes in `src/app/[lang]/` with language prefix
- Client components use `*Client.tsx` naming pattern
- Server components fetch data at build time
- `src/utils/static-build.ts` provides `safeFetch()` for API mocking during build

### Critical Implementation Details
- **Links**: Use custom `src/components/Link/Link.tsx` (renders `<a>` tags in production for SEO)
- **Assets**: Use string paths `'/icons/icon.svg'` NOT ES6 imports
- **Images**: Set `unoptimized: true` in next.config.js
- **Env Variables**: Always provide fallback: `process.env.NEXT_PUBLIC_JOURNAL_RVCODE || ''`

### Component Organization
- `src/app/[lang]/` - App Router pages with language routing
- `src/components/` - Shared components (Cards, Modals, Sidebars, etc.)
- `src/services/` - API service layer (articles, authors, volumes, etc.)
- `src/types/` - TypeScript interfaces
- `src/hooks/store` - Redux Toolkit state management

### State & i18n
- Redux Toolkit for global state
- i18next for internationalization (translations in `public/locales/`)
- Client-side language detection with SSR-safe hooks

## Development Guidelines

### When Building/Testing
1. Always test with `make serve JOURNAL=<journal>` after changes
2. For Apache integration, use `make docker-test JOURNAL=<journal>`
3. Check generated HTML in `dist/<journal>/` - should be complete, not JS-only
4. Multi-journal changes must be tested across different journal configs

### Code Patterns
- Filter Next.js props (prefetch, scroll, replace, shallow) when using `<a>` tags
- Use direct string paths for all static assets
- Place new static files in `public/` directory
- Client components: wrap browser-only code in useEffect
- No explicit width/height on images when CSS handles sizing

### Makefile-Generated Files
- `.htaccess` - Generated per journal for language routing (monolingual vs multilingual)
- `robots.txt` / `sitemap.xml` - Updated with journal-specific URLs

## Git Workflow

### Commits
- **INTERDIT** : N'utilisez JAMAIS `git add -A` ou `git add --all`
- Toujours ajouter les fichiers spécifiquement : `git add <fichier1> <fichier2>...`
- Cela évite d'ajouter accidentellement des fichiers de cache, logs, ou fichiers temporaires (.nextcloudsync.log, .sync_*.db, etc.)
- Exemple correct : `git add src/components/MyComponent.tsx src/utils/helper.ts`

## Troubleshooting

- **Build fails**: Check `external-assets/.env.local.<journal>` exists
- **Assets not found**: Ensure paths start with `/` and files are in `public/`
- **Hydration errors**: Check for useEffect wrapping client-only code
- **Language routing**: Verify `.htaccess` generated correctly in `dist/<journal>/`
