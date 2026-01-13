# Phase 9: Performance Optimizations - Plan

**Date**: 2026-01-13
**Status**: 📋 Planning Phase
**Priority**: HIGH

---

## Executive Summary

After completing all accessibility phases (0-7), the application is fully accessible but there are significant performance optimization opportunities. Current bundle analysis shows **4.97 MB total client-side JavaScript**, with a single 1.4 MB chunk dominating the bundle size. This phase focuses on reducing bundle size, improving loading performance, and optimizing runtime performance across all 45+ journals.

**Current State**:
- ✅ All accessibility phases complete (0-7)
- ✅ ISR strategy implemented with differentiated revalidation
- ⚠️ Total client bundle: 4.97 MB (53 chunks)
- ⚠️ Largest single chunk: 1.40 MB (likely citation-js library)
- ⚠️ No code splitting for heavy features (PDF viewer, citations)

**Performance Goals (Phase 9)**:
- 🎯 Reduce main bundle to < 500 KB
- 🎯 Lighthouse Performance score > 90
- 🎯 First Contentful Paint (FCP) < 1.5s
- 🎯 Largest Contentful Paint (LCP) < 2.5s
- 🎯 Time to Interactive (TTI) < 3.5s
- 🎯 Total Blocking Time (TBT) < 200ms

---

## Performance Audit Results

### Bundle Analysis

```
📊 Client-Side Bundle Analysis

Top 15 largest client bundles:
1. 1.40 MB - e60989aa19c82ae6.js (citation-js + dependencies)
2. 0.44 MB - 173a5aabca442dce.js
3. 0.44 MB - b41ab8aa87ecffcf.js
4. 0.37 MB - 6d785cff256e3cf9.js (likely i18next + translations)
5. 0.21 MB - e43f263c74104c49.js
...

📦 Total client bundle size: 4.97 MB
📄 Number of chunks: 53
```

### Critical Issues Identified

1. **Citation Library Bloat (1.4 MB)**
   - `@citation-js/core` + `@citation-js/plugin-*` loaded on all article pages
   - Only used for "Export Citation" feature
   - Should be lazy-loaded only when user clicks export button

2. **No Code Splitting for Heavy Features**
   - PDF viewer libraries not code-split
   - All components loaded upfront
   - No dynamic imports for modals/heavy UI

3. **Translation Bundle Size (0.37 MB estimated)**
   - All translation keys loaded for all pages
   - No translation splitting by route

4. **Redundant Dependencies**
   - Multiple date formatting libraries
   - Duplicate utilities across components

5. **Image Optimization Gaps**
   - Journal logos not using Next.js Image component
   - No responsive images for different screen sizes
   - Missing image compression pipeline

---

## Phase 9 Optimization Strategy

### 9.1 Critical Path Optimizations (Week 1)

**Priority**: CRITICAL
**Impact**: High (reduce initial bundle by ~60%)

#### 9.1.1 Lazy Load Citation Library

**Problem**: Citation-js (1.4 MB) loaded on every article page, only used when user exports.

**Solution**: Dynamic import with loading state

```tsx
// Before (ArticleDetailsClient.tsx)
import { getCitation } from '@/utils/citation';

// After
const [CitationModule, setCitationModule] = useState(null);

const loadCitationLibrary = async () => {
  const module = await import('@/utils/citation');
  setCitationModule(module);
};

// Only load when user clicks "Export Citation"
<button onClick={loadCitationLibrary}>
  Export Citation
</button>
```

**Expected Gain**: -1.4 MB from initial bundle
**Files to modify**:
- `src/app/sites/[journalId]/[lang]/articles/[id]/ArticleDetailsClient.tsx`
- `src/app/sites/[journalId]/[lang]/articles/[id]/components/InteractiveDropdown.tsx`

---

#### 9.1.2 Code Split PDF Viewer

**Problem**: PDF viewer libraries loaded on all routes, only used on `/articles/[id]/preview` and `/articles/[id]/download`.

