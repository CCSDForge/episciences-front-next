/**
 * Check if a PDF URL source requires PDF.js viewer instead of standard iframe
 * Some repositories (like Zenodo) force download via Content-Disposition header,
 * which prevents display in standard iframe. PDF.js viewer bypasses this issue.
 */
export function needsPdfJsViewer(pdfUrl: string | undefined): boolean {
  if (!pdfUrl) {
    return false;
  }

  // Repositories that require PDF.js viewer (force download in standard iframe)
  const pdfJsSources: string[] = [
    'zenodo.org',
    // Add other problematic sources here if needed
  ];

  return pdfJsSources.some(source => pdfUrl.includes(source));
}

/**
 * Check if a PDF URL source supports inline preview
 * With the hybrid approach, all sources support preview:
 * - Standard iframe for most sources (fast, native)
 * - PDF.js viewer for problematic sources (Zenodo, etc.)
 *
 * @deprecated Use needsPdfJsViewer() instead to determine viewer type
 */
export function supportsInlinePreview(pdfUrl: string | undefined): boolean {
  if (!pdfUrl) {
    return false;
  }

  // All sources now support preview (either via iframe or PDF.js)
  return true;
}
