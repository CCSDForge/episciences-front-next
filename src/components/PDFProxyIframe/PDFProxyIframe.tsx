'use client';

import { useState, useEffect, useRef } from 'react';
import './PDFProxyIframe.scss';

// Slightly under the server timeout (30s) so the client shows a retry before
// the server returns a 504 (which would land as a blank iframe via onLoad).
const LOAD_TIMEOUT_MS = 25000;

interface PDFProxyIframeProps {
  src: string;
  title?: string;
  height?: string;
  className?: string;
}

type Status = 'loading' | 'loaded' | 'error';

export function PDFProxyIframe({
  src,
  title = 'PDF Preview',
  height = '600px',
  className = '',
}: PDFProxyIframeProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setStatus('loading');
    timerRef.current = setTimeout(() => setStatus('error'), LOAD_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, retryKey]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleLoad = () => {
    clearTimer();
    // onLoad fires for both PDF responses and HTTP error responses (404, 504…).
    // For a real PDF the browser's PDF viewer takes over and contentDocument is
    // null/inaccessible. For an HTML/text error body it is accessible.
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc != null) {
        setStatus('error');
        return;
      }
    } catch {
      // SecurityError → PDF viewer running in sandboxed context → success
    }
    setStatus('loaded');
  };

  const handleError = () => {
    clearTimer();
    setStatus('error');
  };

  if (!src) {
    return <div className="pdf-proxy-iframe-empty">No PDF URL provided</div>;
  }

  return (
    <div className={`pdf-proxy-iframe-container ${className}`} style={{ height }}>
      {status === 'loading' && (
        <div className="pdf-proxy-iframe-loading">Loading PDF preview...</div>
      )}
      {status === 'error' && (
        <div className="pdf-proxy-iframe-error">
          <span>Failed to load PDF preview.</span>
          <button
            type="button"
            className="pdf-proxy-iframe-retry"
            onClick={() => setRetryKey(k => k + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {status !== 'error' && (
        <iframe
          key={retryKey}
          ref={iframeRef}
          src={src}
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
