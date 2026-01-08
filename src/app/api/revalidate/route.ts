import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Secure On-Demand Revalidation
 *
 * Security Measures:
 * 1. IP Whitelisting (via ALLOWED_IPS env var)
 * 2. Header-based Authentication (x-episciences-token)
 * 3. Journal-specific Secrets (REVALIDATION_TOKEN_[JOURNAL_CODE])
 * 4. Path validation to prevent traversal attacks
 * 5. Rate limiting (10 requests/minute per IP)
 */

// Simple in-memory rate limiter (10 req/min per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000; // 1 minute

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

/**
 * Validate revalidation path to prevent path traversal attacks
 *
 * @param path - Path to validate
 * @param journalId - Optional journal ID to verify path matches
 * @returns true if path is valid, false otherwise
 */
function isValidRevalidatePath(path: string, journalId?: string): boolean {
  // Validate format /sites/[journalId]/[lang]/...
  const pattern = /^\/sites\/[a-z0-9-]+\/[a-z]{2}(\/.*)?$/;
  if (!pattern.test(path)) return false;

  // If journalId provided, verify it matches
  if (journalId) {
    const pathJournalId = path.split('/')[2];
    if (pathJournalId !== journalId) return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. IP Whitelist Check
    const allowedIps = process.env.ALLOWED_IPS
      ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim())
      : [];
    // Cast to any because NextRequest.ip might be missing in some type definitions despite existing at runtime
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] || (request as any).ip || '';

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      console.warn(`[Revalidate API] Blocked unauthorized IP: ${clientIp}`);
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Rate Limiting Check
    if (!checkRateLimit(clientIp)) {
      console.warn(`[Revalidate API] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
    }

    // 3. Extract Authentication and Parameters
    const body = await request.json();
    const { tag, path, journalId } = body;
    const headerToken = request.headers.get('x-episciences-token');

    if (!headerToken) {
      return NextResponse.json({ message: 'Missing authentication token' }, { status: 401 });
    }

    // 4. Token Verification (Journal-specific or Global)
    let isAuthorized = false;

    if (journalId) {
      // Check for journal-specific token: REVALIDATION_TOKEN_EPIJINFO
      const journalToken =
        process.env[`REVALIDATION_TOKEN_${journalId.toUpperCase().replace(/-/g, '_')}`];
      if (journalToken && headerToken === journalToken) {
        isAuthorized = true;
      }
    }

    // Fallback to global secret if journal secret not found or not provided
    if (!isAuthorized) {
      const globalSecret = process.env.REVALIDATION_SECRET;
      if (globalSecret && headerToken === globalSecret) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      console.warn(`[Revalidate API] Invalid token provided for journal: ${journalId || 'global'}`);
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    // 5. Execution
    if (tag) {
      console.log(`[Revalidate API] Revalidating tag: ${tag}`);
      revalidateTag(tag, { expire: 0 });
    } else if (path) {
      // Validate path format to prevent path traversal attacks
      if (!isValidRevalidatePath(path, journalId)) {
        console.warn(`[Revalidate API] Invalid path format: ${path}`);
        return NextResponse.json({ message: 'Invalid path format' }, { status: 400 });
      }

      console.log(`[Revalidate API] Revalidating path: ${path}`);
      revalidatePath(path);
    } else {
      return NextResponse.json({ message: 'Missing tag or path' }, { status: 400 });
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      journalId: journalId || 'global',
      tag: tag || undefined,
    });
  } catch (error) {
    console.error('[Revalidate API] Error:', error);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Revalidation API is secure',
    usage: 'POST with x-episciences-token header',
    security: ['IP Whitelist', 'Header Token', 'Journal-specific tokens'],
  });
}
