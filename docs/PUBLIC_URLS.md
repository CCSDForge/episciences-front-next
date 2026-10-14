# Public URLs Specification & Indexing Guide

This document catalogs all public URLs generated, handled, and exposed by the Episciences Next.js multi-tenant application and its Nginx reverse proxy.

---

## 1. Multi-Tenant Architecture & Language Routing

### 1.1 Hostname Resolution

Episciences operates as a multi-tenant platform where each journal is accessible via its own domain or subdomain:

* **Production**: `https://{journalId}.episciences.org/` (e.g., `https://epijinfo.episciences.org/`)
* **Local Test with Nginx**: `http://{journalId}.episciences.test:8080/` (e.g., `http://epijinfo.episciences.test:8080/`)
* **Local Dev (Node.js)**: `http://localhost:3000/` (falls back to `NEXT_PUBLIC_JOURNAL_RVCODE` or `epijinfo`)

Tenant detection is performed by `src/proxy.ts` (Next.js 16 proxy) and verified against `src/config/journals-generated.ts`.

### 1.2 Language Prefixes & Canonical URLs

Supported platform interface languages include **English (`en`)**, **French (`fr`)**, and **Spanish (`es`)**. Each journal configures its default and accepted languages in `src/config/journals-languages-generated.ts`.

* **With language prefix (`/{lang}/...`)**: The canonical URL pattern generated for search engines always retains the language prefix (e.g., `https://epijinfo.episciences.org/en/articles/1234`).
* **Without language prefix (`/...`)**: URLs requested without a language prefix (e.g., `/articles`, `/about`) are rewritten internally by `src/proxy.ts` to `/{journalId}/{effectiveDefault}/...`. The response sets the `x-detected-language` header and outputs a canonical link pointing to `/{effectiveDefault}/...`.
* **Unsupported language**: If an unaccepted language prefix is requested, the proxy issues an **HTTP 302** redirect to the journal's default language.

---

## 2. Indexing Status Classification

To easily assess SEO and harvesting capabilities, every route is categorized with an indexing status badge:

| Badge | Status | Description |
| :---: | :--- | :--- |
| 🟢 | **Indexable (SEO)** | Primary content intended for search engines (Google, Bing, Google Scholar). Includes canonical tags (`generateSeoAlternates`), Open Graph tags, and structured metadata (`Schema.org`, Highwire Press). Advertised in `/sitemap.xml`. |
| 🔵 | **Harvestable (FAIR / Machine)** | Machine-readable metadata and direct data endpoints intended for academic harvesters, reference managers (Zotero, Mendeley), and open science protocols (FAIR Signposting RFC 9264, COAR Notify). |
| 🔴 | **Non-Indexable (Robots Disallow)** | Explicitly blocked in `src/config/robots.ts` (`ROBOTS_DISALLOW`) via `/robots.txt` to prevent duplicate content or crawl budget exhaustion. |
| ⛔ | **Non-Indexable (Noindex / Private)** | Served with an explicit `X-Robots-Tag: noindex` header, catch-all 404, or blocked by Nginx. |

> ⚠️ **Per-journal indexing toggle**:
> If a journal has `NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING="false"` configured in its environment, `src/app/robots.ts` serves `Disallow: /` for the entire domain, overriding individual page indexability (e.g., for staging or private journals).

---

## 3. Public URL Catalog

### 3.1 Public HTML Pages

All routes below are accessible either prefixed with `/{lang}/...` or directly at root `/...`.

#### Editorial, Institutional & Guide Pages

| URL Pattern | Status | Description | Query Parameters |
| :--- | :---: | :--- | :--- |
| `/{lang}` or `/` | 🟢 | Journal home page | — |
| `/{lang}/about` | 🟢 | About the journal, aims and scope | — |
| `/{lang}/accessibility` | 🟢 | Accessibility declaration (RGAA compliance) | — |
| `/{lang}/acknowledgements`| 🟢 | Acknowledgements and institutional partners | — |
| `/{lang}/credits` | 🟢 | Legal notice, imprint, and platform credits | — |
| `/{lang}/ethical-charter` | 🟢 | Publication ethics and malpractice statement | — |
| `/{lang}/indexing` | 🟢 | Indexing databases (DOAJ, Scopus, WoS, etc.) | — |
| `/{lang}/proposing-special-issues` | 🟢 | Guidelines for proposing special issues | — |
| `/{lang}/for-authors` | 🟢 | Author submission instructions and guidelines | — |
| `/{lang}/for-editors` | 🟢 | Editorial workflow guidelines for editors | — |
| `/{lang}/for-reviewers` | 🟢 | Peer review policies and reviewer guide | — |
| `/{lang}/for-conference-organisers` | 🟢 | Guidelines for conference organizers | — |

