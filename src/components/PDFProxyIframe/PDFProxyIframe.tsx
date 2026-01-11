'use client';

import { useState, useEffect } from 'react';
import { getPdfProxyUrl } from '@/utils/pdf';
import './PDFProxyIframe.scss';

interface PDFProxyIframeProps {
  pdfUrl: string;
  title?: string;
  height?: string;
  className?: string;
}

/**
 * PDFProxyIframe - Simple iframe-based PDF viewer using Next.js proxy
 *
 * Uses browser's native PDF rendering for optimal performance (0KB bundle, LCP < 1s)
 * All PDFs are routed through /pdf-proxy to:
 * - Bypass CORS restrictions
 * - Force inline display (Content-Disposition: inline)
 * - Provide consistent rendering across all sources
 */
export function PDFProxyIframe({
  pdfUrl,
  title = 'PDF Preview',
  height = '600px',
  className = '',
}: PDFProxyIframeProps) {
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (pdfUrl) {
      setProxyUrl(getPdfProxyUrl(pdfUrl, 'inline'));
    }
  }, [pdfUrl]);

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
      {isLoading && (
        <div className="pdf-proxy-iframe-loading">Loading PDF preview...</div>
      )}
      {hasError && (
        <div className="pdf-proxy-iframe-error">
          Failed to load PDF. Please try again later.
        </div>
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
