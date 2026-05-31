import { NextRequest, NextResponse } from 'next/server';
import { getJournalApiUrl } from '@/utils/env-loader';
import { isValidJournalId } from '@/utils/validation';
import { logger } from '@/lib/logger';
import { AvailableLanguage } from '@/utils/i18n';

const log = logger.child({ service: 'feed-atom' });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ journalId: string; lang: AvailableLanguage }> }
) {
  const { journalId } = await params;

  if (!isValidJournalId(journalId)) {
    return new NextResponse('Invalid journal code', { status: 400 });
  }

  const apiUrl = getJournalApiUrl(journalId);
  const feedUrl = `${apiUrl}/feed/atom/${journalId}`;

  try {
    const response = await fetch(feedUrl, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/atom+xml, text/xml, */*' },
    });

    if (!response.ok) {
      log.warn(`Atom feed upstream returned ${response.status} for ${journalId}`);
      return new NextResponse('Feed unavailable', { status: response.status });
    }

    const body = await response.text();
    const contentType =
      response.headers.get('Content-Type') ?? 'application/atom+xml; charset=utf-8';

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    log.error(`Failed to fetch Atom feed for ${journalId}:`, error);
    return new NextResponse('Feed unavailable', { status: 502 });
  }
}