#### Boards, Authors, News & Metrics

| URL Pattern | Status | Description | Query Parameters |
| :--- | :---: | :--- | :--- |
| `/{lang}/boards` | 🟢 | Editorial board and scientific advisory committees | — |
| `/{lang}/authors` | 🟢 | Directory of published authors | `?search={str}`, `?letter={char}`, `?page={int}` |
| `/{lang}/news` | 🟢 | Journal news and announcements | — |
| `/{lang}/statistics` | 🟢 | Journal metrics, publication and consultation stats | — |

#### Articles, Volumes & Sections

| URL Pattern | Status | Description | Query Parameters |
| :--- | :---: | :--- | :--- |
| `/{lang}/articles` | 🟢 | Chronological paginated catalog of published articles | `?page={int}` |
| `/{lang}/articles-accepted` | 🟢 | Accepted articles awaiting final volume publication | — |
| `/{lang}/articles/{id}` | 🟢 | **Article landing page** (metadata, abstract, DOI, metrics) | — |
| `/{lang}/volumes` | 🟢 | Catalog of volumes and special issues | — |
| `/{lang}/volumes/{id}` | 🟢 | Volume detail page with table of contents | — |
| `/{lang}/sections` | 🟢 | Catalog of journal sections / rubrics | — |
| `/{lang}/sections/{id}` | 🟢 | Section detail page with associated articles | — |

#### Search

| URL Pattern | Status | Description | Query Parameters |
| :--- | :---: | :--- | :--- |
| `/{lang}/search` | 🔴 | Internal keyword search results | `?q={str}` or `?terms={str}`, `?page={int}` |

---

### 3.2 Academic Metadata & Document Endpoints

These endpoints provide access to full-text PDF documents, FAIR Signposting resources, and structured citations.

| URL Pattern | Status | MIME Type | Description |
| :--- | :---: | :--- | :--- |
| `/{lang}/articles/{id}/download` | 🟢 | `application/pdf` | Full-text article PDF download (Google Scholar target) |
| `/{lang}/articles/{id}/preview` | ⛔ | `application/pdf` | In-browser PDF preview stream (`X-Robots-Tag: noindex`) |
| `/{lang}/articles/{id}/linkset` | 🔵 | `application/linkset+json` | FAIR Signposting Level 1 Linkset (RFC 9264) & COAR Notify inbox |
| `/{lang}/articles/{id}/bibtex` | 🔵 | `application/x-bibtex` | BibTeX citation export (`.bib`) |
| `/{lang}/articles/{id}/ris` | 🔵 | `application/x-research-info-systems` | RIS citation export (`.ris`) |
| `/{lang}/articles/{id}/csl` | 🔵 | `application/vnd.citationstyles.csl+json` | Citation Style Language (CSL) JSON export |
| `/{lang}/articles/{id}/json` | 🔵 | `application/json` | Raw article metadata in JSON format |
| `/{lang}/articles/{id}/json-ld` | 🔵 | `application/json` | Schema.org JSON-LD metadata export |
| `/{lang}/articles/{id}/tei` | 🔵 | `application/xml` | Text Encoding Initiative (TEI) XML export |
| `/{lang}/articles/{id}/dc` | 🔵 | `application/xml` | Dublin Core XML metadata export |
| `/{lang}/articles/{id}/dublin-core` | 🔵 | `application/xml` | Extended Dublin Core XML metadata export |
| `/{lang}/articles/{id}/crossref` | 🔵 | `application/xml` | Crossref schema XML export |
| `/{lang}/articles/{id}/zbjats` | 🔵 | `application/xml` | zbMATH JATS XML export |
| `/{lang}/articles/{id}/doaj` | 🔵 | `application/json` | DOAJ article metadata export |
| `/{lang}/articles/{id}/openaire` | 🔵 | `application/xml` | OpenAIRE schema XML export |

---

### 3.3 Syndication Feeds

Syndication feeds are excluded from search engine indexing to preserve crawl budget and avoid XML rendering issues in search snippets.

| URL Pattern | Status | MIME Type | Description |
| :--- | :---: | :--- | :--- |
| `/{lang}/feed/rss` or `/feed/rss` | 🔴 | `application/rss+xml` | RSS 2.0 feed of recent publications |
| `/{lang}/feed/atom` or `/feed/atom` | 🔴 | `application/atom+xml` | Atom 1.0 feed of recent publications |

