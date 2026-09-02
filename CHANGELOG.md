# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Types of changes

- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for soon-to-be removed features.
- **Removed** for now removed features.
- **Fixed** for bug fixes.
- **Security** for vulnerabilities.

Usually the right type is clear. Three of them cause the most questions:

- **Fixed**: the behavior was wrong, and is now correct.
- **Changed**: the behavior worked as intended, and now works differently.
- **Security**: the change addresses a vulnerability. It could fit under Fixed or Changed, but its urgency and audience are different.

## [Unreleased]

### Added

- **Nakala IIIF Repository Preview**: Added a provider-agnostic repository preview architecture and an interactive Nakala IIIF embedded viewer for linked dataset publications on article detail pages. Related-item metadata is resolved server-side (keeping client `connect-src` CSP strict) and loaded into a sandboxed `ExternalEmbedViewer` on-demand upon user interaction.
- **HTTPS Development Script**: Added `npm run dev:https` script leveraging Next.js experimental HTTPS to enable local testing of embedded iframes governed by HTTPS `frame-ancestors` policies (such as Nakala).
- **Semantic Decorative Accent Token**: Added `--accent-border` CSS variable (aliasing raw `--primary`) across card banners, sidebars, modals, and footers to maintain vibrant journal branding without dark WCAG contrast overrides intended for text/functional borders.
- **Generic Iframe Loading Hook**: Extracted `useIframeLoadState` hook managing iframe loading, error, timeout, and retry states for embedded viewers.
- **Journal Subtitle Markdown Formatting**: Added inline Markdown support (`*italic*` / `_italic_`, `**bold**` / `__bold__`, and `***bold italic***` / `___bold italic___`) for journal subtitles in both client and server Header components via a dedicated XSS-safe inline rendering utility.
- **Mathematics Subject Classification (MSC 2020)**: Added MSC 2020 classification section on article detail pages below keywords, with classification codes linking to zbmath.org (sourced from API classifications).
- **Responsive Mobile Navigation**: Added a mobile burger menu for header navigation on smaller screen viewports.
- **News Link Styling**: Added underline styling for links in news card content to improve readability and visual cues.
- **Code Quality & SonarQube Scan**: Added local SonarQube analysis target (`make sonar`) with automated coverage reporting.
- **Satcom Preprod Configuration**: Added pre-production journal profile for `satcom-preprod`.

### Changed

- **CSP Frame-Ancestors & Frame-Src**: Updated Nginx Content Security Policy templates to authorize `frame-src https://api.nakala.fr` for Nakala embeds, backed by automated CSP provider test assertions.
- **Search Submit Icon Color**: Switched search submit button external link icon to `currentColor` (`ExternalLinkIcon`) to adapt dynamically to the theme's `--button-text-on-primary-bg`.
- **Prettier Code Formatting**: Formatted codebase and test suites via Prettier.
- **Journal Subtitle Styling & Typography**: Removed default italic style and opacity reduction on journal subtitles in the Header, allowing plain text by default and increased font size to 30px.
- **Configurable Article Cache TTL**: Updated article detail and list pages to delegate ISR cache duration to `CACHE_TTL_ARTICLES` (default: 3600s, configurable via environment variables) instead of a hardcoded 7-day TTL, with `next: { revalidate, tags }` wired across `fetchArticle`, `fetchArticleMetadata`, and `fetchExportLink` while preserving on-demand revalidation.
- **Search Result Article Enrichment Cache**: Disabled Next.js Data Cache (`cache: 'no-store'`) on article detail lookups within search results to prevent caching stale or cross-journal search-enriched article data.
- **Server Component Error Propagation**: Moved JSX rendering out of `try/catch` blocks in server components to allow React and Next.js error boundaries to handle rendering failures natively.
- **Hydration State Management**: Added `useIsHydrated` hook to manage client hydration state cleanly, replacing mount-guard `useEffect` patterns.
- **Single SVG Journal Logos**: Simplified journal logo management by using a single SVG per journal instead of separate big/small versions.
- **Responsive Header & Footer**: Improved header and footer layout to prevent layout shifts across devices, with flexible search bar width and adjusted mobile preheader layout.
- **Framework & Dependencies Upgrade**: Upgraded Next.js to 16.3.0 and React to 19.2.8.
- **Next.js 16 Proxy Routing**: Renamed `middleware.ts` to `proxy.ts` conforming to Next.js 16 conventions and Node.js runtime.
- **ESLint Flat Config**: Migrated ESLint configuration to flat config (`eslint.config.js`).
- **Client State Derivation**: Refactored list and client components to derive state during render instead of relying on `useEffect` synchronization, reducing re-renders and hydration glitches.
- **Dropdown Component Architecture**: Split `InteractiveDropdown` into explicit variants.

