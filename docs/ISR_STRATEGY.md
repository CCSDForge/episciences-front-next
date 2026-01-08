# ISR Multi-Tenant Strategy

## Overview

This document describes the Incremental Static Regeneration (ISR) strategy for the Episciences Next.js 16 multi-tenant application. The strategy is designed to optimize caching based on content update frequency while ensuring pages can be updated on-demand when needed.

## Core Principles

### 1. Granularity by Content Type

Each page defines its own revalidation strategy based on how frequently its content changes. There is **no global revalidate** setting.

### 2. No Layout Revalidation

Layouts do NOT define a `revalidate` value. This ensures child pages can have independent ISR strategies without inheriting unwanted behavior from parent layouts.

### 3. On-Demand Priority

For time-sensitive updates (new article publication, content corrections), use the `/api/revalidate` API endpoint instead of waiting for the next automatic revalidation.

### 4. Graceful Degradation

All pages are designed to render with cached/fallback data if the API is unavailable, ensuring the site remains functional even during API outages.

---

## ISR Configuration by Page Type

### Static Content Pages (No ISR)

**Revalidation:** `false` (ISR disabled, fully static at build time)

**Reasoning:** Editorial content that rarely changes (months/years between updates).

**Pages:**

- `/sites/[journalId]/[lang]/about` - About page
- `/sites/[journalId]/[lang]/credits` - Credits and legal mentions
- `/sites/[journalId]/[lang]/for-authors` - Submission guidelines

**Configuration:**

```typescript
export const revalidate = false;
```

**When to Update:** Use on-demand revalidation when editorial content is modified.

---

### Moderately Dynamic Pages (Daily ISR)

**Revalidation:** `86400` seconds (24 hours)

**Reasoning:** Content updates approximately weekly, so daily revalidation strikes a good balance between freshness and server load.

**Pages:**

- `/sites/[journalId]/[lang]` - Home page (latest volume + journal info)
- `/sites/[journalId]/[lang]/volumes` - Volume list

**Configuration:**

```typescript
// Home page content (latest volume + journal info) updates approximately weekly
// Daily revalidation is sufficient
export const revalidate = 86400; // 24 hours
```

**Cache Strategy:**

- First request after 24h triggers regeneration in background
- Stale content served immediately, fresh content served on next request
- Reduces server load from ~5.8M to ~300K regenerations/day

---

### Frequently Updated Pages (Hourly ISR)

**Revalidation:** `3600` seconds (1 hour)

**Reasoning:** Content can change multiple times per day and requires fresher data.

**Pages:**

- `/sites/[journalId]/[lang]/news` - News articles
- `/sites/[journalId]/[lang]/articles-accepted` - Recently accepted articles (if implemented)

**Configuration:**

```typescript
// News are frequently updated - revalidate every hour
export const revalidate = 3600; // 1 hour
```

**Cache Strategy:**

- Balances freshness with server load
- Critical updates should still use on-demand revalidation

---

### Detail Pages (Weekly ISR + On-Demand)

**Revalidation:** `604800` seconds (7 days)

**Reasoning:** Once published, article/volume/section details rarely change. Long cache time reduces server load while on-demand API handles urgent updates.

**Pages:**

- `/sites/[journalId]/[lang]/articles/[id]` - Article detail
- `/sites/[journalId]/[lang]/volumes/[id]` - Volume detail
- `/sites/[journalId]/[lang]/sections/[id]` - Section detail

**Configuration:**

```typescript
// Article details rarely change after publication - long revalidation time
// Use on-demand revalidation API for critical updates
export const revalidate = 604800; // 7 days
```

**Cache Strategy:**

- Extremely long cache time (7 days) minimizes server regeneration
- On-demand revalidation API provides instant updates when needed
- Ideal for published content that is essentially immutable

**When to Use On-Demand:**

- Article metadata corrections (DOI, author names, etc.)
- Volume information updates
- Section reorganization

---

### Dynamic Pages (No ISR)

**Revalidation:** Use `await connection()` for fully dynamic rendering

**Reasoning:** Content is user-specific or changes too frequently for ISR to be effective.

**Pages:**

