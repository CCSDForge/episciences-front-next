'use client';

import { useEffect } from 'react';
import { getPdfProxyUrl } from '@/utils/pdf';
import './ArticleDetailsDownload.scss';

interface ArticleDetailsDownloadClientProps {
  pdfUrl: string;
  articleTitle: string;
}

/**
 * Download page component - Redirects immediately to PDF download
 *
 * This page serves as a tracking endpoint for download statistics in Apache logs.
 * It immediately redirects the user to the PDF download via the proxy API.
 */
export default function ArticleDetailsDownloadClient({
  pdfUrl,
  articleTitle,
}: ArticleDetailsDownloadClientProps) {
  useEffect(() => {
    // Redirect immediately to PDF download with Content-Disposition: attachment
    const downloadUrl = getPdfProxyUrl(pdfUrl, 'attachment');
    window.location.href = downloadUrl;
  }, [pdfUrl]);

  return (
    <div className="download-page-wrapper">
      <div className="download-page-loading">
        <div className="download-page-loading-spinner" />
        <p>Préparation du téléchargement de {articleTitle}...</p>
        <p className="download-page-loading-hint">
          Si le téléchargement ne démarre pas automatiquement,{' '}
          <a href={getPdfProxyUrl(pdfUrl, 'attachment')}>cliquez ici</a>.
        </p>
      </div>
    </div>
  );
}
