'use client';

import { PDFProxyIframe } from '@/components/PDFProxyIframe/PDFProxyIframe';

interface PreviewSectionProps {
  pdfLink: string;
}

/**
 * PDF Preview Component
 * Uses PDFProxyIframe which routes all PDFs through Next.js proxy to:
 * - Bypass CORS restrictions for all sources (Zenodo, HAL, arXiv, etc.)
 * - Force inline display (prevents auto-download)
 * - Provide consistent rendering with native browser performance
 */
export default function PreviewSection({ pdfLink }: PreviewSectionProps): React.JSX.Element | null {
  if (!pdfLink) return null;

  return (
    <PDFProxyIframe
      pdfUrl={pdfLink}
      height="600px"
      title="Document preview"
      className="articleDetails-content-article-section-content-preview"
    />
  );
}
