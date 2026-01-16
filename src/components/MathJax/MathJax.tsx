'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MathJax as BetterMathJax } from 'better-react-mathjax';

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
 * then switches to the MathJax component once mounted.
 */
const MathJax: React.FC<MathJaxProps> = ({
  children,
  dynamic = false,
  component: Component = 'span',
  ...props
}) => {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Force MathJax typesetting after mount and when children change
  useEffect(() => {
    if (mounted && containerRef.current) {
      // Small delay to ensure BetterMathJax has rendered
      const timer = setTimeout(() => {
        if (window?.MathJax?.typesetPromise) {
          window.MathJax.typesetPromise([containerRef.current!]).catch((err: Error) => {
            // Ignore "no elements to typeset" errors
            if (!err.message?.includes('no elements')) {
              console.warn('[MathJax] Typeset error:', err.message);
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
