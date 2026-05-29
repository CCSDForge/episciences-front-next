export const ALLOWED_PDF_DOMAINS = [
  'zenodo.org',
  'arxiv.org',
  'hal.archives-ouvertes.fr',
  'hal.science',
  'archive.softwareheritage.org',
];

export function isAllowedPdfDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') return false;
    const hostname = urlObj.hostname;
    return ALLOWED_PDF_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function generateArticleFilename(
  journalCode: string,
  articleId: string | number,
  title: string
): string {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  const prefix = journalCode ? `${journalCode}_` : '';
  return `${prefix}article_${articleId}_${sanitizedTitle}.pdf`;
}

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