### Fixed

- **Mobile Modal & Filter Panel Heights**: Fixed bottom-sheet modals (`ArticlesMobileModal`, `ArticlesAcceptedMobileModal`, `NewsMobileModal`, `StatisticsMobileModal`, `VolumeDetailsMobileModal`) collapsing or leaving gaps above the page footer by setting `position: fixed` with viewport-relative boundaries (`top`/`bottom: 0`).
- **Volumes Mobile Modal Layout & Selectors**: Fixed broken class name prefixes in `VolumesMobileModal`, restored styling selectors, corrected document type translation keys (`type.labelPath`), and normalized button styles.
- **Markdown Inline AST Parser**: Fixed inline markdown formatting parsing via AST traversal to correctly handle nested and repeated delimiter tags without regex failure or ReDoS vulnerabilities.
- **Nakala Preview Error Handling & Embargo**: Hardened repository preview against malformed related-item URLs (avoiding page crashes) and unparseable embargo dates (defaulting to fail-closed/hidden).
- **Paper ID Percent-Encoding**: Ensured `paperid` is consistently percent-encoded in API metadata and export fetches (`fetchArticleMetadata`, `fetchExportLink`).
- **Search Bar Test Mock**: Fixed stale mock icon export in `SearchBar.test.tsx`.
- **Code Quality & Cognitive Complexity**: Resolved SonarQube code smells, cognitive complexity, and S-rules across 50+ components and tests.
- **Board Dependencies**: Aligned `boardsPerTitle` `useMemo` dependencies in `BoardsClient`.
- **Test Suite Coverage**: Added comprehensive unit test coverage for layouts, feed routes, and server components, raising test coverage to >82%.
- **Cross-Journal Access Guard**: Centralized cross-journal access protection across article details, downloads, preview, and linksets.
- **Footer Publishing Policy Link**: Fixed malformed URL (e.g. `/en/enabout`) caused by manually prefixing the language locale in `Footer`/`FooterServer`, duplicating the prefix already applied by the shared `Link` component's localization, and corrected the English anchor to `#publishing-policy` (singular).

### Security

- **Nanoid Vulnerability Remediation**: Updated dependency override for `nanoid` to `>=3.3.18` to resolve vulnerability GHSA-2v37-7h3g-55p8.

## [v1] - 2026-08-25

### Added

- **FAIR Signposting (Levels 1 & 2)**: Added metadata signposting on article pages to comply with open science repository interoperability standards (FAIRiCat) and enable automated notifications via COAR Notify.
- **Metadata Export**: Added route handlers for exporting article metadata in multiple XML/JSON formats to allow external search engines and catalog indexing.
- **Valkey Distributed Cache**: Implemented a Valkey-based distributed cache handler to improve performance and speed up page load times under Incremental Static Regeneration (ISR).
- **Ansistrano Deployment Orchestration**: Introduced Ansible/Ansistrano deployment scripts and Makefile targets to automate and secure multi-server deployments.
- **For Editors Page**: Added a dedicated "For Editors" page under the Publish menu to provide specific guidelines for journal editors.
- **Proposing Special Issues Page**: Added a page to explain the process of pitching and managing special issues for journals.
- **Nginx Production Configuration**: Integrated a production Nginx configuration with a strict Content Security Policy (CSP) to enhance front-end security and mitigate XSS risks.
- **Internal RSS/Atom Proxies**: Implemented internal caching proxy routes for RSS/Atom feeds to protect backend endpoints from heavy load while providing fast feed responses.
- **CLOCKSS Archival Permission**: Added CLOCKSS metadata permission statement to every page to support digital preservation harvesting.
- **Schema.org JSON-LD Structured Data**: Injected Schema.org JSON-LD metadata across pages (`WebSite`, `Periodical`, `Organization` on homepage, `ScholarlyArticle` on article details, `BreadcrumbList` on breadcrumbs, and `WebPage`/`CollectionPage` on secondary and accessibility pages) to improve search engine indexing and SEO.
- **Search Engine Indexing Control**: Added support for `NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING=false` in journal configuration to block web crawler indexing where required.
- **Last Updated Date on Editorial Pages**: Added display of the last modification date on API-driven editorial pages (`/about`, `/for-authors`).
- **Journal Subtitle in Header**: Displayed the journal subtitle in the expanded banner header.
- **Editorial Board Copyeditor Role**: Added support for the `copyeditor` role with localized labels (`fr`, `en`, `es`).
- **Build Metadata Generator Tag**: Added a meta `generator` tag including current branch and commit information.

