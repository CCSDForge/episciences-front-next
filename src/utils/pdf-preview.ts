/**
 * Check if a PDF URL source supports inline preview
 * Some repositories force download via Content-Disposition header
 */
export function supportsInlinePreview(pdfUrl: string | undefined): boolean {
  if (!pdfUrl) {
    return false;
  }

  // Repositories that force download - disable preview for these
  const noPreviewSources = [
    'zenodo.org',
  ];

  return !noPreviewSources.some(source => pdfUrl.includes(source));
}
