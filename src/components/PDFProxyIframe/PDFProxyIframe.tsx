'use client';

import { useState } from 'react';
import './PDFProxyIframe.scss';

interface PDFProxyIframeProps {
  src: string;
  title?: string;
  height?: string;
  className?: string;
}

export function PDFProxyIframe({
  src,
  title = 'PDF Preview',
  height = '600px',
  className = '',
}: PDFProxyIframeProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  if (!src) {
    return <div className="pdf-proxy-iframe-empty">No PDF URL provided</div>;
  }

  return (
    <div className={`pdf-proxy-iframe-container ${className}`} style={{ height }}>
      {isLoading && <div className="pdf-proxy-iframe-loading">Loading PDF preview...</div>}
      {hasError && (
        <div className="pdf-proxy-iframe-error">Failed to load PDF. Please try again later.</div>
      )}
      <iframe
        src={src}
        title={title}
        className="pdf-proxy-iframe"
        onLoad={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setHasError(true); }}
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}