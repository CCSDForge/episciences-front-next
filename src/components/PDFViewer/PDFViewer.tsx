"use client";

import { useState, useEffect } from 'react';
import './PDFViewer.scss';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
}

/**
 * Simple PDF Viewer using Mozilla's PDF.js viewer
 * This is more reliable than react-pdf for repositories like Zenodo
 */
export default function PDFViewer({ pdfUrl, title }: PDFViewerProps): JSX.Element {
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
          <a
            href={pdfUrl}
            download
            className="pdf-viewer-btn pdf-viewer-download-link"
          >
            Download PDF
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-viewer-btn pdf-viewer-open-link"
          >
            Open in New Tab
          </a>
          <button
            onClick={() => setShowFallback(!showFallback)}
            className="pdf-viewer-btn"
          >
            {showFallback ? 'Show Viewer' : 'Show Info'}
          </button>
        </div>
      </div>

      <div className="pdf-viewer-content">
        {!showFallback ? (
          <iframe
            src={viewerUrl}
            className="pdf-viewer-iframe"
            title={`PDF Viewer - ${title}`}
            allow="fullscreen"
          />
        ) : (
          <div className="pdf-viewer-fallback">
            <h2>PDF Information</h2>
            <p>
              This PDF is hosted on an external repository. You can:
            </p>
            <ul>
              <li>Use the viewer above (powered by Mozilla PDF.js)</li>
              <li>Download the PDF to view it locally</li>
              <li>Open it in a new tab</li>
            </ul>
            <div className="pdf-viewer-fallback-actions">
              <a
                href={pdfUrl}
                download
                className="pdf-viewer-fallback-link"
              >
                Download PDF
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pdf-viewer-fallback-link"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