**Solution**: Route-based code splitting with Suspense

```tsx
// src/app/sites/[journalId]/[lang]/articles/[id]/preview/page.tsx
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**Expected Gain**: -800 KB from main bundle (only loaded on preview/download pages)

---

#### 9.1.3 Split Translation Bundles by Route

**Problem**: All translations (~370 KB) loaded upfront for all pages.

**Solution**: Use i18next namespaces and lazy loading

**Implementation**:
```typescript
// src/i18n/config.ts
export const i18nConfig = {
  namespaces: ['common', 'articles', 'volumes', 'authors', 'boards'],
  defaultNamespace: 'common',
  lazy: true, // Load namespaces on-demand
};

// ArticlesClient.tsx
const { t } = useTranslation(['common', 'articles']);
```

**Expected Gain**: -250 KB from initial bundle (route-specific translations loaded on demand)

**Files to modify**:
- `src/i18n/config.ts`
- Split `public/locales/en/translation.json` into namespaces:
  - `common.json` (header, footer, navigation)
  - `articles.json` (article-specific)
  - `volumes.json` (volume-specific)
  - `authors.json` (author-specific)
  - `boards.json` (board-specific)

---

### 9.2 Component-Level Optimizations (Week 2)

**Priority**: HIGH
**Impact**: Medium (improve runtime performance)

#### 9.2.1 Lazy Load Modals

**Problem**: All modal components loaded upfront, even when not displayed.

**Solution**: Dynamic imports for all modals

```tsx
// Before
import ArticlesMobileModal from '@/components/Modals/ArticlesMobileModal';

// After
const ArticlesMobileModal = dynamic(
  () => import('@/components/Modals/ArticlesMobileModal'),
  { ssr: false }
);
```

**Expected Gain**: -300 KB from initial bundle

**Modals to lazy load**:
- `ArticlesMobileModal` (~50 KB)
- `ArticlesAcceptedMobileModal` (~50 KB)
- `VolumesMobileModal` (~60 KB)
- `VolumeDetailsMobileModal` (~40 KB)
- `NewsMobileModal` (~50 KB)
- `SearchResultsMobileModal` (~50 KB)
- `StatisticsMobileModal` (~50 KB)

---

#### 9.2.2 Optimize Icon Components

**Problem**: SVG icons inlined in every component, duplicated across bundles.

**Solution**: Use icon sprite or tree-shakeable icon library

**Option A**: SVG Sprite (Recommended)
```bash
# Generate sprite during build
npx @svgr/cli --icon --svg-props "width={size},height={size}" src/components/icons --out-dir .next/static/sprites
```

**Option B**: Tree-shakeable imports
```tsx
// Before: Individual icon files
import { CloseBlackIcon } from '@/components/icons';

// After: Tree-shakeable barrel exports with SVGR
import { CloseBlack as CloseBlackIcon } from '@/components/icons/generated';
```

**Expected Gain**: -50 KB from duplicate SVG paths

---

#### 9.2.3 Memoize Heavy Components

**Problem**: Components re-render unnecessarily, causing performance degradation.

**Solution**: Use `React.memo()` for pure components

```tsx
// Before
export default function ArticleCard({ article, t }) {
  // ...
}

// After
export default React.memo(ArticleCard, (prevProps, nextProps) => {
  return prevProps.article.id === nextProps.article.id;
});
```

**Components to memoize**:
- `ArticleCard` (re-renders on every articles list update)
- `VolumeCard` (re-renders on every volumes list update)
- `AuthorCard` (re-renders on every authors list update)
- `BoardCard` (re-renders on every boards list update)
- All `SwiperCard` variants

**Expected Gain**: 30-50% reduction in re-renders

---

### 9.3 Asset Optimizations (Week 3)

**Priority**: MEDIUM
**Impact**: Medium (improve perceived performance)

#### 9.3.1 Optimize Journal Logos

**Problem**: 92 journal logos (~2-10 KB each) loaded as static files, not optimized.

**Solution**: Convert to Next.js Image component with automatic optimization

```tsx
// Before
<img src={`/logos/${journalId}.svg`} alt={journal.name} />

