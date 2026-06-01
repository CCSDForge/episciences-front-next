import { NextRequest, NextResponse } from 'next/server';
import { sanitizeIp, sanitizeForLog } from '@/utils/validation';
import { isAllowedPdfDomain } from '@/utils/pdf';
import { logger } from '@/lib/logger';

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


/**
 * GET /api/pdf-proxy - Proxy PDF requests to bypass CORS and control Content-Disposition
 * Query params:
 *   - url: PDF URL to proxy (required)
 *   - disposition: 'inline' (preview) or 'attachment' (download), defaults to 'inline'
 *   - filename: Optional filename for downloads (e.g., 'article_123.pdf')
 */
export async function GET(request: NextRequest) {
  // Get client IP
  const ip = sanitizeIp(request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'));

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
  if (disposition !== 'inline' && disposition !== 'attachment') {
    return new NextResponse('Invalid disposition parameter (must be inline or attachment)', {
      status: 400,
    });
  }

  // Validate domain
  if (!isAllowedPdfDomain(pdfUrl)) {
    logger.warn(`[PDF Proxy] Blocked non-whitelisted domain: ${sanitizeForLog(pdfUrl)}`); // lgtm[js/log-injection]
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    // Fetch PDF with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

    const response = await fetch(pdfUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Episciences-PDF-Proxy/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        `[PDF Proxy] Failed to fetch PDF: ${sanitizeForLog(response.statusText)} (${sanitizeForLog(pdfUrl)})`
      ); // lgtm[js/log-injection]
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Validate Content-Type from upstream — arxiv/zenodo may return an HTML error page with HTTP 200
    // (rate-limit, captcha, redirect). Streaming HTML with Content-Type: application/pdf causes
    // Chrome to display "This content is blocked." in the iframe PDF viewer.
    const upstreamContentType = response.headers.get('Content-Type') ?? '';
    if (!upstreamContentType.includes('pdf') && !upstreamContentType.includes('octet-stream')) {
      logger.warn(
        `[PDF Proxy] Upstream returned unexpected Content-Type "${upstreamContentType}" for: ${sanitizeForLog(pdfUrl)}`
      ); // lgtm[js/log-injection]
      return new NextResponse('Upstream did not return a PDF', { status: 502 });
    }

    // Build Content-Disposition header with optional filename
    let contentDisposition = disposition;
    if (disposition === 'attachment' && filename) {
      // Sanitize filename and add to header
      const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '_').slice(0, 200);
      contentDisposition = `attachment; filename="${sanitizedFilename}"`;
    }

    // Stream response with controlled Content-Disposition
    const allowedOrigin = process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN || '';
    const corsHeaders: Record<string, string> = {
      'Content-Type': 'application/pdf', // Always force application/pdf (upstream may send application/octet-stream)
      'Content-Disposition': contentDisposition, // 'inline' or 'attachment; filename="..."'
      'Cache-Control': 'public, max-age=604800, immutable', // 7 days cache
      'Access-Control-Allow-Methods': 'GET',
      'X-Robots-Tag': 'noindex',
    };
    if (allowedOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
    }
    const headers = new Headers(corsHeaders);

    // If Content-Length is available, forward it
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    logger.debug(`[PDF Proxy] Successfully proxied PDF from: ${new URL(pdfUrl).hostname}`);

    // Stream the PDF without buffering in memory
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`[PDF Proxy] Request timeout for: ${sanitizeForLog(pdfUrl)}`); // lgtm[js/log-injection]
      return new NextResponse('Request timeout', { status: 504 });
    }

    logger.error('[PDF Proxy] Error:', error);
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
