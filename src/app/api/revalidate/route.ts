import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getClientIp, sanitizeForLog } from '@/utils/validation';
import { isAllowedPdfDomain } from '@/utils/pdf';
import { getCacheKey, deleteCacheEntry } from '@/lib/pdf-cache';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'revalidate-api' });

/**
 * API Route for Secure On-Demand Revalidation
 *
 * Security Measures:
 * 1. IP Whitelisting (via ALLOWED_IPS env var)
 * 2. Header-based Authentication (x-episciences-token)
 * 3. Journal-specific Secrets (REVALIDATION_TOKEN_[JOURNAL_CODE])
 * 4. Path validation to prevent traversal attacks
 * 5. Rate limiting (configurable via env vars)
 *
 * Cache consistency across the cluster is handled by the shared Valkey cache
 * (see src/lib/cache-handler.js). PEER_SERVERS broadcasting is no longer needed.
 *
 * An optional `pdfUrl` field additionally invalidates one entry of the PDF
 * disk cache (see docs/PDF_CACHE_STRATEGY.md) — delete-only, and the only
 * write to that cache made outside the background worker. The key is always
 * recomputed from pdfUrl server-side, never trusted from the request body.
 */

if (process.env.NODE_ENV === 'production' && !process.env.REVALIDATION_SECRET) {
  log.warn('[Revalidate API] CRITICAL: REVALIDATION_SECRET is not set in production!');
}

// Simple in-memory rate limiter (Configurable via env)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = Number(process.env.REVALIDATE_RATE_LIMIT) || 100;
const RATE_WINDOW = Number(process.env.REVALIDATE_RATE_WINDOW) || 60000; // 1 minute default

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

function isValidRevalidatePath(path: string, journalId?: string): boolean {
  const pattern = /^\/sites\/[a-z0-9-]+\/[a-z]{2}(\/.*)?$/;
  if (!pattern.test(path)) return false;

  if (journalId) {
    const pathJournalId = path.split('/')[2];
    if (pathJournalId !== journalId) return false;
  }

  return true;
}

function verifyToken(token: string, secret: string): boolean {
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function resolveAuthorization(headerToken: string, journalId?: string): boolean {
  if (journalId) {
    const journalToken =
      process.env[`REVALIDATION_TOKEN_${journalId.toUpperCase().replaceAll('-', '_')}`];
    if (journalToken && verifyToken(headerToken, journalToken)) {
      return true;
    }
  }
  const globalSecret = process.env.REVALIDATION_SECRET;
  return !!globalSecret && verifyToken(headerToken, globalSecret);
}

async function performPdfCacheInvalidation(pdfUrl: string): Promise<NextResponse | null> {
  if (!isAllowedPdfDomain(pdfUrl)) {
    log.warn(`[Revalidate API] Invalid pdfUrl domain: ${sanitizeForLog(pdfUrl)}`);
    return NextResponse.json({ message: 'Invalid pdfUrl domain' }, { status: 400 });
  }
  const key = getCacheKey(pdfUrl);
  await deleteCacheEntry(key);
  log.info(`[Revalidate API] Invalidated pdf cache entry for: ${sanitizeForLog(pdfUrl)}`);
  return null;
}

function performRevalidation(tag?: string, path?: string, journalId?: string): NextResponse | null {
  if (tag) {
    log.info(`[Revalidate API] Revalidating tag: ${sanitizeForLog(tag)}`);
    revalidateTag(tag, { expire: 0 });
    return null;
  }
  if (path) {
    if (!isValidRevalidatePath(path, journalId)) {
      log.warn(`[Revalidate API] Invalid path format: ${sanitizeForLog(path)}`);
      return NextResponse.json({ message: 'Invalid path format' }, { status: 400 });
    }
    log.info(`[Revalidate API] Revalidating path: ${sanitizeForLog(path)}`);
    revalidatePath(path);
    return null;
  }
  return NextResponse.json({ message: 'Missing tag or path' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const allowedIps = process.env.ALLOWED_IPS
      ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim())
      : [];
    const clientIp = getClientIp(request.headers);

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      log.warn(`[Revalidate API] Blocked unauthorized IP: ${clientIp}`);
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!checkRateLimit(clientIp)) {
      log.warn(`[Revalidate API] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { tag, path, journalId, pdfUrl } = body;
    const headerToken = request.headers.get('x-episciences-token');

    if (!headerToken) {
      return NextResponse.json({ message: 'Missing authentication token' }, { status: 401 });
    }

    if (!resolveAuthorization(headerToken, journalId)) {
      log.warn(
        `[Revalidate API] Invalid token provided for journal: ${sanitizeForLog(journalId) || 'global'}`
      );
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    if (!tag && !path && !pdfUrl) {
      return NextResponse.json({ message: 'Missing tag, path, or pdfUrl' }, { status: 400 });
    }

    if (pdfUrl) {
      const pdfErrorResponse = await performPdfCacheInvalidation(pdfUrl);
      if (pdfErrorResponse) return pdfErrorResponse;
    }

    if (tag || path) {
      const errorResponse = performRevalidation(tag, path, journalId);
      if (errorResponse) return errorResponse;
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      journalId: journalId || 'global',
      tag: tag || undefined,
      pdfUrl: pdfUrl || undefined,
    });
  } catch (error) {
    log.error('[Revalidate API] Error:', error);
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