---

### 3.4 Application API Routes (`/api/...`)

Internal and proxy API endpoints bypass language detection and are disallowed in `/robots.txt`.

| Route | Methods | Status | Description |
| :--- | :---: | :---: | :--- |
| `/api/pdf-proxy` | `GET`, `OPTIONS` | ⛔ | Secure rate-limited PDF proxy (30 req/min/IP) with `X-Robots-Tag: noindex`. Query params: `url`, `disposition` (`inline`\|`attachment`), `filename`. |
| `/api/proxy/[...path]` | `GET`, `POST` | 🔴 | Upstream API proxy resolving CORS for client-side queries. Requires `rvcode` parameter or `x-journal-code` header. |
| `/api/revalidate` | `POST`, `GET` | 🔴 | ISR on-demand cache revalidation endpoint. Protected by IP whitelist and `x-episciences-token`. |

---

### 3.5 Standard Web Platform & SEO Discovery Files

| URL Pattern | Status | MIME Type | Description |
| :--- | :---: | :--- | :--- |
| `/sitemap.xml` | 🟢 | `application/xml` | XML sitemap referenced in `robots.txt` (served by Nginx in production) |
| `/robots.txt` | 🟢 | `text/plain` | Crawler directives dynamically rendered by `src/app/robots.ts` |
| `/.well-known/api-catalog` | 🔵 | `application/linkset+json` | FAIRiCat machine discovery catalog (Signposting profile) |
| `/site.webmanifest` | ⛔ | `application/manifest+json` | Web application manifest |
| `/favicon.ico` | ⛔ | `image/x-icon` | Default favicon |
| `/favicon-16x16.png`, `/favicon-32x32.png` | ⛔ | `image/png` | Standard PNG favicons |
| `/apple-touch-icon.png` | ⛔ | `image/png` | iOS home screen icon |
| `/android-chrome-192x192.png`, `/android-chrome-512x512.png` | ⛔ | `image/png` | Android Chrome application icons |
| `/mstile-150x150.png` | ⛔ | `image/png` | Windows tile icon |
| `/safari-pinned-tab.svg` | ⛔ | `image/svg+xml` | Safari pinned tab icon |
| `/logo.svg` | ⛔ | `image/svg+xml` | Default vector logo |
| `/icons/*` | ⛔ | `image/svg+xml` | UI interface icons (`search.svg`, `orcid.svg`, `ror.svg`, etc.) |
| `/logos/*` | ⛔ | `image/svg+xml` | Journal-specific SVG logos (`logo-{journalId}.svg`) |
| `/locales/{lang}/*.json` | ⛔ | `application/json` | Client-side i18n translation bundles |
| `/fonts/*` | ⛔ | Font formats | Web fonts |

---

### 3.6 Media & Assets Served Directly by Nginx (Production NFS)

In production, Nginx serves static storage mounts directly, bypassing the Node.js process:

| URL Pattern | Underlying NFS Path | Status | Description |
| :--- | :--- | :---: | :--- |
| `/sitemap.xml` | `/data/epi/<env>/<journal>/sitemap/sitemap.xml` | 🟢 | Journal sitemap file |
| `/public/documents/*` | `/data/epi/<env>/<journal>/public/documents/` | 🟢 | Publicly uploaded journal documents & assets |
| `/volumes-full/*` | `/data/epi/<env>/<journal>/public/volume-pdf/` | 🟢 | Complete compiled volume PDFs |
| `/volumes-doaj/*` | `/data/epi/<env>/<journal>/public/volume-doaj/` | 🔵 | DOAJ submission files |
| `/public/volumes/*` | `/data/epi/<env>/<journal>/public/volumes/` | 🟢 | Volume cover illustrations and associated assets |
| `/user/picture/*` | `/data/user_photo/<env>/uuid/` | ⛔ | User profile avatars |
| `/{journalId}/resources/*` | `/data/epi/<env>/<journal>/public/` | 🟢 | Public journal resources |

---

### 3.7 Internal & Restricted Routes

| URL Pattern | Behavior | Reason |
| :--- | :--- | :--- |
| `/sites/*` | **HTTP 404** (Blocked by Nginx) | Internal rewrite destination of `src/proxy.ts`. Direct access is blocked to prevent bypassing tenant resolution. |
| `/{lang}/[...slug]` | **HTTP 404** | Catch-all route returning the 404 Not Found page for nonexistent paths. |
