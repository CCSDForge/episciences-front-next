"use client";

interface PreviewSectionProps {
  pdfLink: string;
}

/**
 * Check if PDF source supports inline preview
 * Some repositories (Zenodo) force download via Content-Disposition header
 */
function supportsInlinePreview(pdfLink: string): boolean {
  // Repositories that force download - disable preview for these
  const noPreviewSources = [
    'zenodo.org',
  ];

  return !noPreviewSources.some(source => pdfLink.includes(source));
}

export default function PreviewSection({ pdfLink }: PreviewSectionProps): JSX.Element | null {
  if (!pdfLink) return null;

  // Don't show preview at all for unsupported sources
  if (!supportsInlinePreview(pdfLink)) {
    return null;
  }

  return (
    <iframe
      title="Document preview"
      loading="lazy"
      src={pdfLink}
      className="articleDetails-content-article-section-content-preview"
      allow="fullscreen"
    />
  );
} 