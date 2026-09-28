import { NextRequest, NextResponse } from 'next/server';
import { getJournalApiUrl } from '@/utils/env-loader';
import { isValidJournalId, getClientIp } from '@/utils/validation';
import { logger } from '@/lib/logger';

/**
 * Dynamic API Proxy
 *
 * Routes API requests to the correct backend based on the journal.
 * This solves the CORS issue for client-side requests while supporting
 * multi-tenant architecture where each journal may have a different API endpoint.
 *
 * Usage: /api/proxy/papers/123?rvcode=transformations
 * The rvcode parameter determines which API endpoint to use.
 */

// Simple in-memory rate limiter, keyed per client IP.
//
// This is NOT an abuse deterrent: CORS is enforced by browsers only, so any
// non-browser client can already call the upstream API directly, unlimited,
// bypassing this proxy entirely (the upstream currently has no rate limit of
// its own). Throttling this route therefore only ever affects traffic that
// chooses to go through us — in practice, our own legitimate visitors.
//
// Its only real purpose is a self-protection circuit breaker: the article/
// search list pages enrich each item with an individual `GET /papers/{id}`
// call (see article.query.ts / search.query.ts onQueryStarted), all routed
// through this proxy, so a single page of 20 results already bursts ~20
// requests. The limit below is set high enough to never trip under normal
// browsing (even several page/filter changes a minute, or several visitors
// behind a shared NAT), while still catching a genuine runaway — a retry
// loop bug, for example — before it hammers the shared upstream database
// that backs all 45+ journals. Real abuse prevention belongs on the upstream
// API itself (rate limiting, auth), which we control and can configure
// independently. See tmp/SPEC_BATCH_PAPERS_ENDPOINT.md for the actual fix to
// the N+1 pattern driving this traffic.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 600;
const RATE_WINDOW = 60000; // 1 minute
const UPSTREAM_TIMEOUT = 15000; // 15 seconds — a slow backend must not pin connections open

function tooManyRequests(ip: string): NextResponse {
  const record = rateLimitMap.get(ip);
  const retryAfterSeconds = record
    ? Math.max(1, Math.ceil((record.resetAt - Date.now()) / 1000))
    : Math.ceil(RATE_WINDOW / 1000);

  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const clientIp = getClientIp(request.headers);

  if (!checkRateLimit(clientIp)) {
    return tooManyRequests(clientIp);
  }

  const params = await context.params;
  const searchParams = request.nextUrl.searchParams;

  // Get journal code from query params or header
  const rvcode =
    searchParams.get('rvcode') || searchParams.get('code') || request.headers.get('x-journal-code');

  if (!rvcode) {
    return NextResponse.json({ error: 'Missing rvcode parameter' }, { status: 400 });
  }

  if (!isValidJournalId(rvcode)) {
    return NextResponse.json({ error: 'Invalid journal code' }, { status: 400 });
  }

  // Percent-encode each segment to prevent traversal/host-injection attacks while preserving
  // legitimate characters (spaces, accents, etc.) — e.g. author names in authors-search paths.
  // Host remains server-controlled via getJournalApiUrl().
  const path = params.path
    .filter(seg => seg !== '' && seg !== '.' && seg !== '..')
    .map(seg => encodeURIComponent(seg))
    .join('/');

  // Get the correct API URL for this journal
  const apiUrl = getJournalApiUrl(rvcode);

  // Build the target URL
  const targetUrl = new URL(`${apiUrl}/${path}`);

  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: request.headers.get('Accept') || 'application/ld+json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': response.headers.get('Cache-Control') || 'no-cache',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    logger.error(`[API Proxy] Error proxying to ${targetUrl}:`, error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const clientIp = getClientIp(request.headers);

  if (!checkRateLimit(clientIp)) {
    return tooManyRequests(clientIp);
  }

  const params = await context.params;
  const searchParams = request.nextUrl.searchParams;

  const rvcode =
    searchParams.get('rvcode') || searchParams.get('code') || request.headers.get('x-journal-code');

  if (!rvcode) {
    return NextResponse.json({ error: 'Missing rvcode parameter' }, { status: 400 });
  }

  if (!isValidJournalId(rvcode)) {
    return NextResponse.json({ error: 'Invalid journal code' }, { status: 400 });
  }

  const path = params.path
    .filter(seg => seg !== '' && seg !== '.' && seg !== '..')
    .map(seg => encodeURIComponent(seg))
    .join('/');

  const apiUrl = getJournalApiUrl(rvcode);
  const targetUrl = new URL(`${apiUrl}/${path}`);

  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const body = await request.text();

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        Accept: request.headers.get('Accept') || 'application/ld+json',
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    logger.error(`[API Proxy] Error proxying POST to ${targetUrl}:`, error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 502 });
  }
}
