# Coding Standards - Episciences Next.js

This document defines coding standards and best practices for the Episciences Next.js application.

---

## General Principles

### Language

- **Code:** English only for all code, comments, and documentation
- **User-facing content:** Support multiple languages (fr, en) via i18n
- **Commit messages:** English, following conventional commits format

### Code Style

- Follow TypeScript strict mode conventions
- Use functional components with hooks (no class components)
- Prefer explicit types over `any`
- Use meaningful variable and function names (descriptive, not abbreviated)

---

## Error Handling

### API Services

**Rule:** Services MUST return valid fallback values, NEVER throw exceptions

**Pattern:**

```typescript
// ✅ GOOD: Uses safeFetch with fallback
export async function fetchData(id: string) {
  return await safeFetch(
    async () => {
      const response = await fetch(...);
      if (!response.ok) throw new Error(...);
      return await response.json();
    },
    { data: [], totalItems: 0 }, // Valid fallback
    `fetchData(${id})`
  );
}

// ❌ BAD: Throws exception
export async function fetchData(id: string) {
  const response = await fetch(...);
  if (!response.ok) throw new Error(...); // Don't throw
  return await response.json();
}
```

**Logging:**

- Success: No log (or `console.debug()` if needed)
- Warning: `console.warn()` with context
- Error: `console.error()` with full error object

**Example:**

```typescript
console.warn(`[SafeFetch] ${context} failed, using fallback:`, error.message);
```

---

### Server Components (Pages)

**Rule:** ALL data fetches MUST be wrapped in try/catch blocks

**Pattern:**

```typescript
// ✅ GOOD: Try/catch with fallback
export default async function Page(props: { params: Promise<...> }) {
  const params = await props.params;
  let data = null;
  let translations = {};

  try {
    [data, translations] = await Promise.all([
      fetchData(params.id),
      getServerTranslations(params.lang)
    ]);
  } catch (error) {
    console.warn('[Page] Data fetch failed:', error);
    // data remains null, client component must handle it
  }

  return <ClientComponent initialData={data} translations={translations} />;
}

// ❌ BAD: No error handling
export default async function Page(props: { params: Promise<...> }) {
  const params = await props.params;
  const data = await fetchData(params.id); // Can crash the page
  return <ClientComponent initialData={data} />;
}
```

---

### Client Components

**Rule:** Client components MUST gracefully handle null/undefined initialData

**Pattern:**

```typescript
// ✅ GOOD: Handles null initialData
export default function MyClient({ initialData }: { initialData: MyData | null }) {
  if (!initialData) {
    return <div>No data available</div>;
  }

  return <div>{initialData.title}</div>;
}

// ❌ BAD: Assumes data is always present
export default function MyClient({ initialData }: { initialData: MyData }) {
  return <div>{initialData.title}</div>; // Crashes if initialData is null
}
```

---

## ISR Strategies

### Required Configuration

**Rule:** Every page MUST have either `revalidate` OR `connection()`

**Patterns:**

```typescript
// ✅ GOOD: Explicit ISR strategy
export const revalidate = 3600; // 1 hour
export default async function Page() {
  /* ... */
}

// ✅ GOOD: Dynamic rendering
import { connection } from 'next/server';
export default async function Page() {
  await connection(); // Force dynamic
  // ...
}

// ❌ BAD: No configuration (behavior is undefined)
export default async function Page() {
  /* ... */
}
```

### Revalidation Times by Content Type

| Content Type                          | Revalidate Value | Reason                |
| ------------------------------------- | ---------------- | --------------------- |
| Static editorial (about, credits)     | `false`          | Rarely changes        |
| Moderately dynamic (home, volumes)    | `86400` (24h)    | Weekly updates        |
| Frequently updated (news)             | `3600` (1h)      | Multiple updates/day  |
| Published content (articles, volumes) | `604800` (7d)    | Immutable + on-demand |
| User-specific (search, dashboard)     | `connection()`   | Dynamic per request   |

**Example:**

```typescript
// Static page
export const revalidate = false;

// Frequently updated page
export const revalidate = 3600; // 1 hour

// Detail page with long cache + on-demand
export const revalidate = 604800; // 7 days
```

