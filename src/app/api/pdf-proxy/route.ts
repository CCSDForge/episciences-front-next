import { NextRequest, NextResponse, after } from 'next/server';
import { getClientIp, sanitizeForLog } from '@/utils/validation';
import { isAllowedPdfDomain } from '@/utils/pdf';
import { logger } from '@/lib/logger';
import {
  isCacheEnabled,
  getCacheMode,
  getCacheKey,
  getCacheMaxAgeSeconds,
  readCacheEntry,
  isEntryStale,
  enqueuePopulateJob,
  type PdfCacheEntry,
  type PdfCacheEnqueueReason,
} from '@/lib/pdf-cache';

// The cache read path uses fs and the Valkey client — Node.js runtime only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limiting: 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Check if client has exceeded rate limit
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function isValidDisposition(disposition: string): boolean {
  return disposition === 'inline' || disposition === 'attachment';
}

// arxiv/zenodo may return an HTML error page with HTTP 200 (rate-limit, captcha, redirect).
// Streaming HTML with Content-Type: application/pdf causes Chrome to display
// "This content is blocked." in the iframe PDF viewer, so the upstream type must be checked.
function isPdfContentType(contentType: string): boolean {
  return contentType.includes('pdf') || contentType.includes('octet-stream');
}

function buildContentDisposition(disposition: string, filename: string | null): string {
  if (disposition === 'attachment' && filename) {
    const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '_').slice(0, 200);
    return `attachment; filename="${sanitizedFilename}"`;
  }
  return disposition;
}

/**
 * @param cacheStatus HIT/STALE/MISS/FALLBACK when PDF_CACHE_ENABLED=true, OFF
 *   otherwise — always present, it's the only cheap way to measure the
 *   cache's real hit rate from Nginx/production logs without instrumenting
 *   Node (see docs/PDF_CACHE_STRATEGY.md).
 */
function buildPdfResponseHeaders(
  contentDisposition: string,
  allowedOrigin: string,
  contentLength: string | null,
  cacheStatus: string
): Headers {
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/pdf', // Always force application/pdf (upstream may send application/octet-stream)
    'Content-Disposition': contentDisposition, // 'inline' or 'attachment; filename="..."'
    'Cache-Control': 'public, max-age=604800, immutable', // 7 days cache
    'Access-Control-Allow-Methods': 'GET',
    'X-Robots-Tag': 'noindex',
    'X-Pdf-Cache': cacheStatus,
  };
  if (allowedOrigin) {
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  const headers = new Headers(corsHeaders);
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  return headers;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Schedules `task` to run after the response is sent, via next/server's
 * after() when a live request scope is available (always the case when
 * serving real traffic). after() throws outside a request scope — e.g. a
 * unit test invoking this route's GET() directly without Next's own request
 * machinery — in which case we fall back to firing it immediately;
 * enqueuePopulateJob() already never throws and never affects the response
 * either way.
 */
function scheduleAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    task().catch(() => {});
  }
}

function cacheEntryResponse(
  entry: PdfCacheEntry,
  contentDisposition: string,
  allowedOrigin: string,
  cacheStatus: string
): NextResponse {
  const headers = buildPdfResponseHeaders(
    contentDisposition,
    allowedOrigin,
    String(entry.byteLength),
    cacheStatus
  );
  return new NextResponse(entry.stream, { status: 200, headers });
}

/**
 * GET /api/pdf-proxy - Proxy PDF requests to bypass CORS and control Content-Disposition
 * Query params:
 *   - url: PDF URL to proxy (required)
 *   - disposition: 'inline' (preview) or 'attachment' (download), defaults to 'inline'
 *   - filename: Optional filename for downloads (e.g., 'article_123.pdf')
 *
 * When PDF_CACHE_ENABLED=true, a disk cache populated by a background worker
 * (scripts/pdf-cache-worker.mjs) sits in front of the upstream fetch — this
 * route only ever reads it. See docs/PDF_CACHE_STRATEGY.md.
 */
