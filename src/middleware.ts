import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  acceptedLanguages,
  defaultLanguage,
  getLanguageFromPathname,
  hasLanguagePrefix,
  removeLanguagePrefix,
} from '@/utils/language-utils';
// import { journalExists } from '@/utils/static-paths'; // REMOVE: Uses fs, incompatible with Edge
import { journals } from '@/config/journals-generated';

function journalExists(journalId: string): boolean {
  return journals.includes(journalId);
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.nextUrl.hostname;
  const pathname = url.pathname;

  console.log(`[Middleware] Incoming request: ${pathname} (Host: ${hostname})`);

  // Ignore static files with extensions
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // 1. Journal Detection (Multi-tenancy)
  let journalId = 'epijinfo'; // Default fallback

  if (hostname.includes('episciences.org')) {
    // production: epijinfo.episciences.org -> epijinfo
    journalId = hostname.split('.')[0];
  } else {
    // localhost or dev environment
    const subdomain = hostname.split('.')[0];
    if (subdomain !== 'localhost' && !Number.isInteger(Number(subdomain))) {
       journalId = subdomain;
    } else {
       journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    }
  }

  console.log(`[Middleware] Detected journalId: ${journalId}`);

  // 2. Validate journalId exists
  if (!journalExists(journalId)) {
    console.warn(`[Middleware] Invalid journalId: ${journalId}, redirecting to default`);
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

  console.log(`[Middleware] Rewriting to: ${internalPath}`);

  const rewriteUrl = new URL(internalPath, request.url);
  rewriteUrl.search = url.search;

  return NextResponse.rewrite(rewriteUrl);
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
    '/((?!api|_next/static|_next/image|favicon.ico|icons|logos|locales|fonts).*)',
  ],
};