import { NextRequest, NextResponse } from 'next/server';

// Whitelist of allowed PDF sources
const ALLOWED_DOMAINS = [
  'zenodo.org',
  'arxiv.org',
  'hal.archives-ouvertes.fr',
  'hal.science', // New HAL domain
  'archive.softwareheritage.org',
];

// Rate limiting: 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

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
 * Validate if URL domain is in allowed list
 */
function isAllowedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  // Check rate limit
  if (!checkRateLimit(ip)) {
    console.warn(`[PDF Proxy] Rate limit exceeded for IP: ${ip}`);
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
    return new NextResponse('Invalid disposition parameter (must be inline or attachment)', { status: 400 });
  }

  // Validate domain
  if (!isAllowedDomain(pdfUrl)) {
    console.warn(`[PDF Proxy] Blocked non-whitelisted domain: ${pdfUrl}`);
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
      console.error(`[PDF Proxy] Failed to fetch PDF: ${response.statusText} (${pdfUrl})`);
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Build Content-Disposition header with optional filename
    let contentDisposition = disposition;
    if (disposition === 'attachment' && filename) {
      // Sanitize filename and add to header
      const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '_');
      contentDisposition = `attachment; filename="${sanitizedFilename}"`;
    }

    // Stream response with controlled Content-Disposition
    const headers = new Headers({
      'Content-Type': 'application/pdf', // Always force application/pdf (upstream may send application/octet-stream)
      'Content-Disposition': contentDisposition, // 'inline' or 'attachment; filename="..."'
      'Cache-Control': 'public, max-age=604800, immutable', // 7 days cache
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });

    // If Content-Length is available, forward it
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    console.log(`[PDF Proxy] Successfully proxied PDF from: ${new URL(pdfUrl).hostname}`);

    // Stream the PDF without buffering in memory
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[PDF Proxy] Request timeout for: ${pdfUrl}`);
      return new NextResponse('Request timeout', { status: 504 });
    }

    console.error('[PDF Proxy] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * OPTIONS /api/pdf-proxy - Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
