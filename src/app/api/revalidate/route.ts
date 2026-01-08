import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Secure On-Demand Revalidation
 * 
 * Security Measures:
 * 1. IP Whitelisting (via ALLOWED_IPS env var)
 * 2. Header-based Authentication (x-episciences-token)
 * 3. Journal-specific Secrets (REVALIDATION_TOKEN_[JOURNAL_CODE])
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP Whitelist Check
    const allowedIps = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [];
    // Cast to any because NextRequest.ip might be missing in some type definitions despite existing at runtime
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || (request as any).ip || '';
    
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      console.warn(`[Revalidate API] Blocked unauthorized IP: ${clientIp}`);
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract Authentication and Parameters
    const body = await request.json();
    const { tag, path, journalId } = body;
    const headerToken = request.headers.get('x-episciences-token');

    if (!headerToken) {
      return NextResponse.json({ message: 'Missing authentication token' }, { status: 401 });
    }

    // 3. Token Verification (Journal-specific or Global)
    let isAuthorized = false;

    if (journalId) {
      // Check for journal-specific token: REVALIDATION_TOKEN_EPIJINFO
      const journalToken = process.env[`REVALIDATION_TOKEN_${journalId.toUpperCase().replace(/-/g, '_')}`];
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

    // 4. Execution
    if (tag) {
      console.log(`[Revalidate API] Revalidating tag: ${tag}`);
      revalidateTag(tag, { expire: 0 });
    } else if (path) {
      console.log(`[Revalidate API] Revalidating path: ${path}`);
      revalidatePath(path);
    } else {
      return NextResponse.json({ message: 'Missing tag or path' }, { status: 400 });
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      journalId: journalId || 'global',
      tag: tag || undefined
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
    security: ['IP Whitelist', 'Header Token', 'Journal-specific tokens']
  });
}