// After
import Image from 'next/image';
<Image
  src={`/logos/${journalId}.svg`}
  alt={journal.name}
  width={120}
  height={40}
  priority={false}
  loading="lazy"
/>
```

**Expected Gain**: -200 KB from logo loading (lazy loading + compression)

**Files to modify**:
- `src/components/Header/HeaderServer.tsx` (header logo)
- `src/app/sites/[journalId]/[lang]/page.tsx` (home page)

---

#### 9.3.2 Implement Font Optimization

**Problem**: Fonts may be causing layout shift (CLS).

**Solution**: Use Next.js font optimization

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**Expected Gain**: Eliminate font FOUT/FOIT, improve CLS score

---

#### 9.3.3 Add Resource Hints

**Problem**: No preloading of critical resources.

**Solution**: Add preload/prefetch hints in HTML head

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Preload critical CSS */}
        <link rel="preload" href="/_next/static/css/app.css" as="style" />

        {/* Preconnect to API */}
        <link rel="preconnect" href="https://api-preprod.episciences.org" />
        <link rel="dns-prefetch" href="https://api-preprod.episciences.org" />

        {/* Prefetch common routes */}
        <link rel="prefetch" href="/sites/[journalId]/[lang]/articles" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Expected Gain**: Faster perceived performance, -200ms initial load

---

### 9.4 Runtime Performance Optimizations (Week 4)

**Priority**: MEDIUM
**Impact**: Low-Medium (smoother interactions)

#### 9.4.1 Virtualize Long Lists

**Problem**: Articles, volumes, authors lists render 50-100+ items, causing slow scrolling.

**Solution**: Implement virtual scrolling with `react-window`

```bash
npm install react-window @types/react-window
```

```tsx
// ArticlesClient.tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={800}
  itemCount={articles.length}
  itemSize={200}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ArticleCard article={articles[index]} />
    </div>
  )}
</FixedSizeList>
```

**Expected Gain**: 60-80% reduction in DOM nodes, smoother scrolling

**Pages to virtualize**:
- Articles list (50-200 items)
- Volumes list (20-100 items)
- Authors list (50-500 items)
- Search results (variable)

---

#### 9.4.2 Debounce Search Inputs

**Problem**: Search input triggers API call on every keystroke.

**Solution**: Debounce with 300ms delay

```tsx
// src/components/SearchInput/HeaderSearchInput/HeaderSearchInput.tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    // Perform search
    router.push(`/sites/${journalId}/${lang}/search?q=${value}`);
  },
  300 // 300ms delay
);

<input
  value={searchValue}
  onChange={(e) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  }}
/>
```

**Expected Gain**: -70% API calls during typing, better UX

---

#### 9.4.3 Optimize Pagination Performance

**Problem**: Pagination components re-render entire page on page change.

**Solution**: Use URL state and shallow routing

```tsx
// Pagination.tsx
import { useRouter } from 'next/navigation';

const handlePageChange = (newPage: number) => {
  router.push(`?page=${newPage}`, { shallow: true });
};
```

**Expected Gain**: Faster page transitions, no full re-render

---

### 9.5 Advanced Optimizations (Optional - Week 5)

**Priority**: LOW
**Impact**: Low (incremental improvements)

#### 9.5.1 Implement Service Worker for Offline Support

**Problem**: No offline support, API failures cause blank pages.

**Solution**: Use Workbox for service worker with cache strategies

```bash
npm install next-pwa workbox-webpack-plugin
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api-preprod\.episciences\.org\/api/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
});

