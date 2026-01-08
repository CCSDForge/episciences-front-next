'use client';

import { DownloadBlueIcon, ExternalLinkBlueIcon } from '@/components/icons';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './PDFViewer.scss';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
}

/**
 * Simple PDF Viewer using Mozilla's PDF.js viewer
 * This is more reliable than react-pdf for repositories like Zenodo
 */
export default function PDFViewer({ pdfUrl, title }: PDFViewerProps): React.JSX.Element {
  const { t } = useTranslation();
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [showFallback, setShowFallback] = useState<boolean>(false);

  useEffect(() => {
    // Use Mozilla's hosted PDF.js viewer for better compatibility
    const encodedUrl = encodeURIComponent(pdfUrl);
    const pdfJsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}`;
    setViewerUrl(pdfJsViewerUrl);

    // Set a timeout to show fallback if iframe doesn't load
    const timer = setTimeout(() => {
      // Check if we should show the fallback
      // This is a simple approach - you could add more sophisticated checks
    }, 5000);

    return () => clearTimeout(timer);
  }, [pdfUrl]);

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-toolbar">
        <div className="pdf-viewer-toolbar-title">{title}</div>

        <div className="pdf-viewer-toolbar-controls">
          <a href={pdfUrl} download className="pdf-viewer-action-btn">
            <DownloadBlueIcon size={16} ariaLabel="Download" />
            <span>{t('components.pdfViewer.downloadPDF')}</span>
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-viewer-action-btn"
          >
            <ExternalLinkBlueIcon size={16} ariaLabel="Open in new tab" />
            <span>{t('components.pdfViewer.openInNewTab')}</span>
          </a>
          <button
            onClick={() => setShowFallback(!showFallback)}
            className="pdf-viewer-action-btn pdf-viewer-toggle-btn"
          >
            <span>
              {showFallback
                ? t('components.pdfViewer.showViewer')
                : t('components.pdfViewer.showInfo')}
            </span>
          </button>
        </div>
      </div>

      <div className="pdf-viewer-content">
        {!showFallback && viewerUrl ? (
          <iframe
            src={viewerUrl}
            className="pdf-viewer-iframe"
            title={`PDF Viewer - ${title}`}
            allow="fullscreen"
          />
        ) : (
          <div className="pdf-viewer-fallback">
            <h2>{t('components.pdfViewer.fallback.title')}</h2>
            <p>{t('components.pdfViewer.fallback.description')}</p>
            <ul>
              <li>{t('components.pdfViewer.fallback.useViewer')}</li>
              <li>{t('components.pdfViewer.fallback.downloadLocal')}</li>
              <li>{t('components.pdfViewer.fallback.openNewTab')}</li>
            </ul>
            <div className="pdf-viewer-fallback-actions">
              <a href={pdfUrl} download className="pdf-viewer-action-btn">
                <DownloadBlueIcon size={16} ariaLabel="Download" />
                <span>{t('components.pdfViewer.downloadPDF')}</span>
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pdf-viewer-action-btn"
              >
                <ExternalLinkBlueIcon size={16} ariaLabel="Open in new tab" />
                <span>{t('components.pdfViewer.openInNewTab')}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
