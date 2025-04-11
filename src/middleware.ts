import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Intercepter les requêtes .txt
  if (request.nextUrl.pathname.endsWith('.txt')) {
    // Retourner une réponse vide pour éviter les erreurs 404
    return NextResponse.json({ status: 'ok' });
  }

  // Rediriger /sections/1 vers /sections
/*   if (request.nextUrl.pathname === '/sections/1') {
    return NextResponse.redirect(new URL('/sections', request.url));
  } */

  // Rediriger /forAuthors vers /for-authors
  if (request.nextUrl.pathname === '/forAuthors') {
    return NextResponse.redirect(new URL('/for-authors', request.url));
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 