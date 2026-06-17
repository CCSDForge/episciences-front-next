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

- MSC 2020 (Mathematics Subject Classification) section on article detail pages, displayed below Keywords. Classification codes link to zbmath.org. Data sourced from `document.database.current.classifications.msc2020` in the API response.
- Mobile burger menu for header navigation on small screens.
- Underline styling for links in news card content.
- **FAIR Signposting (Levels 1 & 2)**: Added metadata signposting on article pages to comply with open science repository interoperability standards (FAIRiCat) and enable automated notifications via COAR Notify.
- **Metadata Export**: Added route handlers for exporting article metadata in multiple XML/JSON formats to allow external search engines and catalog indexing.
- **Valkey Distributed Cache**: Implemented a Valkey-based distributed cache handler to improve performance and speed up page load times under Incremental Static Regeneration (ISR).
- **Ansistrano Deployment Orchestration**: Introduced Ansible/Ansistrano deployment scripts and Makefile targets to automate and secure multi-server deployments.
- **For Editors Page**: Added a dedicated "For Editors" page under the Publish menu to provide specific guidelines for journal editors.
- **Proposing Special Issues Page**: Added a page to explain the process of pitching and managing special issues for journals.
- **Nginx Production Configuration**: Integrated a production Nginx configuration with a strict Content Security Policy (CSP) to enhance front-end security and mitigate XSS risks.
- **Internal RSS/Atom Proxies**: Implemented internal caching proxy routes for RSS/Atom feeds to protect backend endpoints from heavy load while providing fast feed responses.

### Changed

- Simplified journal logo management by using a single SVG per journal instead of separate big/small versions.
- Improved header and footer rendering to prevent layout shifts and ensure correct logo sizing across all devices.
- Header preheader layout adjusts to `flex-end` on mobile, search bar is now flexible width on small screens.
- **Framework Upgrades**: Upgraded the project to Next.js 16.2 and React 19 to benefit from latest performance optimizations and future-proof the codebase. **[BREAKING CHANGE]** Dropped support for Node.js versions older than 22.
- **Local Font Hosting**: Migrated from Google Fonts to local `next/font/local` using subsetted Woff2 files (adding Arabic support) to improve load performance and eliminate font-swap layout shifts (CLS).
- **Centralized Logger Integration**: Replaced standard `console` calls with a structured logger (`src/lib/logger.ts`) to improve server log traceability in production.
- **UI Components Refactoring**: Split card components (`BoardCard`, `NewsCard`, `VolumeCard`) into separate list/tile layouts to allow clean responsive views on different devices.
- **Server-side Theme Configuration**: Injected CSS custom properties and theme metadata during server-side rendering to eliminate client-side hydration visual jumps (CLS).
- **Enhanced Citation Exports**: Added AMS, IEEE, and Vancouver formats to the article citation dropdown to accommodate different academic disciplines.
- **Streamlined PDF Downloads**: Replaced proxy redirects with a direct streaming `/download` route that opens PDFs in a new tab, preventing blank page redirects and improving accessibility.
- **Dynamic Homepage Layouts**: Updated configuration parser to allow journals to dynamically toggle homepage sections (news, volumes) based on their specific configuration without code changes.

### Fixed

- **React 19 Hydration Conflicts**: Fixed React 19 warnings by moving i18next instantiation and translation additions out of the component render cycle, preventing discrepancies between server and client rendering.
- **Language Dropdown Placement**: Corrected the positioning of the language selector menu to prevent it from overflowing past the right edge of the screen on smaller resolutions.
- **Middleware Redirection Loop**: Resolved an infinite rewrite loop in the multi-tenant routing middleware that caused HTTP 431 errors on certain hostname configurations.
- **PDF Preview Hydration Race Condition**: Fixed a race condition in `PDFProxyIframe` that prevented article PDFs from displaying in the preview frame on slow connections.
- **Editorial Board Photos Distortion**: Applied `object-fit: cover` to board member images to prevent photo distortion when aspect ratios differ.

### Security

- **IP Header Sanitization**: Strengthened `sanitizeIp` with structural IPv4/IPv6 validation to prevent IP spoofing through fake proxy headers.
- **Hostname Substring Bypass**: Fixed a vulnerability in the middleware routing that could allow unauthorized domains to bypass tenant lookup if their hostname contained a valid tenant name as a substring.
- **Path Containment Enforcement**: Added strict path resolution checks when loading journal configs to prevent directory traversal and local file read vulnerabilities.
- **SSRF Mitigation**: Implemented strict domain validation on the PDF preview proxy to prevent Server-Side Request Forgery (SSRF).
- **CodeQL Remediation**: Resolved 30 security alerts flagged by CodeQL (including log injection protection and timing attacks) to harden the application against standard exploits.

### Removed

- **Duplicate CSP Headers**: Removed Content Security Policy (CSP) and HSTS definitions from Next.js config to avoid duplicate header conflicts, since these are now managed by Nginx upstream.
- **Unused Preconnect Hints**: Removed obsolete preconnect and dns-prefetch tags to clean up page headers and prevent unnecessary DNS lookups.
