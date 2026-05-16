'use client';

import { useState } from 'react';
import { getPdfProxyUrl } from '@/utils/pdf';
import './PDFProxyIframe.scss';

interface PDFProxyIframeProps {
  pdfUrl: string;
  title?: string;
  height?: string;
  className?: string;
}

export function PDFProxyIframe({
  pdfUrl,
  title = 'PDF Preview',
  height = '600px',
  className = '',
}: PDFProxyIframeProps) {
  const proxyUrl = pdfUrl ? getPdfProxyUrl(pdfUrl, 'inline') : '';
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!pdfUrl) {
    return <div className="pdf-proxy-iframe-empty">No PDF URL provided</div>;
  }

  return (
    <div className={`pdf-proxy-iframe-container ${className}`} style={{ height }}>
      {isLoading && <div className="pdf-proxy-iframe-loading">Loading PDF preview...</div>}
      {hasError && (
        <div className="pdf-proxy-iframe-error">Failed to load PDF. Please try again later.</div>
      )}
      {proxyUrl && (
        <iframe
          src={proxyUrl}
          title={title}
          className="pdf-proxy-iframe"
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          allow="fullscreen"
        />
      )}
    </div>
  );
}
