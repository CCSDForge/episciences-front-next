'use client';

import dynamic from 'next/dynamic';
import { needsPdfJsViewer } from '@/utils/pdf-preview';

// Dynamically import PDFViewer to avoid SSR issues with PDF.js
const PDFViewer = dynamic(() => import('@/components/PDFViewer/PDFViewer'), {
  ssr: false,
  loading: () => {
    // Note: Can't use hooks in dynamic loading component
    // Using fallback text that will be replaced when component loads
    return (
      <div className="pdf-viewer-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="pdf-viewer-spinner"></div>
        <p>Loading PDF viewer...</p>
      </div>
    );
  },
});

interface PreviewSectionProps {
  pdfLink: string;
}

/**
 * Hybrid PDF Preview Component
 * - Uses PDF.js viewer for problematic sources (Zenodo) that force download
 * - Uses standard iframe for other sources (HAL, arXiv) for better performance
 */
export default function PreviewSection({ pdfLink }: PreviewSectionProps): React.JSX.Element | null {
  if (!pdfLink) return null;

  // Check if this source requires PDF.js viewer (e.g., Zenodo)
  const usePdfJs = needsPdfJsViewer(pdfLink);

  if (usePdfJs) {
    // Use PDF.js viewer for problematic sources
    return (
      <div className="articleDetails-content-article-section-content-preview-container">
        <PDFViewer pdfUrl={pdfLink} title="Document preview" />
      </div>
    );
  }

  // Use standard iframe for other sources (faster, native)
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
