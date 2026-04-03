# ISR Multi-Tenant Strategy

## Overview

This document describes the Incremental Static Regeneration (ISR) strategy for the
Episciences Next.js 16 multi-tenant application. It covers both page-level regeneration
and data-level caching (Valkey).

---

## Core Principles

### 1. Two Levels of Caching

The application uses two complementary caches:

| Level | What | Where | Controlled by |
|-------|------|-------|---------------|
| **Data Cache** | `fetch()` responses (API data) | Valkey (shared) | `next: { revalidate, tags }` in services |
| **Full Route Cache** | Rendered HTML / RSC payload | Disk, per server | `export const revalidate` in page files |

Both must be configured for ISR to work end-to-end.

### 2. No Layout Revalidation

Layouts do **not** define a `revalidate` value. Each page controls its own ISR independently.

### 3. On-Demand Priority

For urgent updates (article published, content corrected), use the `/api/revalidate`
endpoint instead of waiting for the next automatic TTL expiry.

### 4. Graceful Degradation

All services use `safeFetch()` — they return fallback values instead of throwing, so
pages render even when the API is down (stale cache served).

---

## Page-Level ISR Configuration

### Static Content Pages

**File:** `export const revalidate = false`

Pages that rarely change. On-demand revalidation is the only way to update them.

| Page | Route |
|------|-------|
| About | `/sites/[journalId]/[lang]/about` |
| Credits | `/sites/[journalId]/[lang]/credits` |
| For authors | `/sites/[journalId]/[lang]/for-authors` |
| For reviewers | `/sites/[journalId]/[lang]/for-reviewers` |
| For conference organisers | `/sites/[journalId]/[lang]/for-conference-organisers` |
| Acknowledgements | `/sites/[journalId]/[lang]/acknowledgements` |
| Indexing | `/sites/[journalId]/[lang]/indexing` |

### Dynamic Pages (Daily ISR)

**File:** `export const revalidate = 86400` (24 hours)

| Page | Route |
|------|-------|
| Home | `/sites/[journalId]/[lang]` |
| Volumes list | `/sites/[journalId]/[lang]/volumes` |

### Frequently Updated Pages (Hourly ISR)

**File:** `export const revalidate = 3600` (1 hour)

| Page | Route |
|------|-------|
| News | `/sites/[journalId]/[lang]/news` |

### Detail Pages (Weekly ISR + On-Demand)

**File:** `export const revalidate = 604800` (7 days)

Published content is effectively immutable; on-demand revalidation handles corrections.

| Page | Route |
|------|-------|
| Article detail | `/sites/[journalId]/[lang]/articles/[id]` |
| Volume detail | `/sites/[journalId]/[lang]/volumes/[id]` |
| Section detail | `/sites/[journalId]/[lang]/sections/[id]` |

---

## Data Cache Configuration

### Cache TTL (Environment Variables)

All fetch-level cache durations are configurable. They default to **3600 s (1 hour)**
when the variable is not set. Set to `false` to cache indefinitely (on-demand only).

| Variable | Service(s) | Default |
|----------|-----------|---------|
| `CACHE_TTL_NEWS` | `news.ts` | 3600 |
| `CACHE_TTL_VOLUMES` | `volume.ts` | 3600 |
| `CACHE_TTL_ARTICLES` | `article.ts`, `section.ts` | 3600 |
| `CACHE_TTL_PAGES` | `about.ts`, `credits.ts`, `forReviewers.ts`, `indexing.ts`, `indexation.ts`, `acknowledgements.ts`, `forConferenceOrganisers.ts`, `proposingSpecialIssues.ts`, `page.ts` | 3600 |
| `CACHE_TTL_STATISTICS` | `stat.ts`, `statistics.ts` | 3600 |
| `CACHE_TTL_MEMBERS` | `board.ts`, `home.ts` (members) | 3600 |
| `CACHE_TTL_SECTIONS` | `section.ts` | 3600 |
| `CACHE_TTL_SITEMAP` | `sitemap.ts` | 3600 |

### Cache Tag Naming Convention

Every `fetch()` call includes tags for granular invalidation:

```typescript
fetch(url, {
  next: {
    revalidate: CACHE_TTL.articles,
    tags: [
      'articles',                         // All articles (all journals)
      `articles-${rvcode}`,               // All articles of this journal
      `article-${paperid}`,               // This specific article
    ],
  },
});
```

### Full Tag Hierarchy

