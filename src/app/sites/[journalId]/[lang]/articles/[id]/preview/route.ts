import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/services/article';
import { isAllowedPdfDomain } from '@/utils/pdf';
import { isValidJournalId, sanitizeForLog } from '@/utils/validation';
import { AvailableLanguage } from '@/utils/i18n';
import { logger } from '@/lib/logger';

// Force dynamic evaluation to prevent Next.js from caching the route handler or responses.
export const dynamic = 'force-dynamic';

const errorHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ journalId: string; lang: AvailableLanguage; id: string }> }
) {
  const { journalId, id } = await params;

  logger.debug(
    `[preview] 📥 GET request received for article PDF preview: ID ${id} (journal: ${journalId})`
  );

  if (!isValidJournalId(journalId)) {
    logger.warn(`[preview] ❌ Invalid journal ID format: ${journalId}`);
    return new NextResponse('Invalid journal', { status: 400, headers: errorHeaders });
  }

  if (!/^\d+$/.test(id)) {
    logger.warn(`[preview] ❌ Invalid article id format: ${sanitizeForLog(id)}`);
    return new NextResponse('Invalid article id', { status: 400, headers: errorHeaders });
  }

  const article = await fetchArticle(id, journalId);

  if (!article) {
    logger.warn(`[preview] ❌ Article not found: ID ${id} (journal: ${journalId})`);
    return new NextResponse('Article not found', { status: 404, headers: errorHeaders });
  }

  if (!article.pdfLink) {
    logger.warn(`[preview] ⚠️ Article ${id} (${journalId}) has no PDF link`);
    return new NextResponse('No PDF link available', { status: 404, headers: errorHeaders });
  }

  if (!isAllowedPdfDomain(article.pdfLink)) {
    logger.warn(`[preview] ❌ PDF domain not allowed: ${article.pdfLink} for article ${id}`);
    return new NextResponse('Invalid PDF source', { status: 403, headers: errorHeaders });
  }

  logger.debug(`[preview] 🌐 Fetching PDF from upstream: ${article.pdfLink}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(article.pdfLink, {
      // lgtm[js/ssrf] — pdfLink comes from server API, domain validated by isAllowedPdfDomain()
      signal: controller.signal,
      headers: { 'User-Agent': 'Episciences-PDF-Proxy/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        `[preview] ❌ Upstream returned ${response.status} for article ${id}: ${article.pdfLink}`
      );
      return new NextResponse('Failed to fetch PDF', {
        status: response.status,
        headers: errorHeaders,
      });
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Robots-Tag': 'noindex',
    });

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) headers.set('Content-Length', contentLength);

    logger.debug(
      `[preview] ✅ Successfully proxied PDF for article ${id} (${contentLength || 'unknown size'} bytes)`
    );
    return new NextResponse(response.body, { status: 200, headers });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`[preview] ⏱️ Timeout (30s) fetching PDF for article ${id}: ${article.pdfLink}`);
      return new NextResponse('Request timeout', { status: 504, headers: errorHeaders });
    }
    logger.error(`[preview] ❌ Exception occurred for article ${id}:`, error);
    return new NextResponse('Internal server error', { status: 500, headers: errorHeaders });
  }
}
