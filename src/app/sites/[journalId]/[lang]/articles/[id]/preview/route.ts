import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { logArticleProgress } from '@/utils/build-progress';

/**
 * GET /articles/[id]/preview - Tracking endpoint for article views
 *
 * This endpoint serves as a tracking pixel to count article views in Apache logs.
 * It's called by an invisible 1x1 image in ArticleDetailsClient.tsx.
 *
 * Returns a transparent 1x1 GIF image.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  await connection();

  const { id, lang } = await params;

  // Log article view for build progress statistics
  logArticleProgress(id, lang, 'preview');

  // Return a transparent 1x1 GIF image
  // Base64: R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
  const transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  return new NextResponse(transparentGif, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
