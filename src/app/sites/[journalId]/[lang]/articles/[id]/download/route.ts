import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/services/article';
import { generateArticleFilename, isAllowedPdfDomain } from '@/utils/pdf';
import { isValidJournalId, sanitizeForLog } from '@/utils/validation';
import { AvailableLanguage } from '@/utils/i18n';
import { logger } from '@/lib/logger';

// Force dynamic evaluation to prevent Next.js from caching the route handler or response streams.
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
    `[download] 📥 GET request received for article PDF download: ID ${id} (journal: ${journalId})`
  );

  if (!isValidJournalId(journalId)) {
    logger.warn(`[download] ❌ Invalid journal ID format: ${sanitizeForLog(journalId)}`);
    return new NextResponse('Invalid journal', { status: 400, headers: errorHeaders });
  }

  if (!/^\d+$/.test(id)) {
    logger.warn(`[download] ❌ Invalid article id format: ${sanitizeForLog(id)}`);
    return new NextResponse('Invalid article id', { status: 400, headers: errorHeaders });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const article = await fetchArticle(id, journalId);

    if (!article) {
      logger.warn(`[download] ❌ Article not found: ID ${id} (journal: ${journalId})`);
      return new NextResponse('Article not found', { status: 404, headers: errorHeaders });
    }

    if (!article.pdfLink) {
      logger.warn(`[download] ⚠️ Article ${id} (${journalId}) has no PDF link`);
      return new NextResponse('No PDF link available', { status: 404, headers: errorHeaders });
    }

    if (!isAllowedPdfDomain(article.pdfLink)) {
      logger.warn(`[download] ❌ PDF domain not allowed: ${article.pdfLink} for article ${id}`);
      return new NextResponse('Invalid PDF source', { status: 403, headers: errorHeaders });
    }

    const filename = generateArticleFilename(journalId, article.id, article.title || '');
    const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '_').slice(0, 200);
    const encodedFilename = encodeURIComponent(sanitizedFilename);

    logger.debug(`[download] 🌐 Fetching PDF for download from upstream: ${article.pdfLink}`);

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(article.pdfLink, {
      // lgtm[js/ssrf] — pdfLink comes from server API, domain validated by isAllowedPdfDomain()
      signal: controller.signal,
      headers: { 'User-Agent': 'Episciences-PDF-Proxy/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        `[download] ❌ Upstream returned ${response.status} for article ${id}: ${article.pdfLink}`
      );
      return new NextResponse('Failed to fetch PDF', {
        status: response.status,
        headers: errorHeaders,
      });
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'public, max-age=604800, immutable',
    });

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) headers.set('Content-Length', contentLength);

    logger.debug(
      `[download] ✅ Successfully proxied PDF download for article ${id} (${contentLength || 'unknown size'} bytes)`
    );

    return new NextResponse(response.body, { status: 200, headers });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`[download] ⏱️ Timeout (30s) fetching PDF for article ${id}`);
      return new NextResponse('Request timeout', { status: 504, headers: errorHeaders });
    }
    logger.error(
      `[download] ❌ Exception occurred for article ${id}:`,
      error instanceof Error ? { message: error.message, stack: error.stack } : error
    );
    return new NextResponse('Internal server error', { status: 500, headers: errorHeaders });
  }
}

