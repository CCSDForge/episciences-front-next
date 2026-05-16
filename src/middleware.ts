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
// import { journalExists } from '@/utils/static-paths'; // REMOVE: Uses fs, incompatible with Edge
import { journals } from '@/config/journals-generated';

function journalExists(journalId: string): boolean {
  return journals.includes(journalId);
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Use Host header instead of nextUrl.hostname for multi-tenant routing
  const hostHeader = request.headers.get('host') || '';
  const hostname = hostHeader.split(':')[0]; // Remove port if present
  const pathname = url.pathname;

  console.log(
    `[Middleware] Incoming request: ${sanitizeForLog(pathname)} (Host: ${sanitizeForLog(hostname)})`
  ); // lgtm[js/log-injection]

  // Ignore static files with extensions
  const staticExtensions = [
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
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // 1. Journal Detection (Multi-tenancy)
  let journalId: string;

  const productionDomain = process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN || 'episciences.org';
  const isProductionHost =
    hostname === productionDomain || hostname.endsWith(`.${productionDomain}`);

  if (isProductionHost) {
    // production: epijinfo.episciences.org -> epijinfo
    const extractedId = hostname.split('.')[0];

    // Validate format before usage to prevent injection attacks
    if (isValidJournalId(extractedId)) {
      journalId = extractedId;
    } else {
      console.warn(`[Middleware] Invalid journalId format from hostname: ${extractedId}`);
      journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    }
  } else {
    // localhost or dev environment
    const subdomain = hostname.split('.')[0];
    if (subdomain !== 'localhost' && !Number.isInteger(Number(subdomain))) {
      // Validate format before usage
      if (isValidJournalId(subdomain)) {
        journalId = subdomain;
      } else {
        console.warn(`[Middleware] Invalid journalId format from subdomain: ${subdomain}`);
        journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
      }
    } else {
      journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    }
  }

  console.log(`[Middleware] Detected journalId: ${journalId}`);

  // 2. Validate journalId exists in registry
  if (!journalExists(journalId)) {
    console.warn(`[Middleware] Unknown journalId: ${journalId}, redirecting to default`);
    // Redirect to default journal instead of showing error page
    journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
  }

  // 3. Language Management
  const currentLang = getLanguageFromPathname(pathname);
  const hasPrefix = hasLanguagePrefix(pathname);

  // NOTE: We keep the prefix even for the default language for multi-tenant SEO
  // If URL has default language prefix, WE KEEP IT.

  // 4. Multi-tenant Internal Rewrite
  // Rewrite to /sites/[journalId]/[lang]/...
  const pathWithoutLang = removeLanguagePrefix(pathname);
  const targetLang = hasPrefix ? currentLang : defaultLanguage;

  // Build internal path
  // NOTE: We use 'sites' not '_sites' because folders starting with _ are private in Next.js
  const internalPath = `/sites/${journalId}/${targetLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;

  console.log(`[Middleware] Rewriting to: ${sanitizeForLog(internalPath)}`); // lgtm[js/log-injection]

  const rewriteUrl = new URL(internalPath, request.url);
  rewriteUrl.search = url.search;

  const response = NextResponse.rewrite(rewriteUrl);
  response.headers.set('x-detected-language', targetLang);

  // FAIR Signposting Level 1: add Link headers for article landing pages
  const articleMatch = pathWithoutLang.match(/^\/articles\/(\d+)$/);
  if (articleMatch) {
    const articleId = articleMatch[1];
    const origin = `${url.protocol}//${hostHeader}`;
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
     * - icons (icon files)
     * - logos (logo files)
     * - locales (translation files)
     * - fonts (font files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|logos|locales|fonts|sites).*)',
  ],
};
