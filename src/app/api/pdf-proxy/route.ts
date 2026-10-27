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

// No route segment config on purpose: `runtime` already defaults to 'nodejs'
// (required by the fs/Valkey cache read path), GET handlers are dynamic by
// default since Next.js 15, and `dynamic` is rejected once cacheComponents is
// enabled.

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

const MAX_REDIRECTS = 5;

class UpstreamRedirectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamRedirectError';
  }
}

// Releases the upstream socket of a response we are not going to stream.
function discardBody(response: Response): void {
  response.body?.cancel().catch(() => {});
}

/**
 * Fetches `url`, following redirects manually so that every hop is checked
 * against the allowlist BEFORE a request is sent to it. With the default
 * redirect: 'follow', a whitelisted host answering 302 to an internal address
 * would make this proxy issue that internal request (blind SSRF) before any
 * check on response.url could run.
 *
 * Accept-Encoding: identity keeps the upstream Content-Length meaningful:
 * fetch() transparently decompresses gzip/br bodies, which would otherwise
 * make the forwarded Content-Length smaller than the streamed body.
 */
async function fetchPdfUpstream(url: string, signal: AbortSignal): Promise<Response> {
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, {
      // lgtm[js/ssrf] - every hop validated by isAllowedPdfDomain()
      signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Episciences-PDF-Proxy/1.0',
        'Accept-Encoding': 'identity',
      },
    });

    if (response.status < 300 || response.status >= 400 || response.status === 304) {
      return response;
    }

    const location = response.headers.get('Location');
    discardBody(response);
    if (!location) {
      throw new UpstreamRedirectError(`Redirect without Location from ${currentUrl}`);
    }
    const nextUrl = new URL(location, currentUrl).href;
    if (!isAllowedPdfDomain(nextUrl)) {
      throw new UpstreamRedirectError(`Redirect to non-whitelisted host: ${nextUrl}`);
    }
    currentUrl = nextUrl;
  }
  throw new UpstreamRedirectError(`Too many redirects (> ${MAX_REDIRECTS}) for ${url}`);
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
    // Runs once the response has been sent; enqueuePopulateJob() never throws.
    after(() => enqueuePopulateJob(pdfUrl, key, reason));
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

    const response = await fetchPdfUpstream(pdfUrl, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
      discardBody(response);
      logger.error(
        `[PDF Proxy] Failed to fetch PDF: ${sanitizeForLog(response.statusText)} (${sanitizeForLog(pdfUrl)})`
      );
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Validate Content-Type from upstream (see isPdfContentType for why)
    const upstreamContentType = response.headers.get('Content-Type') ?? '';
    if (!isPdfContentType(upstreamContentType)) {
      logger.warn(
        `[PDF Proxy] Upstream returned unexpected Content-Type "${upstreamContentType}" for: ${sanitizeForLog(pdfUrl)}`
      );
      discardBody(response);
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse('Upstream did not return a PDF', { status: 502 });
    }

    // Stream response with controlled Content-Disposition. An upstream that
    // ignored Accept-Encoding: identity gets decoded by fetch(), so its
    // Content-Length no longer describes the body we stream: drop it.
    const contentLength = response.headers.get('Content-Encoding')
      ? null
      : response.headers.get('Content-Length');
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
    if (error instanceof UpstreamRedirectError) {
      logger.warn(`[PDF Proxy] Blocked upstream redirect: ${sanitizeForLog(error.message)}`);
      const fallback = await tryServeCachedFallback();
      if (fallback) return fallback;
      return new NextResponse('Upstream redirect not allowed', { status: 502 });
    }

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
