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

/**
 * Validate if URL is a valid HTTP/HTTPS URL
 * @param url - URL string to validate
 * @returns true if valid HTTP/HTTPS URL, false otherwise
 */
export function isValidPdfUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 * @param url - URL string
 * @returns hostname or null if invalid URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if PDF is hosted on a known source
 * @param url - PDF URL
 * @returns source name or 'unknown'
 */
export function identifyPdfSource(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return 'unknown';

  if (domain.includes('zenodo.org')) return 'zenodo';
  if (domain.includes('arxiv.org')) return 'arxiv';
  if (domain.includes('hal.archives-ouvertes.fr') || domain.includes('hal.science')) return 'hal';
  if (domain.includes('archive.softwareheritage.org')) return 'softwareheritage';

  return 'unknown';
}