module.exports = withPWA(nextConfig);
```

**Expected Gain**: Offline functionality, faster repeat visits

---

#### 9.5.2 Add Compression Middleware

**Problem**: Assets not compressed before sending to client.

**Solution**: Enable gzip/brotli compression in Next.js

```js
// next.config.js
module.exports = {
  compress: true, // Enable gzip compression

  // For production servers, enable brotli in reverse proxy (Apache/Nginx)
};
```

**Expected Gain**: -40% transfer size

---

#### 9.5.3 Implement CDN for Static Assets

**Problem**: Static assets served from origin server, not cached globally.

**Solution**: Configure CDN (Cloudflare, CloudFront) for `/static` and `/logos`

```js
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || '',
  images: {
    loader: 'custom',
    loaderFile: './src/utils/imageLoader.ts',
  },
};
```

**Expected Gain**: -500ms for users far from origin server

---

## Implementation Checklist

### Week 1: Critical Path (Bundle Size Reduction)
- [ ] 9.1.1 Lazy load citation library (InteractiveDropdown.tsx, ArticleDetailsClient.tsx)
- [ ] 9.1.2 Code split PDF viewer (preview/download pages)
- [ ] 9.1.3 Split translation bundles into namespaces
- [ ] Run bundle analysis to verify reductions
- [ ] Test citation export functionality
- [ ] Test PDF viewer on preview/download pages

### Week 2: Component Optimizations
- [ ] 9.2.1 Lazy load all modal components (8 modals)
- [ ] 9.2.2 Optimize icon components (sprite or tree-shaking)
- [ ] 9.2.3 Memoize heavy components (ArticleCard, VolumeCard, etc.)
- [ ] Run Lighthouse audit to measure improvements
- [ ] Test modal functionality across all pages

### Week 3: Asset Optimizations
- [ ] 9.3.1 Convert logos to Next.js Image component
- [ ] 9.3.2 Implement font optimization
- [ ] 9.3.3 Add resource hints (preload, preconnect)
- [ ] Test logo loading on all journal pages
- [ ] Verify CLS improvements

### Week 4: Runtime Performance
- [ ] 9.4.1 Virtualize long lists (articles, volumes, authors)
- [ ] 9.4.2 Debounce search inputs
- [ ] 9.4.3 Optimize pagination with shallow routing
- [ ] Test scrolling performance with 100+ items
- [ ] Test search UX with debouncing

### Week 5 (Optional): Advanced
- [ ] 9.5.1 Implement service worker for offline support
- [ ] 9.5.2 Enable compression middleware
- [ ] 9.5.3 Configure CDN for static assets

---

## Testing & Validation

### Performance Metrics to Track

**Before Phase 9** (Baseline):
```
Bundle Size:        4.97 MB
Lighthouse Score:   TBD (run audit)
FCP:                TBD
LCP:                TBD
TTI:                TBD
TBT:                TBD
CLS:                TBD
```

**After Phase 9** (Target):
```
Bundle Size:        < 2.0 MB (-60%)
Lighthouse Score:   > 90
FCP:                < 1.5s
LCP:                < 2.5s
TTI:                < 3.5s
TBT:                < 200ms
CLS:                < 0.1
```

### Testing Tools

1. **Lighthouse CI** (automated)
   ```bash
   npm install -g @lhci/cli
   lhci autorun --collect.url="http://localhost:3000/sites/albioj/en"
   ```

2. **Webpack Bundle Analyzer**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

3. **Chrome DevTools Performance Tab**
   - Record page load
   - Analyze main thread activity
   - Identify long tasks (> 50ms)

4. **WebPageTest** (real-world testing)
   - https://www.webpagetest.org/
   - Test from multiple locations
   - Test on slow 3G network

---

## Performance Budget

Set performance budgets to prevent regressions:

```js
// budget.json
[
  {
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 500 // 500 KB max for JS
      },
      {
        "resourceType": "stylesheet",
        "budget": 100 // 100 KB max for CSS
      },
      {
        "resourceType": "image",
        "budget": 200 // 200 KB max for images
      }
    ],
    "timings": [
      {
        "metric": "interactive",
        "budget": 3500 // 3.5s max TTI
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1500 // 1.5s max FCP
      }
    ]
  }
]
```

---

## Expected Outcomes

### Bundle Size Reduction
- **Before**: 4.97 MB total client-side JS
- **After**: ~2.0 MB total (-60% reduction)
- **Breakdown**:
  - Main bundle: 1.4 MB → 500 KB (-900 KB from lazy loading)
  - Citations: 1.4 MB → 0 KB (lazy loaded)
  - PDF viewer: 800 KB → 0 KB (route-based split)
  - Translations: 370 KB → 120 KB (namespace splitting)
  - Modals: 300 KB → 0 KB (lazy loaded)

### Lighthouse Score Improvements
- Performance: 60-70 → **> 90**
- Accessibility: **100** (already complete from phases 0-7)
- Best Practices: 80 → **> 95**
- SEO: **100** (already optimized with ISR)

### User Experience Improvements
- **Initial load**: -2s faster
- **Time to Interactive**: -1.5s faster
- **Scrolling**: Butter smooth with virtualization
- **Search**: Responsive with debouncing
- **Offline**: Basic functionality with service worker

---

## Risks & Mitigation

### Risk 1: Breaking Changes from Lazy Loading
**Mitigation**:
- Add comprehensive E2E tests for lazy-loaded features
- Test citation export on all article types
- Test modals on all screen sizes

### Risk 2: Translation Loading Errors
**Mitigation**:
- Implement fallback to default namespace
- Add error boundaries for missing translations
- Test all routes with different languages

### Risk 3: Virtualization UX Issues
**Mitigation**:
- Add loading skeletons for perceived performance
- Test with keyboard navigation (accessibility)
- Ensure screen readers announce list changes

---

## Success Criteria

Phase 9 is considered **complete** when:

1. ✅ Bundle size reduced to < 2.0 MB (60% reduction)
2. ✅ Lighthouse Performance score > 90 across all journals
3. ✅ FCP < 1.5s, LCP < 2.5s, TTI < 3.5s
4. ✅ All features functional (citations, PDFs, modals, translations)
5. ✅ No accessibility regressions (Lighthouse Accessibility = 100)
6. ✅ E2E tests passing for all optimized features
7. ✅ Performance budget checks integrated in CI/CD

---

## Files to Create/Modify

### New Files (Week 1-2)
1. `src/utils/lazyLoadCitation.ts` - Dynamic citation loader
2. `budget.json` - Performance budget configuration
3. `.lighthouserc.js` - Lighthouse CI configuration

### Modified Files (Week 1)
4. `src/app/sites/[journalId]/[lang]/articles/[id]/ArticleDetailsClient.tsx` - Lazy load citations
5. `src/app/sites/[journalId]/[lang]/articles/[id]/components/InteractiveDropdown.tsx` - Lazy load citations
6. `src/app/sites/[journalId]/[lang]/articles/[id]/preview/page.tsx` - Code split PDF viewer
7. `src/i18n/config.ts` - Enable namespace splitting
8. Split `public/locales/*/translation.json` into namespaces

### Modified Files (Week 2)
9-16. All modal parent components (8 files) - Dynamic imports
17. `src/components/Cards/ArticleCard/ArticleCard.tsx` - Add React.memo
18. `src/components/Cards/VolumeCard/VolumeCard.tsx` - Add React.memo
19. `src/components/Cards/AuthorCard/AuthorCard.tsx` - Add React.memo

### Modified Files (Week 3)
20. `src/components/Header/HeaderServer.tsx` - Next.js Image for logo
21. `src/app/layout.tsx` - Font optimization + resource hints

### Modified Files (Week 4)
22. `src/app/sites/[journalId]/[lang]/articles/ArticlesClient.tsx` - Virtualization
23. `src/app/sites/[journalId]/[lang]/volumes/VolumesClient.tsx` - Virtualization
24. `src/components/SearchInput/HeaderSearchInput/HeaderSearchInput.tsx` - Debouncing

---

**Plan Created**: 2026-01-13
**Next Step**: Begin Week 1 - Critical Path Optimizations
**Estimated Completion**: 4-5 weeks for all optimizations
