'use client';

import React, { use, useLayoutEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { MathJaxReadyContext } from './MathJaxProvider';

const log = logger.child({ service: 'mathjax-component' });

interface MathJaxProps extends React.ComponentPropsWithoutRef<'span'> {
  children: React.ReactNode;
  dynamic?: boolean;
}

// MathJax 3 typesetting calls must not overlap: each one waits for the previous.
let typesetQueue: Promise<void> = Promise.resolve();

/**
 * Queues the typesetting of one element.
 *
 * The element is captured by the caller while it is still mounted, and skipped if it
 * has left the document by the time its turn comes. better-react-mathjax instead reads
 * its ref only once its promise chain resolves: an element unmounted in between is
 * passed to MathJax as null ("Typesetting failed: Cannot read properties of null
 * (reading 'contains')").
 */
function queueTypeset(element: HTMLElement): void {
  typesetQueue = typesetQueue
    .then(() => {
      const mathJax = window.MathJax;
      if (!element.isConnected || !mathJax?.typesetPromise) return;
      mathJax.typesetClear?.([element]);
      return mathJax.typesetPromise([element]);
    })
    .catch((err: Error) => {
      log.warn('[MathJax] Typeset error:', err?.message);
    });
}

/**
 * Renders plain children on the server and initial client render, then typesets them
 * once mounted and MathJax has started up — which avoids hydration mismatches.
 * Instances re-typeset when their children change, dynamic ones on every render.
 */
const MathJax: React.FC<MathJaxProps> = ({ children, dynamic = false, ...props }) => {
  const hydrated = useIsHydrated();
  const mathJaxReady = use(MathJaxReadyContext);
  const mounted = hydrated && mathJaxReady;
  const containerRef = useRef<HTMLSpanElement>(null);

  // Like better-react-mathjax: dynamic instances re-typeset on every render
  useLayoutEffect(() => {
    if (dynamic && mounted && containerRef.current) queueTypeset(containerRef.current);
  });

  useLayoutEffect(() => {
    if (!dynamic && mounted && containerRef.current) queueTypeset(containerRef.current);
  }, [dynamic, mounted, children]);

  return (
    <span
      ref={containerRef}
      data-mathjax-state={mounted ? 'mounted' : 'not-mounted'}
      {...props}
      style={{ display: 'block', ...props.style }}
      suppressHydrationWarning
    >
      {children}
    </span>
  );
};

export default MathJax;