- Search results
- User dashboards (if implemented)
- Real-time statistics

**Configuration:**

```typescript
import { connection } from 'next/server';

export default async function SearchPage(props) {
  await connection(); // Force dynamic rendering
  // ... rest of page
}
```

---

## Cache Tags for On-Demand Revalidation

### Tag Naming Convention

All API fetches should include consistent tags for granular on-demand revalidation:

```typescript
fetch(url, {
  next: {
    revalidate: 604800, // or appropriate value
    tags: [
      'articles', // Entity type
      `article-${articleId}`, // Specific entity
      `journal-${rvcode}`, // Journal scope
    ],
  },
});
```

### Tag Hierarchy

1. **Entity Type Tags** (broad scope):
   - `articles`, `volumes`, `sections`, `news`, `pages`, `members`, `stats`

2. **Specific Entity Tags** (narrow scope):
   - `article-12345`, `volume-67`, `section-890`

3. **Journal Scope Tags** (medium scope):
   - `journal-epijinfo`, `journal-alco`

### Example Tagging Patterns

**Home page data:**

```typescript
// In services/home.ts
const aboutPagePromise = fetch(`${apiBaseUrl}${API_PATHS.pages}?page_code=about&rvcode=${rvcode}`, {
  next: {
    tags: ['pages', `page-about-${rvcode}`, `journal-${rvcode}`],
  },
});
```

**Article detail:**

```typescript
// In services/article.ts
const rawArticle = await fetch(`${apiBaseUrl}${API_PATHS.papers}${articleId}`, {
  next: {
    revalidate: 604800,
    tags: ['articles', `article-${articleId}`, `journal-${rvcode}`],
  },
});
```

---

## Using the Revalidation API

The `/api/revalidate` endpoint supports both tag-based and path-based revalidation.

### Authentication

Requests must include either:

- **IP Whitelist:** Request from an authorized IP address
- **Token Authentication:** `x-episciences-token` header

### Tag-Based Revalidation (Recommended)

Revalidate all pages containing specific tagged data:

```bash
# Revalidate a specific article across all pages where it appears
curl -X POST https://yoursite.com/api/revalidate \
  -H "x-episciences-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "article-12345",
    "journalId": "epijinfo"
  }'

# Revalidate all articles for a journal
curl -X POST https://yoursite.com/api/revalidate \
  -H "x-episciences-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "journal-epijinfo",
    "journalId": "epijinfo"
  }'

# Revalidate all news pages
curl -X POST https://yoursite.com/api/revalidate \
  -H "x-episciences-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "news",
    "journalId": "epijinfo"
  }'
```

### Path-Based Revalidation

Revalidate a specific page by path:

```bash
# Revalidate the home page
curl -X POST https://yoursite.com/api/revalidate \
  -H "x-episciences-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/sites/epijinfo/fr",
    "journalId": "epijinfo"
  }'

# Revalidate a specific article page
curl -X POST https://yoursite.com/api/revalidate \
  -H "x-episciences-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/sites/epijinfo/fr/articles/12345",
    "journalId": "epijinfo"
  }'
```

### Response Format

**Success:**

```json
{
  "revalidated": true,
  "now": 1704067200000
}
```

**Error:**

```json
{
  "message": "Missing required parameters",
  "now": 1704067200000
}
```

### Rate Limiting

- **Limit:** 10 requests per minute per IP address
- **Response:** HTTP 429 when limit exceeded
- **Reset:** Sliding window, resets after 1 minute of no requests

---

## Performance Impact

### Before ISR Optimization (Uniform 1h revalidation)

- **Total regenerations/day:** ~5.8 million
- **Server load:** Constant regeneration overhead
- **Cache efficiency:** Low (frequent regeneration of static content)

### After ISR Optimization (Differentiated strategy)

| Page Type                     | Revalidation | Est. Pages                          | Regenerations/Day | Reduction |
| ----------------------------- | ------------ | ----------------------------------- | ----------------- | --------- |
| Static (about, credits, etc.) | `false`      | ~135 (45 journals × 3 pages)        | 0                 | -3,240    |
| Daily (home, volumes)         | `86400s`     | ~90 (45 journals × 2 pages)         | ~90               | -2,070    |
| Hourly (news)                 | `3600s`      | ~45 (45 journals × 1 page)          | ~1,080            | 0         |
| Weekly (details)              | `604800s`    | ~450K (articles, volumes, sections) | ~6,400            | -10.7M    |

