import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for On-Demand Revalidation
 *
 * This endpoint allows external services (e.g., backend CMS) to trigger
 * cache revalidation when content changes.
 *
 * Usage:
 * POST /api/revalidate
 * Body: {
 *   "secret": "your-secret-token",
 *   "tag": "articles" | "news" | "about" | etc.,
 *   "path": "/en/articles/123" (optional, for path-based revalidation)
 * }
 *
 * Response:
 * - 200: { revalidated: true, now: timestamp }
 * - 401: { message: "Invalid secret" }
 * - 400: { message: "Missing tag or path" }
 * - 500: { message: "Error revalidating" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tag, path } = body;

    // Verify the secret token
    // Set REVALIDATION_SECRET in your environment variables
    const revalidationSecret = process.env.REVALIDATION_SECRET;

    if (!revalidationSecret) {
      console.error('[Revalidate API] REVALIDATION_SECRET not configured');
      return NextResponse.json(
        { message: 'Revalidation not configured' },
        { status: 500 }
      );
    }

    if (secret !== revalidationSecret) {
      console.warn('[Revalidate API] Invalid secret provided');
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate by tag or path
    if (tag) {
      console.log(`[Revalidate API] Revalidating tag: ${tag}`);
      // Next.js 16 requires a second argument: cacheLife profile or { expire: 0 } for immediate expiration
      revalidateTag(tag, { expire: 0 });
    } else if (path) {
      console.log(`[Revalidate API] Revalidating path: ${path}`);
      revalidatePath(path);
    } else {
      return NextResponse.json(
        { message: 'Missing tag or path parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      tag: tag || undefined,
      path: path || undefined,
    });

  } catch (error) {
    console.error('[Revalidate API] Error:', error);
    return NextResponse.json(
      { message: 'Error revalidating', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing/health check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Revalidation API is running',
    usage: 'POST with { secret, tag } or { secret, path }',
    availableTags: [
      'about',
      'articles',
      'news',
      'members',
      'volumes',
      'sections',
      'credits',
      'for-authors',
    ],
  });
}
