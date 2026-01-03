"use client";

import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import './ArticleDetailsDownload.scss';

// Dynamically import PDFViewer to avoid SSR issues with PDF.js
const PDFViewer = dynamic(() => import('@/components/PDFViewer/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="pdf-viewer-loading">
      <div className="pdf-viewer-spinner"></div>
      <p>Loading PDF viewer...</p>
    </div>
  )
});

interface ArticleDetailsDownloadClientProps {
  pdfUrl: string;
  articleTitle: string;
}

export default function ArticleDetailsDownloadClient({
  pdfUrl,
  articleTitle
}: ArticleDetailsDownloadClientProps): JSX.Element {
  const { t } = useTranslation();

  // Check if the PDF source is from a repository that might need special handling
  const isZenodo = pdfUrl.includes('zenodo.org');
  const useAdvancedViewer = isZenodo || pdfUrl.includes('arxiv.org');

  // If it's from Zenodo or similar sources that may have issues with iframe, use PDF.js viewer
  if (useAdvancedViewer) {
    return (
      <div className="pdf-container">
        <PDFViewer pdfUrl={pdfUrl} title={articleTitle} />
      </div>
    );
  }

  // For standard PDFs, use the traditional iframe approach
  return (
    <div className="pdf-container">
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-title">
          {articleTitle}
        </div>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pdf-toolbar-link"
        >
          {t('pages.articleDetails.download.openInNewTab')}
        </a>
      </div>
      <iframe
        src={pdfUrl}
        className="pdf-frame"
        title={`PDF - ${articleTitle}`}
        allow="fullscreen"
      />
      <div className="pdf-fallback">
        <h1>{t('pages.articleDetails.download.pdfDisplayTitle')}</h1>
        <p>
          {t('pages.articleDetails.download.pdfDisplayMessage')}
        </p>
        <a href={pdfUrl} className="pdf-fallback-link" target="_blank" rel="noopener noreferrer">
          {t('pages.articleDetails.download.openPDF')}
        </a>
      </div>
    </div>
  );
}
