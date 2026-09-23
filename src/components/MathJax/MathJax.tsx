'use client';

import React, { use, useEffect, useRef } from 'react';
import { MathJax as BetterMathJax } from 'better-react-mathjax';
import { logger } from '@/lib/logger';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { MathJaxReadyContext } from './MathJaxProvider';

const log = logger.child({ service: 'mathjax-component' });

interface MathJaxProps extends React.ComponentPropsWithoutRef<'span'> {
  children: React.ReactNode;
  dynamic?: boolean;
}

/**
 * A wrapper around better-react-mathjax's MathJax component to avoid hydration mismatches.
 * It renders plain children on the server and initial client render,
 * then switches to the MathJax component once mounted and MathJax has started up.
 */
const MathJax: React.FC<MathJaxProps> = ({ children, dynamic = false, ...props }) => {
  const hydrated = useIsHydrated();
  const mathJaxReady = use(MathJaxReadyContext);
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
      <span data-mathjax-state="not-mounted" {...props} suppressHydrationWarning>
        {children}
      </span>
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
