'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { MathJax as BetterMathJax, MathJaxBaseContext } from 'better-react-mathjax';
import { logger } from '@/lib/logger';
import { useIsHydrated } from '@/hooks/useIsHydrated';

const log = logger.child({ service: 'mathjax-component' });

// Shared across instances: once MathJax has started up, new instances can typeset right away.
let mathJaxStartedUp = false;

/**
 * Resolves to true once the MathJax script is loaded and started up.
 *
 * better-react-mathjax chains `typesetClear([ref.current])` on the MathJax loading promise
 * and rethrows any failure. If the element unmounts while the script is still loading
 * (e.g. a list swapped for a loader during a client refetch), `ref.current` is null and
 * MathJax crashes with an unhandled "Typesetting failed: Cannot read properties of null
 * (reading 'contains')". Mounting BetterMathJax only once MathJax is ready closes that window.
 */
function useMathJaxReady(): boolean {
  const context = useContext(MathJaxBaseContext);
  const [ready, setReady] = useState(() => mathJaxStartedUp || !context);

  useEffect(() => {
    if (ready || !context) return;
    let cancelled = false;

    context.promise
      .then(mathJax => ('startup' in mathJax ? mathJax.startup?.promise : undefined))
      .then(() => {
        mathJaxStartedUp = true;
        if (!cancelled) setReady(true);
      })
      .catch((err: Error) => {
        log.warn('[MathJax] Failed to load:', err?.message);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, context]);

  return ready;
}

interface MathJaxProps {
  children: React.ReactNode;
  dynamic?: boolean;
  component?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * A wrapper around better-react-mathjax's MathJax component to avoid hydration mismatches.
 * It renders plain children on the server and initial client render,
 * then switches to the MathJax component once mounted and MathJax has started up.
 */
const MathJax: React.FC<MathJaxProps> = ({
  children,
  dynamic = false,
  component: Component = 'span',
  ...props
}) => {
  const hydrated = useIsHydrated();
  const mathJaxReady = useMathJaxReady();
  const mounted = hydrated && mathJaxReady;
  const containerRef = useRef<HTMLSpanElement>(null);

  // Force MathJax typesetting after mount and when children change
  useEffect(() => {
    if (mounted && containerRef.current) {
      // Small delay to ensure BetterMathJax has rendered
      const timer = setTimeout(() => {
        if (window?.MathJax?.typesetPromise) {
          window.MathJax.typesetPromise([containerRef.current!]).catch((err: Error) => {
            // Ignore "no elements to typeset" errors
            if (!err.message?.includes('no elements')) {
              log.warn('[MathJax] Typeset error:', err.message);
            }
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mounted, children]);

  if (!mounted) {
    return (
      <Component data-mathjax-state="not-mounted" {...props} suppressHydrationWarning>
        {children}
      </Component>
    );
  }

  return (
    <span ref={containerRef} data-mathjax-state="mounted">
      <BetterMathJax dynamic={dynamic} {...props}>
        {children}
      </BetterMathJax>
    </span>
  );
};

export default MathJax;