### Layout Revalidation

**Rule:** Layouts MUST NOT define a global `revalidate`

**Reasoning:** Child pages need independent ISR strategies

```typescript
// ❌ BAD: Layout with revalidate
export const revalidate = 3600;
export default function Layout({ children }) { return <>{children}</>; }

// ✅ GOOD: Layout without revalidate
export default function Layout({ children }) { return <>{children}</>; }
```

---

## Fetch Tagging for On-Demand Revalidation

**Rule:** All fetch calls MUST include consistent tags

**Tag Hierarchy:**

1. Entity type: `articles`, `volumes`, `sections`, `news`, `pages`
2. Specific entity: `article-{id}`, `volume-{id}`, `section-{id}`
3. Journal scope: `journal-{rvcode}`

**Example:**

```typescript
fetch(url, {
  next: {
    revalidate: 604800,
    tags: [
      'articles', // Entity type
      `article-${articleId}`, // Specific entity
      `journal-${rvcode}`, // Journal scope
    ],
  },
});
```

**Benefits:**

- Granular revalidation (single article vs. all articles)
- Journal-specific cache invalidation
- Efficient cache management

---

## Naming Conventions

### Functions

| Type           | Pattern               | Example                                   |
| -------------- | --------------------- | ----------------------------------------- |
| Data fetching  | `fetch{Entity}()`     | `fetchArticles()`                         |
| Transformation | `transform{Entity}()` | `transformArticle()`                      |
| Validation     | `isValid{Noun}()`     | `isValidJournalId()`                      |
| Formatting     | `format{Entity}()`    | `formatVolume()`                          |
| Utilities      | `{verb}{Noun}()`      | `safeFetch()`, `batchFetchWithFallback()` |

### Files

| Type      | Pattern               | Example                                 |
| --------- | --------------------- | --------------------------------------- |
| Service   | `{entity}.ts`         | `article.ts`, `volume.ts`               |
| Utility   | `{purpose}.ts`        | `validation.ts`, `api-error-handler.ts` |
| Component | `{ComponentName}.tsx` | `ArticleCard.tsx`                       |
| Page      | `page.tsx`            | `page.tsx` (Next.js convention)         |

---

## Parallel Fetching

**Rule:** Use `Promise.all()` for independent fetches, sequential for dependent ones

**Pattern:**

```typescript
// ✅ GOOD: Parallel independent fetches
const [articles, translations, journal] = await Promise.all([
  fetchArticles(id),
  getServerTranslations(lang),
  getJournalByCode(journalId),
]);

// ✅ GOOD: Sequential dependent fetches
const articles = await fetchArticles(id);
const firstArticleDetails = await fetchArticleDetails(articles[0].id);

// ❌ BAD: Sequential when could be parallel
const articles = await fetchArticles(id);
const translations = await getServerTranslations(lang); // Could be parallel
```

---

## TypeScript Best Practices

### Types vs Interfaces

- **Interfaces:** For object shapes, component props, API contracts
- **Types:** For unions, intersections, utility types

```typescript
// ✅ GOOD: Interface for object shape
interface IArticle {
  id: number;
  title: string;
  authors: string[];
}

// ✅ GOOD: Type for union
type ArticleStatus = 'draft' | 'published' | 'archived';
```

### Avoid `any`

```typescript
// ❌ BAD: Using any
function processData(data: any) {
  /* ... */
}

// ✅ GOOD: Explicit type
function processData(data: IArticle) {
  /* ... */
}

// ✅ ACCEPTABLE: Unknown with type guard
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Safe to use
  }
}
```

---

## Component Patterns

### Server Components (Default)

Use for data fetching and SEO-critical content:

```typescript
export default async function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const article = await fetchArticle(params.id);

  return <ArticleClient initialArticle={article} />;
}
```

### Client Components

Use for interactivity and state:

```typescript
'use client';

export default function ArticleClient({ initialArticle }: { initialArticle: IArticle | null }) {
  const [article, setArticle] = useState(initialArticle);

  // Client-side logic...

  return <div>{article?.title}</div>;
}
```

---

## Security Guidelines

### Input Validation

**Rule:** ALL user inputs MUST be validated before usage