### Changed

- **Framework Upgrades**: Upgraded the project to Next.js 16.2 and React 19 to benefit from latest performance optimizations and future-proof the codebase. **[BREAKING CHANGE]** Dropped support for Node.js versions older than 22.
- **Local Font Hosting**: Migrated from Google Fonts to local `next/font/local` using subsetted Woff2 files (adding Arabic support) to improve load performance and eliminate font-swap layout shifts (CLS).
- **Centralized Logger Integration**: Replaced standard `console` calls with a structured logger (`src/lib/logger.ts`) to improve server log traceability in production.
- **UI Components Refactoring**: Split card components (`BoardCard`, `NewsCard`, `VolumeCard`) into separate list/tile layouts to allow clean responsive views on different devices.
- **Server-side Theme Configuration**: Injected CSS custom properties and theme metadata during server-side rendering to eliminate client-side hydration visual jumps (CLS).
- **Enhanced Citation Exports**: Added AMS, IEEE, and Vancouver formats to the article citation dropdown to accommodate different academic disciplines.
- **Streamlined PDF Downloads**: Replaced proxy redirects with a direct streaming `/download` route that opens PDFs in a new tab, preventing blank page redirects and improving accessibility.
- **Dynamic Homepage Layouts**: Updated configuration parser to allow journals to dynamically toggle homepage sections (news, volumes) based on their specific configuration without code changes.
- **Article Section Ordering**: Inverted the display order of sections on the article page: the PDF preview block now appears before the bibliographic references section.
- **Dynamic Page Titles**: Sourced journal titles dynamically from API metadata instead of hardcoded 'Episciences' in page title templates.
- **Scientific Advisory Board Ordering**: Displayed scientific advisory board before editorial board on the boards page.
- **Development Server Port**: Changed default development server port from `8080` to `5000` in `package.json` to prevent port conflicts with local Docker services.

### Fixed