> **Cross-page tags** — Some data is fetched by multiple pages (e.g. board members on both
> the Boards page and the home page, the About text on both the About page and the home page,
> the Indexing editorial content on the Indexing page and a home page section). The fetch calls
> in all those pages carry the **same tags**, so one `revalidateTag` call invalidates the data
> everywhere it appears.

```
articles                          ← invalidates all journals' articles
└── articles-{rvcode}             ← invalidates all articles of one journal
    └── article-{id}              ← invalidates one specific article

articles-accepted
└── articles-accepted-{rvcode}

volumes
└── volumes-{rvcode}
    └── volume-{id}               ← volume metadata + article order in volume

sections
└── sections-{rvcode}
    └── section-{id}-{rvcode}     ← section metadata
        └── section-articles-{id}-{rvcode}  ← articles listed in that section

news
└── news-{rvcode}

boards                            ← broadest board tag (all journals)
└── boards-{rvcode}               ← Boards page + home members section (cross-page)
    └── members-{rvcode}          ← board member list only (roles, names, affiliations)

about                             ← all journals' about data
└── about-{rvcode}                ← About page + home about section (cross-page)

indexing                          ← all journals' indexing editorial content
└── indexing-{rvcode}             ← Indexing page + home indexing section (cross-page)

indexation
└── indexation-{rvcode}           ← /journals/{rvcode}/indexation metrics endpoint only

pages
└── page-{page_code}-{rvcode}     ← fine-grained page tag (e.g. page-about-epijinfo)

credits / for-reviewers / for-conference-organisers /
proposing-special-issues / acknowledgements
└── {page-type}-{rvcode}          ← dedicated tag per editorial page (no home page section)

stats / statistics
├── stats-{rvcode}                ← home page stats block
└── statistics-{rvcode}           ← full statistics page

sitemap
└── sitemap-{rvcode}
```

---

## How ISR Works End-to-End

```
1st request after TTL expiry:
  Browser → Next.js → cache MISS → fetch API → store in Valkey → render HTML
  (stale HTML served immediately while background regeneration happens)

Subsequent requests (cache hot):
  Browser → Next.js → Valkey HIT → serve HTML (< 1 ms)

On-demand revalidation:
  Symfony → POST /api/revalidate {tag: "article-4256"}
            → revalidateTag("article-4256")
            → Valkey: delete matching data cache entries
            → Next request: cache MISS → fresh fetch → new HTML
```

---

## Cache Key Isolation (Multi-Tenant, Multi-Environment)

**No collision between journals:** Data Cache keys are derived from the full `fetch()` URL.
Since each journal uses its own API URL (`getJournalApiUrl(rvcode)`), entries are
automatically isolated — `next:data:https://api.episciences.org/api/epijinfo/news/...`
and `next:data:https://api.episciences.org/api/jtam/news/...` are separate keys.

**Isolation between environments (preprod / prod):** Use distinct `VALKEY_KEY_PREFIX`
values per environment:

```env
# .env.preprod.local
VALKEY_KEY_PREFIX="preprod:"

# .env.production.local
VALKEY_KEY_PREFIX="next:"
```

This prevents a preprod deployment from poisoning the production cache when sharing
the same Valkey cluster.

---

## Troubleshooting

### Pages Always Show Fresh Content

- **Cause:** `fetch()` calls had no `cache: 'force-cache'` or `next: { revalidate }` →
  data was never stored in Valkey. Fixed in all services (use `CACHE_TTL.*`).
- **Check:** Search for `fetch(` calls without `next:` in `src/services/`.

### On-Demand Revalidation Has No Effect

1. Confirm the tag in the webhook payload matches a tag used in the service's `next: { tags }`.
2. Check `[CacheHandler] Revalidated tag "…"` in Next.js logs.
3. Verify `VALKEY_ENABLED=true` at build time and runtime.

### `revalidate: false` Pages Never Update

These pages have no time-based TTL — they require an explicit `revalidateTag()` call.
To make them time-based, set `CACHE_TTL_PAGES=86400` in your environment.

### Stale Content After Deployment

With Valkey, the Data Cache persists across deployments. Pages will serve the
previously cached API responses until:
- their TTL expires, or
- a revalidation webhook is called.

This is intentional (cache survives restarts). To force a full flush after a deployment,
run `redis-cli FLUSHDB` against the Valkey master (use with caution in production).

---

## Related Documentation

- [Revalidation Guide](./REVALIDATION_GUIDE.md) — Webhook configuration, Symfony examples
- [Valkey Cache Strategy](./VALKEY_CACHE_STRATEGY.md) — Distributed cache architecture
- [Valkey Deployment](./DEPLOYMENT_VALKEY.md) — Infrastructure setup
