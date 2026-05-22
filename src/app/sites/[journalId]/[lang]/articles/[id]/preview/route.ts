import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/services/article';
import { isAllowedPdfDomain } from '@/utils/pdf';
import { isValidJournalId } from '@/utils/validation';
import { AvailableLanguage } from '@/utils/i18n';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ journalId: string; lang: AvailableLanguage; id: string }> }
) {
  const { journalId, id } = await params;

  if (!isValidJournalId(journalId)) {
    return new NextResponse('Invalid journal', { status: 400 });
  }

  const article = await fetchArticle(id, journalId);

  if (!article?.pdfLink) {
    console.warn(`[preview] article ${id} (${journalId}): no pdfLink`);
    return new NextResponse(null, { status: 404 });
  }

  if (!isAllowedPdfDomain(article.pdfLink)) {
    console.warn(`[preview] article ${id}: domain not allowed — ${article.pdfLink}`);
    return new NextResponse('Invalid PDF source', { status: 403 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(article.pdfLink, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Episciences-PDF-Proxy/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[preview] upstream ${response.status} for article ${id}: ${article.pdfLink}`);
      return new NextResponse('Failed to fetch PDF', { status: response.status });
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Robots-Tag': 'noindex',
    });

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(response.body, { status: 200, headers });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[preview] timeout fetching PDF for article ${id}: ${article.pdfLink}`);
      return new NextResponse('Request timeout', { status: 504 });
    }
    console.error(`[preview] error for article ${id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
