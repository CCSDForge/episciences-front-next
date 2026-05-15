import { NextRequest, NextResponse } from 'next/server';
import { METADATA_TYPE } from '@/utils/article';
import { sanitizeForLog } from '@/utils/validation';
import { getJournalApiUrl } from '@/utils/env-loader';
import { getJournalBaseUrl } from '@/utils/signposting';
import { API_PATHS } from '@/config/api';

const VALID_FORMATS = new Set<string>(Object.values(METADATA_TYPE));

function getMimeType(format: string): string {
  switch (format) {
    case METADATA_TYPE.BIBTEX:
      return 'application/x-bibtex';
    case METADATA_TYPE.RIS:
      return 'application/x-research-info-systems';
    case METADATA_TYPE.CSL:
      return 'application/vnd.citationstyles.csl+json';
    case METADATA_TYPE.JSON:
    case METADATA_TYPE.JSON_LD:
      return 'application/json';
    default:
      return 'application/xml';
  }
}

function getFileExtension(format: string): string {
  switch (format) {
    case METADATA_TYPE.BIBTEX:
      return 'bib';
    case METADATA_TYPE.JSON:
    case METADATA_TYPE.CSL:
    case METADATA_TYPE.JSON_LD:
      return 'json';
    case METADATA_TYPE.RIS:
      return 'ris';
    default:
      return 'xml';
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ journalId: string; lang: string; id: string; format: string }> }
) {
  const { journalId, lang, id, format } = await context.params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse('Invalid article id', { status: 400 });
  }

  if (!VALID_FORMATS.has(format)) {
    return new NextResponse(
      `Invalid format. Allowed: ${[...VALID_FORMATS].join(', ')}`,
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const apiUrl = `${getJournalApiUrl(journalId)}${API_PATHS.papers}export/${id}/${format}?code=${journalId}`;
    const response = await fetch(apiUrl, { signal: controller.signal });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (!response.ok) {
      console.warn(
        `[metadata-export] Backend error ${response.status} for ${sanitizeForLog(apiUrl)}`
      );
      return new NextResponse('Backend error', { status: 502 });
    }

    const body = await response.text();
    const ext = getFileExtension(format);
    const articleUrl = `${getJournalBaseUrl(journalId)}/${lang}/articles/${id}`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': getMimeType(format),
        'Content-Disposition': `inline; filename="article_${id}.${ext}"`,
        'Cache-Control': 'public, max-age=86400',
        Link: `<${articleUrl}>; rel="describes"; type="text/html"`,
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return new NextResponse('Request timeout', { status: 504 });
    }

    console.error('[metadata-export] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
