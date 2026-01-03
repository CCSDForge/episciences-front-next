'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // IMPORTANT: We use suppressHydrationWarning because MathJax might have 
  // already modified the DOM if the library loaded very fast, 
  // or better-react-mathjax might do something subtle.
  // However, rendering plain children on both sides is the key.
  
  if (!mounted) {
    return (
      <Component {...props} suppressHydrationWarning>
        {children}
      </Component>
    );
  }

  return (
    <BetterMathJax
      dynamic={dynamic}
      {...props}
    >
      {children}
    </BetterMathJax>
  );
};

export default MathJax;
