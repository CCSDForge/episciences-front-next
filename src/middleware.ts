import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  acceptedLanguages,
  defaultLanguage,
  getLanguageFromPathname,
  hasLanguagePrefix,
  removeLanguagePrefix,
} from '@/utils/language-utils';
import { isValidJournalId, sanitizeForLog } from '@/utils/validation';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'middleware' });
// import { journalExists } from '@/utils/static-paths'; // REMOVE: Uses fs, incompatible with Edge
import { journals } from '@/config/journals-generated';
import { journalLanguages } from '@/config/journals-languages-generated';

const DEFAULT_JOURNAL = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
];

function journalExists(journalId: string): boolean {
  return journals.includes(journalId);
}

function detectJournalId(hostname: string): string {
  const productionDomain = process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN || 'episciences.org';
  const isProductionHost =
    hostname === productionDomain || hostname.endsWith(`.${productionDomain}`);

  if (isProductionHost) {
    const extractedId = hostname.split('.')[0];
    if (isValidJournalId(extractedId)) {
      return extractedId;
    }
    log.warn(`[Middleware] Invalid journalId format from hostname: ${sanitizeForLog(extractedId)}`);
    return DEFAULT_JOURNAL;
  }

  // localhost or dev environment
  const subdomain = hostname.split('.')[0];
  if (subdomain !== 'localhost' && !Number.isInteger(Number(subdomain))) {
    if (isValidJournalId(subdomain)) {
      return subdomain;
    }
    log.warn(`[Middleware] Invalid journalId format from subdomain: ${sanitizeForLog(subdomain)}`);
    return DEFAULT_JOURNAL;
  }

  return DEFAULT_JOURNAL;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Use Host header instead of nextUrl.hostname for multi-tenant routing
  const hostHeader = request.headers.get('host') || '';
  const hostname = hostHeader.split(':')[0]; // Remove port if present
  const pathname = url.pathname;

  if (pathname === '/robots.txt') {
    return NextResponse.next();
  }

  log.debug(
    `[Middleware] Incoming request: ${sanitizeForLog(pathname)} (Host: ${sanitizeForLog(hostname)})`
  );

  // Ignore static files with extensions
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // 1. Journal Detection (Multi-tenancy)
  let journalId = detectJournalId(hostname);

  log.debug(`[Middleware] Detected journalId: ${sanitizeForLog(journalId)}`);

  // 2. Validate journalId exists in registry
  if (!journalExists(journalId)) {
    log.warn(
      `[Middleware] Unknown journalId: ${sanitizeForLog(journalId)}, redirecting to default`
    );
    // Redirect to default journal instead of showing error page
    journalId = DEFAULT_JOURNAL;
  }

  // 3. Language Management — use per-journal config when available
  const journalLangConfig = journalLanguages[journalId];
  const effectiveDefault = journalLangConfig?.default ?? defaultLanguage;
  const effectiveAccepted = journalLangConfig?.accepted ?? acceptedLanguages;

  const currentLang = getLanguageFromPathname(pathname);
  const hasPrefix = hasLanguagePrefix(pathname);

  // NOTE: We keep the prefix even for the default language for multi-tenant SEO
  // If URL has default language prefix, WE KEEP IT.

  // 4. Multi-tenant Internal Rewrite
  // Rewrite to /sites/[journalId]/[lang]/...
  const pathWithoutLang = removeLanguagePrefix(pathname);

  // Reject a lang prefix not accepted by this journal — redirect to its default language.
  if (hasPrefix && !effectiveAccepted.includes(currentLang)) {
    const redirectUrl = new URL(
      `/${effectiveDefault}${pathWithoutLang === '/' ? '' : pathWithoutLang}`,
      request.url
    );
    redirectUrl.search = url.search;
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  const targetLang = hasPrefix ? currentLang : effectiveDefault;

  // Build internal path
  // NOTE: We use 'sites' not '_sites' because folders starting with _ are private in Next.js
  const internalPath = `/sites/${journalId}/${targetLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;

  log.debug(`[Middleware] Rewriting to: ${sanitizeForLog(internalPath)}`);

  const rewriteUrl = new URL(internalPath, request.url);
  rewriteUrl.search = url.search;

  const response = NextResponse.rewrite(rewriteUrl);
  response.headers.set('x-detected-language', targetLang);

  const origin = `${url.protocol}//${hostHeader}`;

  // FAIRiCat discovery: add api-catalog link header on home page
  if (pathWithoutLang === '/' || pathWithoutLang === '') {
    const catalogUrl = `${origin}/.well-known/api-catalog`;
    response.headers.append(
      'Link',
      `<${catalogUrl}>; rel="api-catalog"; type="application/linkset+json"; profile="https://signposting.org/FAIRiCat/"`
    );
  }

  // FAIR Signposting Level 1: add Link headers for article landing pages
  const articleMatch = pathWithoutLang.match(/^\/articles\/(\d+)$/);
  if (articleMatch) {
    const articleId = articleMatch[1];
    const linksetUrl = `${origin}/${targetLang}/articles/${articleId}/linkset`;
    const inboxUrl =
      process.env.NEXT_PUBLIC_COAR_NOTIFY_INBOX_URL || 'https://inbox.episciences.org/';
    response.headers.set('Link', `<${linksetUrl}>; rel="linkset"; type="application/linkset+json"`);
    response.headers.append('Link', `<${inboxUrl}>; rel="http://www.w3.org/ns/ldp#inbox"`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - icons (icon files)
     * - logos (logo files)
     * - locales (translation files)
     * - fonts (font files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt|icons|logos|locales|fonts|sites).*)',
  ],
};
