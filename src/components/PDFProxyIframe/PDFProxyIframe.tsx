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
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setStatus('loading');
    timerRef.current = setTimeout(() => setStatus('error'), LOAD_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, retryKey, isMounted]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleLoad = () => {
    clearTimer();
    setStatus('loaded');
  };

  const handleError = () => {
    clearTimer();
    console.error('[PDFProxyIframe] Failed to load:', src);
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
      {isMounted && status !== 'error' && (
        <iframe
          key={`${src}-${retryKey}`}
          src={src}
          title={title}
          className="pdf-proxy-iframe"
          onLoad={handleLoad}
          onError={handleError}
          allow="fullscreen"
        />
      )}
    </div>
  );
}
