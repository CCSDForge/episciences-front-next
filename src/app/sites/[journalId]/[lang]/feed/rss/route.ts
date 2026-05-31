import { NextRequest, NextResponse } from 'next/server';
import { getJournalApiUrl } from '@/utils/env-loader';
import { isValidJournalId } from '@/utils/validation';
import { logger } from '@/lib/logger';
import { AvailableLanguage } from '@/utils/i18n';

const log = logger.child({ service: 'feed-rss' });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ journalId: string; lang: AvailableLanguage }> }
) {
  const { journalId } = await params;

  if (!isValidJournalId(journalId)) {
    return new NextResponse('Invalid journal code', { status: 400 });
  }

  const apiUrl = getJournalApiUrl(journalId);
  const feedUrl = `${apiUrl}/feed/rss/${journalId}`;

  try {
    const response = await fetch(feedUrl, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/rss+xml, text/xml, */*' },
    });

    if (!response.ok) {
      log.warn(`RSS feed upstream returned ${response.status} for ${journalId}`);
      return new NextResponse('Feed unavailable', { status: response.status });
    }

    const body = await response.text();
    const contentType =
      response.headers.get('Content-Type') ?? 'application/rss+xml; charset=utf-8';

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    log.error(`Failed to fetch RSS feed for ${journalId}:`, error);
    return new NextResponse('Feed unavailable', { status: 502 });
  }
}