export async function GET(request: NextRequest) {
  // Get client IP
  const ip = getClientIp(request.headers);

  // Check rate limit
  if (!checkRateLimit(ip)) {
    logger.warn(`[PDF Proxy] Rate limit exceeded for IP: ${ip}`);
    return new NextResponse('Too many requests', { status: 429 });
  }

  // Get PDF URL, disposition, and filename from query params
  const searchParams = request.nextUrl.searchParams;
  const pdfUrl = searchParams.get('url');
  const disposition = searchParams.get('disposition') || 'inline';
  const filename = searchParams.get('filename');

  if (!pdfUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  // Validate disposition parameter
  if (!isValidDisposition(disposition)) {
    return new NextResponse('Invalid disposition parameter (must be inline or attachment)', {
      status: 400,
    });
  }

  // Validate domain
  if (!isAllowedPdfDomain(pdfUrl)) {
    logger.warn(`[PDF Proxy] Blocked non-whitelisted domain: ${sanitizeForLog(pdfUrl)}`);
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  const contentDisposition = buildContentDisposition(disposition, filename);
  const allowedOrigin = process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN || '';

  const cacheEnabled = isCacheEnabled();
  const cacheKey = cacheEnabled ? getCacheKey(pdfUrl) : null;

  // An arrow function expression (not a hoisted function declaration) so
  // TS keeps pdfUrl/cacheKey narrowed to `string` inside the closure below.
  const enqueue = (reason: PdfCacheEnqueueReason): void => {
    if (!cacheEnabled || !cacheKey) return;
    const key = cacheKey;
    scheduleAfterResponse(() => enqueuePopulateJob(pdfUrl, key, reason));
  };

  // "fallback" mode only ever consults the cache after an upstream failure
  // (below); "systematic" mode consults it first, here.
  if (cacheEnabled && cacheKey && getCacheMode() === 'systematic') {
    const cached = await readCacheEntry(cacheKey);
    if (cached) {
      const stale = isEntryStale(cached, getCacheMaxAgeSeconds());
      if (stale) {
        enqueue('refresh');
      }
      logger.debug(
        `[PDF Proxy] Serving from cache (${stale ? 'stale' : 'fresh'}): ${sanitizeForLog(pdfUrl)}`
      );
      return cacheEntryResponse(cached, contentDisposition, allowedOrigin, stale ? 'STALE' : 'HIT');
    }
    // Cold miss in systematic mode: fall through to the normal upstream
    // fetch below, exactly like today, and enqueue a populate job on success.
  }

  async function tryServeCachedFallback(): Promise<NextResponse | null> {
    if (!cacheEnabled || !cacheKey || getCacheMode() !== 'fallback') {
      return null;
    }
    // No freshness check here on purpose: an old cached copy beats a hard
    // error for the user, and the worker will refresh it on the next request.
    const cached = await readCacheEntry(cacheKey);
    if (!cached) {
      return null;
    }
    logger.warn(`[PDF Proxy] Upstream failed, serving cached fallback for: ${sanitizeForLog(pdfUrl)}`);
    return cacheEntryResponse(cached, contentDisposition, allowedOrigin, 'FALLBACK');
  }

  try {
    // Fetch PDF with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

    const response = await fetch(pdfUrl, {
      // lgtm[js/ssrf] — domain validated by isAllowedPdfDomain()
      signal: controller.signal,
      headers: {
        'User-Agent': 'Episciences-PDF-Proxy/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        `[PDF Proxy] Failed to fetch PDF: ${sanitizeForLog(response.statusText)} (${sanitizeForLog(pdfUrl)})`
      );
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, {
        status: response.status,
      });
    }

    // fetch() follows redirects by default, and a whitelisted domain that
    // redirects (compromise, misconfiguration, a mirror) would otherwise send
    // this proxy to an arbitrary host — including an internal one. Re-validate
    // the domain against the final URL, not just the one the client requested.
    if (!isAllowedPdfDomain(response.url || pdfUrl)) {
      logger.warn(
        `[PDF Proxy] Blocked redirect to non-whitelisted host: ${sanitizeForLog(response.url)}`
      );
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse('Upstream redirect not allowed', { status: 502 });
    }

    // Validate Content-Type from upstream (see isPdfContentType for why)
    const upstreamContentType = response.headers.get('Content-Type') ?? '';
    if (!isPdfContentType(upstreamContentType)) {
      logger.warn(
        `[PDF Proxy] Upstream returned unexpected Content-Type "${upstreamContentType}" for: ${sanitizeForLog(pdfUrl)}`
      );
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse('Upstream did not return a PDF', { status: 502 });
    }

    // Stream response with controlled Content-Disposition
    const contentLength = response.headers.get('Content-Length');
    const cacheStatus = cacheEnabled ? 'MISS' : 'OFF';
    const headers = buildPdfResponseHeaders(contentDisposition, allowedOrigin, contentLength, cacheStatus);

    logger.debug(
      `[PDF Proxy] Successfully proxied PDF from: ${sanitizeForLog(new URL(pdfUrl).hostname)}`
    );

    enqueue('populate');

    // Stream the PDF without buffering in memory
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (isAbortError(error)) {
      logger.error(`[PDF Proxy] Request timeout for: ${sanitizeForLog(pdfUrl)}`);
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse('Request timeout', { status: 504 });
    }

    logger.error('[PDF Proxy] Error:', error);
    const fallback = await tryServeCachedFallback();
    if (fallback) return fallback;
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * OPTIONS /api/pdf-proxy - Handle CORS preflight requests
 */
export async function OPTIONS() {
  const allowedOrigin = process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN || '';
  const optionsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (allowedOrigin) {
    optionsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return new NextResponse(null, { status: 200, headers: optionsHeaders });
}
