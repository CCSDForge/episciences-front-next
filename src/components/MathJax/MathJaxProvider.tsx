'use client';

import React, { createContext, use, useEffect, useState } from 'react';
import { MathJaxBaseContext, MathJaxContext } from 'better-react-mathjax';
import { logger } from '@/lib/logger';
import { mathJaxConfig, mathJaxSrc } from '@/config/mathjax';

const log = logger.child({ service: 'mathjax-provider' });

/**
 * True once the MathJax script is loaded and started up.
 *
 * Defaults to false: outside of MathJaxProvider there is no MathJax script to wait for,
 * and BetterMathJax would throw without a MathJaxContext, so components keep plain text.
 */
export const MathJaxReadyContext = createContext(false);

/**
 * Tracks MathJax startup once for the whole tree.
 *
 * better-react-mathjax chains `typesetClear([ref.current])` on the MathJax loading promise
 * and rethrows any failure. If the element unmounts while the script is still loading
 * (e.g. a list swapped for a loader during a client refetch), `ref.current` is null and
 * MathJax crashes with an unhandled "Typesetting failed: Cannot read properties of null
 * (reading 'contains')". MathJax components wait for this readiness before mounting
 * BetterMathJax, which closes that window.
 */
export function MathJaxReadyProvider({ children }: { children: React.ReactNode }) {
  const base = use(MathJaxBaseContext);
  const [ready, setReady] = useState(!base);

  useEffect(() => {
    if (!base) return;
    let cancelled = false;

    base.promise
      .then(mathJax => ('startup' in mathJax ? mathJax.startup?.promise : undefined))
      .then(() => {
        if (!cancelled) setReady(true);
      })
      // Load failures are logged by MathJaxProvider's onError; components stay on plain text.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [base]);

  return <MathJaxReadyContext value={ready}>{children}</MathJaxReadyContext>;
}

/**
 * The script's `error` event is passed as is, not an Error.
 * Without onError, better-react-mathjax rethrows it as an unhandled rejection.
 */
function handleLoadError(error: unknown): void {
  const reason = error instanceof Error ? error.message : `could not download ${mathJaxSrc}`;
  log.warn('[MathJax] Failed to load:', reason);
}

/**
 * Loads MathJax and exposes its readiness to every MathJax component below.
 */
export function MathJaxProvider({ children }: { children: React.ReactNode }) {
  return (
    <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={3} onError={handleLoadError}>
      <MathJaxReadyProvider>{children}</MathJaxReadyProvider>
    </MathJaxContext>
  );
}
