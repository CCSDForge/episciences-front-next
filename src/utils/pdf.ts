/**
 * PDF utility functions for proxy URL generation and validation
 */

/**
 * Generate proxy URL for PDF to bypass CORS and control Content-Disposition
 * @param originalUrl - The original PDF URL from external source
 * @param disposition - 'inline' for preview (default) or 'attachment' for download
 * @param filename - Optional filename for downloads (e.g., 'article_123.pdf')
 * @returns Proxied URL through /api/pdf-proxy endpoint
 */
export function getPdfProxyUrl(
  originalUrl: string,
  disposition: 'inline' | 'attachment' = 'inline',
  filename?: string
): string {
  let url = `/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}&disposition=${disposition}`;
  if (filename && disposition === 'attachment') {
    url += `&filename=${encodeURIComponent(filename)}`;
  }
  return url;
}