**Total estimated regenerations/day:** ~7,570 (down from ~10.8M)

**Server load reduction:** ~99.9%

---

## Monitoring ISR Effectiveness

### Metrics to Track

1. **Cache Hit Rate:**
   - Target: > 80%
   - Monitor: Next.js cache headers (X-Next-Cache: HIT/MISS/STALE)

2. **Revalidation Frequency:**
   - Track automatic revalidations vs. on-demand
   - Identify pages with unexpected revalidation patterns

3. **API Availability Impact:**
   - Monitor page render success rate when API is down
   - Target: 100% of pages should render with cached/fallback data

4. **On-Demand API Usage:**
   - Track `/api/revalidate` requests by tag/path
   - Monitor rate limiting effectiveness

### Logging

All ISR-related actions are logged with context:

```typescript
console.log(`[Revalidate API] Revalidating tag: ${tag} for journal: ${journalId}`);
console.log(`[Revalidate API] Revalidating path: ${path}`);
console.warn(`[Revalidate API] Rate limit exceeded for IP: ${clientIp}`);
console.warn(`[Revalidate API] Invalid path format: ${path}`);
```

---

## Best Practices

### 1. Always Define Revalidation Strategy

Every page MUST have either:

- `export const revalidate = X` (ISR enabled)
- `await connection()` (Dynamic rendering)

**Bad:**

```typescript
export default async function MyPage() {
  // No revalidate or connection() - behavior is undefined
}
```

**Good:**

```typescript
export const revalidate = 86400; // Explicit ISR strategy

export default async function MyPage() {
  // ...
}
```

### 2. Use Appropriate Revalidation Times

Choose based on content update frequency:

- Static content: `false`
- Weekly updates: `86400` (24h)
- Daily updates: `3600` (1h)
- Published content: `604800` (7d) + on-demand

### 3. Tag All Fetches

Include tags for granular on-demand revalidation:

```typescript
fetch(url, {
  next: {
    revalidate: 604800,
    tags: ['entity-type', `entity-${id}`, `journal-${rvcode}`],
  },
});
```

### 4. Prefer Tag-Based Over Path-Based Revalidation

Tag-based revalidation updates all pages where the data appears:

```bash
# ✅ GOOD: Updates article on detail page, home page, volume page, etc.
{"tag": "article-12345"}

# ⚠️ LIMITED: Only updates the specific article detail page
{"path": "/sites/epijinfo/fr/articles/12345"}
```

### 5. Test with API Down

Verify that pages render with cached/fallback data:

```bash
# Stop API, then visit pages
# Expected: Pages render with potentially stale but valid data
```

---

## Troubleshooting

### Pages Not Revalidating

**Symptoms:** Content doesn't update after expected revalidation time

**Checks:**

1. Verify `revalidate` is exported at page level (not in function)
2. Check if layout has a `revalidate` (should NOT have one)
3. Verify tags are correctly set in fetch calls
4. Check Next.js cache logs for revalidation events

### Unexpected Revalidations

**Symptoms:** Pages regenerate more frequently than expected

**Checks:**

1. Check if parent layout has `revalidate` (remove if present)
2. Verify no duplicate/conflicting fetch calls
3. Review on-demand revalidation API usage

### API Down, Pages Not Rendering

**Symptoms:** Pages show errors when API is unavailable

**Checks:**

1. Verify services use `safeFetch()` with fallback values
2. Check pages have try/catch with fallback data
3. Ensure client components handle `null` initialData

---

## Related Documentation

- [Next.js 16 Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#revalidating-data)
- [Coding Standards](./CODING_STANDARDS.md) (to be created)
- [Resilience Architecture](../CLAUDE.md#resilience-architecture)

---

## Revision History

| Date       | Version | Changes                            |
| ---------- | ------- | ---------------------------------- |
| 2025-01-08 | 1.0     | Initial ISR strategy documentation |