- **React 19 Hydration Conflicts**: Fixed React 19 warnings by moving i18next instantiation and translation additions out of the component render cycle, preventing discrepancies between server and client rendering.
- **Language Dropdown Placement**: Corrected the positioning of the language selector menu to prevent it from overflowing past the right edge of the screen on smaller resolutions.
- **Middleware Redirection Loop**: Resolved an infinite rewrite loop in the multi-tenant routing middleware that caused HTTP 431 errors on certain hostname configurations.
- **PDF Preview Hydration Race Condition**: Fixed a race condition in `PDFProxyIframe` that prevented article PDFs from displaying in the preview frame on slow connections.
- **Editorial Board Photos Distortion**: Applied `object-fit: cover` to board member images to prevent photo distortion when aspect ratios differ.
- **Board Members Without CMS Page & Card Expansion**: Ensured board members with no configured CMS page are rendered in a fallback group, and resolved card expansion/blur state sharing across multiple board groups.
- **For-Authors Page Rendering & Collapsible Sections**: Extracted Markdown heading text recursively to avoid truncating formatted headings, prevented the page title from creating an empty section, kept collapsed section headers visible, replaced `useEffect` loading flicker with `useMemo`, and memoized Markdown renderer components to prevent unwanted subtree remounts.
- **Indexing Page Shared Mixin Styling**: Restored shared markdown-page styling on the Indexing page by extracting common rules into a reusable SCSS mixin (`_markdown-page-mixin.scss`).
- **API Proxy Path Encoding**: Replaced character-stripping sanitization with RFC-compliant percent-encoding on proxy path segments, preserving spaces and accented characters in author search queries.
- **Markdown Table Cells Color**: Removed forced `--primary-text` color from table cells, allowing `tbody` cells to inherit standard text colors.
- **Articles & Volumes Deduplication**: Deduplicated article counts when articles belong to multiple volumes, and deduplicated author articles keeping highest version.
- **Chrome PDF Viewer Display**: Fixed intermittent "This content is blocked" error in Chrome PDF viewer preview.
- **Homepage News Date**: Restored the publication date in the news block on the homepage.
- **Sign-in Redirection**: Appended `/user/login` to the base manager URL for the header sign-in link.
- **Localized Pagination**: Localized pagination control `aria-labels` and moved them from SVG icons to the link elements themselves to improve accessibility (WCAG).
- **Search Inputs Focus**: Restored visible keyboard focus outlines on search inputs in the header and authors pages to comply with WCAG 2.4.7.
- **Document Language Sync**: Updated `html` tag `lang` attribute dynamically to sync with the active language on page mount and navigation, preventing incorrect screen reader announcements (WCAG 3.1.1).
- **Markdown List Rendering**: Removed automatic Markdown list-nesting heuristic that broke flat definition lists (such as the "Editorial definition" section on the About page).
- **Special Issue Filter**: Fixed the `special_issue` filter parameter in the homepage volumes fetch.
- **Request Cancellation**: Properly aborted timed-out upstream HTTP requests in the global fetch interceptor via `AbortController` (combining signals with `AbortSignal.any`) and fixed request recreation bugs.
- **API Proxy Timeout**: Implemented a 15-second upstream timeout on the dynamic API proxy route to prevent hung connections.
- **PDF Download Route Reliability**: Added `force-dynamic`, header encoding, sanitized logging, and error detail preservation to the article PDF download route.
- **Ansistrano Rollback**: Ensured systemd service restart after Ansistrano rollback.
- **Section Details Title**: Displayed the actual localized section title on section details pages (`/sections/[id]`) instead of a static "Section {id}" heading.
- **Deterministic Build ID**: Sourced the Git commit SHA from Ansistrano's repository cache (`NEXT_BUILD_GIT_SHA`) as a deterministic build ID to prevent Valkey cache thrashing across multi-server deployments.
- **For-Authors Page Caching**: Wired `CACHE_TTL.pages` and tag-based revalidation into `for-authors` service fetches to align with other static editorial pages.
- **Next.js 16 Cache Handler Compatibility**: Updated the custom Valkey `CacheHandler` to extract page revalidation TTL from `ctx.cacheControl.revalidate`, matching Next.js 16 API changes.

### Security

- **Dependency Vulnerability Remediation**: Resolved 9 high-severity advisories across project dependencies via `npm audit fix` (upgraded Next.js to 16.3.0, along with patches for PostCSS, Sharp, Undici, JS-YAML, Nanoid, Immutable, Brace-Expansion, and SVGO).
- **IP Header Sanitization**: Strengthened `sanitizeIp` with structural IPv4/IPv6 validation to prevent IP spoofing through fake proxy headers.
- **Hostname Substring Bypass**: Fixed a vulnerability in the middleware routing that could allow unauthorized domains to bypass tenant lookup if their hostname contained a valid tenant name as a substring.
- **Path Containment Enforcement**: Added strict path resolution checks when loading journal configs to prevent directory traversal and local file read vulnerabilities.
- **SSRF Mitigation**: Implemented strict domain validation on the PDF preview proxy to prevent Server-Side Request Forgery (SSRF).
- **CodeQL Remediation**: Resolved 30 security alerts flagged by CodeQL (including log injection protection and timing attacks) to harden the application against standard exploits.
- **Article ID Validation**: Enforced strict validation (`/^\d+$/`) on article IDs and added percent-encoding on paper IDs in all upstream API fetching, downloading, and previewing routes to prevent path and query injection.
- **Client IP Resolution**: Switched client IP resolution to prefer `X-Real-IP` set by the trusted reverse proxy over the spoofable `X-Forwarded-For` header.
- **Config Hardening**: Hardened Next.js configuration by making the `/api-proxy/:path*` rewrite opt-in (disabled by default unless `API_PROXY_TARGET` is set) and disabling the `x-powered-by` header.
- **Path Isolation**: Blocked direct access to internal `/sites/` paths in Nginx templates to prevent bypassing hostname-based journal validation.
- **Memory Optimization**: Prevented potential unbound cache growth by no longer caching invalid journal codes when loading configurations.

### Removed

- **Duplicate CSP Headers**: Removed Content Security Policy (CSP) and HSTS definitions from Next.js config to avoid duplicate header conflicts, since these are now managed by Nginx upstream.
- **Unused Preconnect Hints**: Removed obsolete preconnect and dns-prefetch tags to clean up page headers and prevent unnecessary DNS lookups.
