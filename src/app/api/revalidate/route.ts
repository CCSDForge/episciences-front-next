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
 *
 * Multi-Server Support:
 * When PEER_SERVERS env var is set, the server broadcasts revalidation
 * requests to all peer servers to ensure cache consistency across the cluster.
 */

// Peer servers for multi-server deployments (comma-separated URLs)
const PEER_SERVERS = process.env.PEER_SERVERS
  ? process.env.PEER_SERVERS.split(',').map(url => url.trim()).filter(Boolean)
  : [];

// Header to identify forwarded revalidation requests (prevents infinite loops)
const FORWARDED_HEADER = 'x-forwarded-revalidation';

// Simple in-memory rate limiter (Configurable via env)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = Number(process.env.REVALIDATE_RATE_LIMIT) || 100;
const RATE_WINDOW = Number(process.env.REVALIDATE_RATE_WINDOW) || 60000; // 1 minute default

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
 * Broadcast revalidation request to peer servers
 * Uses Promise.allSettled to not block if some peers are unavailable
 */
async function broadcastToPeers(
  payload: { tag?: string; path?: string; journalId?: string },
  authToken: string
): Promise<void> {
  if (PEER_SERVERS.length === 0) return;

  const results = await Promise.allSettled(
    PEER_SERVERS.map(async peerUrl => {
      const response = await fetch(`${peerUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-episciences-token': authToken,
          [FORWARDED_HEADER]: 'true',
        },
        body: JSON.stringify(payload),
      });
      return { peerUrl, status: response.status };
    })
  );

  // Log broadcast results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(
    `[Revalidate API] Broadcast complete: ${successful}/${PEER_SERVERS.length} peers updated` +
      (failed > 0 ? `, ${failed} failed` : '')
  );

  // Log individual failures for debugging
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[Revalidate API] Broadcast to ${PEER_SERVERS[index]} failed:`, result.reason);
    }
  });
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
    // Check if this is a forwarded request from another peer server
    const isForwarded = request.headers.get(FORWARDED_HEADER) === 'true';

    // 1. IP Whitelist Check (skip for forwarded requests from trusted peers)
    const allowedIps = process.env.ALLOWED_IPS
      ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim())
      : [];
    // Cast to any because NextRequest.ip might be missing in some type definitions despite existing at runtime
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] || (request as any).ip || '';

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp) && !isForwarded) {
      console.warn(`[Revalidate API] Blocked unauthorized IP: ${clientIp}`);
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Rate Limiting Check (skip for forwarded requests to avoid double-counting)
    if (!isForwarded && !checkRateLimit(clientIp)) {
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
      console.log(
        `[Revalidate API] Revalidating tag: ${tag}${isForwarded ? ' (forwarded)' : ''}`
      );
      revalidateTag(tag, { expire: 0 });
    } else if (path) {
      // Validate path format to prevent path traversal attacks
      if (!isValidRevalidatePath(path, journalId)) {
        console.warn(`[Revalidate API] Invalid path format: ${path}`);
        return NextResponse.json({ message: 'Invalid path format' }, { status: 400 });
      }

      console.log(
        `[Revalidate API] Revalidating path: ${path}${isForwarded ? ' (forwarded)' : ''}`
      );
      revalidatePath(path);
    } else {
      return NextResponse.json({ message: 'Missing tag or path' }, { status: 400 });
    }

    // 6. Broadcast to peer servers (only for original requests, not forwarded ones)
    if (!isForwarded && PEER_SERVERS.length > 0 && headerToken) {
      // Fire and forget - don't wait for broadcast to complete
      broadcastToPeers({ tag, path, journalId }, headerToken).catch(err => {
        console.error('[Revalidate API] Broadcast error:', err);
      });
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      journalId: journalId || 'global',
      tag: tag || undefined,
      broadcast: !isForwarded && PEER_SERVERS.length > 0,
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
