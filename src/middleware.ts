import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import {
  acceptedLanguages,
  defaultLanguage,
  getLanguageFromPathname,
  hasLanguagePrefix,
  removeLanguagePrefix,
} from '@/utils/language-utils';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Utiliser nextUrl.hostname qui ne contient pas le port
  const hostname = request.nextUrl.hostname;
  const pathname = url.pathname;

  // Ignorer les fichiers statiques avec extensions
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // 1. Détection du Journal (Multi-tenancy)
  let journalId = 'epijinfo'; // Fallback par défaut

  if (hostname.includes('episciences.org')) {
    // prod: epijinfo.episciences.org -> epijinfo
    journalId = hostname.split('.')[0];
  } else {
    // localhost ou dev
    // Si on accède via epijinfo.localhost -> epijinfo
    // Si on accède via localhost -> utiliser la variable d'env ou fallback
    const subdomain = hostname.split('.')[0];
    if (subdomain !== 'localhost' && !Number.isInteger(Number(subdomain))) {
       journalId = subdomain;
    } else {
       journalId = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    }
  }

  // 2. Gestion des langues (votre logique existante)
  const currentLang = getLanguageFromPathname(pathname);
  const hasPrefix = hasLanguagePrefix(pathname);

  // If URL has default language prefix (e.g., /en/about), redirect to path without prefix
  if (hasPrefix && currentLang === defaultLanguage) {
    const pathWithoutLang = removeLanguagePrefix(pathname);
    const redirectUrl = new URL(pathWithoutLang || '/', request.url);
    redirectUrl.search = url.search;
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Réécriture Multi-tenant interne
  // On réécrit vers /_sites/[journalId]/[lang]/...
  const pathWithoutLang = removeLanguagePrefix(pathname);
  const targetLang = hasPrefix ? currentLang : defaultLanguage;
  
  // Construction du chemin interne
  const internalPath = `/_sites/${journalId}/${targetLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
  
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