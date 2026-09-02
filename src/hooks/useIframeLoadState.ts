'use client';

import { useState, useEffect, useRef } from 'react';
import { useIsHydrated } from '@/hooks/useIsHydrated';

export type IframeLoadStatus = 'loading' | 'loaded' | 'error';

interface UseIframeLoadStateResult {
  readonly status: IframeLoadStatus;
  readonly isMounted: boolean;
  readonly retryKey: number;
  readonly handleLoad: () => void;
  readonly handleError: () => void;
  readonly retry: () => void;
}

/**
 * Generic loading/loaded/error state machine for an externally-hosted iframe, extracted from
 * PDFProxyIframe so any embed viewer (Nakala, and future repository providers) gets the same
 * loading skeleton / timeout / retry robustness without depending on the PDF-specific component.
 */
export function useIframeLoadState(src: string, timeoutMs: number): UseIframeLoadStateResult {
  const [status, setStatus] = useState<IframeLoadStatus>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [trackedSrc, setTrackedSrc] = useState(src);
  const isMounted = useIsHydrated();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the status when the src changes, adjusting state during render rather than in an
  // effect (https://react.dev/learn/you-might-not-need-an-effect).
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setStatus('loading');
  }

  useEffect(() => {
    if (!isMounted) return;
    timerRef.current = setTimeout(() => setStatus('error'), timeoutMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, retryKey, isMounted, timeoutMs]);

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
    setStatus('error');
  };

  const retry = () => {
    setRetryKey(k => k + 1);
    setStatus('loading');
  };

  return { status, isMounted, retryKey, handleLoad, handleError, retry };
}
