import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  acceptedLanguages,
  defaultLanguage,
  getLanguageFromPathname,
  hasLanguagePrefix,
  removeLanguagePrefix,
} from '@/utils/language-utils';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorer les fichiers statiques avec extensions
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // Intercepter les requêtes .txt
  if (pathname.endsWith('.txt')) {
    // Retourner une réponse vide pour éviter les erreurs 404
    return NextResponse.json({ status: 'ok' });
  }

  // Handle language redirections
  const currentLang = getLanguageFromPathname(pathname);
  const hasPrefix = hasLanguagePrefix(pathname);

  // If URL has default language prefix (e.g., /en/about), redirect to path without prefix
  if (hasPrefix && currentLang === defaultLanguage) {
    const pathWithoutLang = removeLanguagePrefix(pathname);
    const url = new URL(pathWithoutLang || '/', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // If URL has invalid language prefix, redirect to default language version without prefix
  if (hasPrefix && !acceptedLanguages.includes(currentLang)) {
    const pathWithoutLang = removeLanguagePrefix(pathname);
    const url = new URL(pathWithoutLang || '/', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // If URL has no language prefix and is not a static asset, rewrite to default language
  if (!hasPrefix && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
    // Rewrite to /en/... for default language (internally, not visible to user)
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLanguage}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Rediriger /forAuthors vers /for-authors (preserve language prefix if present)
  if (pathname.includes('/forAuthors')) {
    const pathWithoutLang = removeLanguagePrefix(pathname);
    const newPath = pathWithoutLang.replace('/forAuthors', '/for-authors');
    const localizedPath = hasPrefix ? `/${currentLang}${newPath}` : newPath;
    const url = new URL(localizedPath, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configuration du matcher pour appliquer le middleware sur toutes les routes sauf les ressources statiques
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