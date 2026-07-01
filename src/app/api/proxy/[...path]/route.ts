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

// Simple in-memory rate limiter: 60 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60000; // 1 minute
const UPSTREAM_TIMEOUT = 15000; // 15 seconds — a slow backend must not pin connections open

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
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