```typescript
// ✅ GOOD: Validation before usage
export function getJournalConfig(journalCode: string): JournalConfig {
  if (!isValidJournalId(journalCode)) {
    throw new Error(`Invalid journal code: ${journalCode}`);
  }

  const envPath = path.join(process.cwd(), `external-assets/.env.local.${journalCode}`);
  // ...
}

// ❌ BAD: No validation
export function getJournalConfig(journalCode: string): JournalConfig {
  const envPath = path.join(process.cwd(), `external-assets/.env.local.${journalCode}`);
  // Vulnerable to path traversal
}
```

### Validation Patterns

```typescript
// Journal ID: lowercase letters, digits, hyphens only
export function isValidJournalId(id: string): boolean {
  return /^[a-z0-9-]{2,50}$/.test(id);
}

// Path: must match Next.js route pattern
export function isValidRevalidatePath(path: string): boolean {
  return /^\/sites\/[a-z0-9-]+\/[a-z]{2}(\/.*)?$/.test(path);
}
```

---

## Documentation

### Code Comments

**When to comment:**

- Complex algorithms or business logic
- Non-obvious TypeScript patterns
- Security-critical sections
- Public APIs and utilities

**When NOT to comment:**

- Self-explanatory code
- Obvious operations

```typescript
// ✅ GOOD: Explains non-obvious behavior
// Transform roles: flatten nested arrays and replace underscores with hyphens
const roles =
  rawMember.roles && rawMember.roles.length > 0
    ? rawMember.roles[0].map((role: string) => role.replace(/_/g, '-'))
    : [];

// ❌ BAD: States the obvious
// Set the name variable to the user's name
const name = user.name;
```

### JSDoc for Public APIs

```typescript
/**
 * Fetch multiple items in parallel with automatic fallback handling
 *
 * @template T - The type of items to fetch
 * @template R - The type of result returned by the fetch function
 * @param items - Array of items to fetch
 * @param fetchFn - Async function that fetches a single item
 * @param fallback - Optional fallback value for failed fetches
 * @param context - Optional context string for logging
 * @returns Array of successfully fetched results
 *
 * @example
 * const articles = await batchFetchWithFallback(
 *   articleIds,
 *   (id) => fetchArticle(id),
 *   null,
 *   'Articles'
 * );
 */
export async function batchFetchWithFallback<T, R>(...) { /* ... */ }
```

---

## Git Commit Standards

### Conventional Commits

Format: `<type>(<scope>): <description>`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `docs`: Documentation only
- `style`: Code style/formatting (no logic change)
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, tooling

**Examples:**

```
feat(articles): add ISR caching strategy
fix(middleware): validate journalId format
refactor(services): extract board transforms to utility
perf(api): add exponential backoff to retries
docs(isr): document revalidation strategies
```

---

## Testing

### Test Organization

```
src/
  components/
    ArticleCard/
      ArticleCard.tsx
      ArticleCard.test.tsx  # Co-located with component
  services/
    article.ts
    article.test.ts       # Co-located with service
```

### Test Patterns

```typescript
describe('fetchArticles', () => {
  it('should return articles when API succeeds', async () => {
    // Arrange
    const mockArticles = [{ id: 1, title: 'Test' }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 'hydra:member': mockArticles }),
    });

    // Act
    const result = await fetchArticles({ rvcode: 'test', page: 1, itemsPerPage: 10 });

    // Assert
    expect(result.data).toEqual(mockArticles);
  });

  it('should return empty array when API fails', async () => {
    // Arrange
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

    // Act
    const result = await fetchArticles({ rvcode: 'test', page: 1, itemsPerPage: 10 });

    // Assert
    expect(result.data).toEqual([]);
  });
});
```

---

## Related Documentation

- [ISR Strategy](./ISR_STRATEGY.md) - Detailed ISR configuration guide
- [CLAUDE.md](../CLAUDE.md) - Project overview and AI assistant instructions
- [Next.js 16 Documentation](https://nextjs.org/docs) - Official Next.js docs

---

## Revision History

| Date       | Version | Changes                                |
| ---------- | ------- | -------------------------------------- |
| 2025-01-08 | 1.0     | Initial coding standards documentation |
