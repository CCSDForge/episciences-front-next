'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useIsHydrated } from '@/hooks/useIsHydrated';

const log = logger.child({ service: 'pdf-proxy' });
import './PDFProxyIframe.scss';

// Slightly under the server timeout (30s) so the client shows a retry before
// the server returns a 504 (which would land as a blank iframe via onLoad).
const LOAD_TIMEOUT_MS = 25000;

interface PDFProxyIframeProps {
  readonly src: string;
  readonly title?: string;
  readonly height?: string;
  readonly className?: string;
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
  const [trackedSrc, setTrackedSrc] = useState(src);
  const isMounted = useIsHydrated();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the status when the PDF URL changes, adjusting state during render rather than
  // in an effect (https://react.dev/learn/you-might-not-need-an-effect).
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setStatus('loading');
  }

  // Arm the load timeout for every (src, retry) attempt. The status itself is reset by the
  // block above and by the retry handler, so this effect never sets state synchronously.
  useEffect(() => {
    if (!isMounted) return;
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
    log.error('[PDFProxyIframe] Failed to load:', src);
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
            onClick={() => {
              setRetryKey(k => k + 1);
              setStatus('loading');
            }}
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
