/**
 * Check if a PDF URL source supports inline preview
 * Some repositories force download via Content-Disposition header
 *
 * NOTE: Zenodo and similar sources now use PDF.js viewer in ArticleDetailsDownloadClient,
 * so they can be previewed directly. This function is kept for backward compatibility
 * but may need updates if other problematic sources are discovered.
 */
export function supportsInlinePreview(pdfUrl: string | undefined): boolean {
  if (!pdfUrl) {
    return false;
  }

  // Repositories that force download and cannot be displayed even with PDF.js
  // Currently empty as we handle Zenodo via PDF.js
  const noPreviewSources: string[] = [
    // Add sources here if they cannot be displayed at all
  ];

  return !noPreviewSources.some(source => pdfUrl.includes(source));
}
