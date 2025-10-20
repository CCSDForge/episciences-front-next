# CLAUDE.md

Instructions for Claude Code when working with this repository.

## Project Overview

Next.js 14 application for Episciences academic journals. Generates fully static sites for multiple journals, each with its own configuration and build output. Uses App Router with Server/Client component split pattern.

## Essential Commands

```bash
# Development
npm install
npm run dev

# Build specific journal (preferred method)
make <journal-name>          # e.g., make epijinfo
make list                    # List available journals
make all                     # Build all journals

# Test static build locally
make serve JOURNAL=<journal> PORT=3000

# Docker testing (Apache integration)
make docker-test JOURNAL=<journal> PORT=8080
make docker-logs             # View Apache logs
make docker-stop             # Stop test server
```

## Multi-Journal System

- **Environment Files**: `external-assets/.env.local.<journal-code>` - one per journal
- **Journal Registry**: `external-assets/journals.txt` - list of valid journal codes
- **Logos**: `external-assets/logos/logo-<journal>-{big,small}.svg` - journal-specific logos
- **Build Output**: `dist/<journal-code>/` - separate directory per journal
- **Language Routing**: Apache `.htaccess` generated at build time (see APACHE_INTEGRATION.md)

## Build Performance & Caching

### Performance Optimizations

**Webpack Filesystem Cache** (enabled by default)
- Cache isolated per journal in `.next/cache-{journal}/`
- Supports parallel builds via webhook without conflicts
- Typical gains: 40-56% faster on warm cache
- Clean all caches: `make clean`

**In-Memory Fetch Cache** (automatic during builds)
- Prevents redundant API calls for article lists
- Activated only during static builds (`NEXT_PUBLIC_STATIC_BUILD=true`)
- Eliminates 100+ redundant fetches per build
- Configurable limit: `MAX_ARTICLES_TO_GENERATE` (default: 2000)

**Build Times** (epijinfo, 92 articles):
- Cold cache: ~38s
- Warm cache: ~21s
- Targeted article rebuild: ~30s

### CI/CD Cache Configuration

**GitHub Actions:**
```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      .next/cache-*
      node_modules
    key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('src/**/*.[jt]s', 'src/**/*.[jt]sx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
      ${{ runner.os }}-nextjs-
```

**GitLab CI:**
```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .next/cache-*/
```

**Jenkins:**
```groovy
stage("Build with Cache") {
  steps {
    cache(caches: [
      arbitraryFileCache(
        path: ".next/cache-*",
        includes: "**/*",
        cacheValidityDecidingFile: "package-lock.json"
      )
    ]) {
      sh "npm run build"
    }
  }
}
```

### Environment Variables

- `MAX_ARTICLES_TO_GENERATE` (default: 2000) - Max articles to fetch per build
- `ONLY_BUILD_ARTICLE_ID` - Build single article (targeted rebuild)
- `ONLY_BUILD_VOLUME_ID` - Build single volume
- `ONLY_BUILD_SECTION_ID` - Build single section

## Architecture Patterns

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
