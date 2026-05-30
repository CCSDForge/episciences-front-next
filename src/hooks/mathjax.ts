'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'mathjax' });

const MAX_ATTEMPTS = 10;
const ATTEMPTS_INTERVAL = 200;

function MathjaxRefresh(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      let attempts = 0;

      const tryRefetchMathjax = (): void => {
        // MathJax v3 API
        if (window?.MathJax?.typesetPromise) {
          window.MathJax.typesetPromise().catch((err: Error) => {
            log.warn('Typeset error:', err.message);
          });
          clearInterval(intervalId);
        } else if (window?.MathJax?.typeset) {
          // Fallback to synchronous typeset
          try {
            window.MathJax.typeset();
          } catch (err) {
            log.warn('Typeset error:', err);
          }
          clearInterval(intervalId);
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalId);
        }
        attempts++;
      };

      const intervalId = setInterval(tryRefetchMathjax, ATTEMPTS_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [pathname]);

  return null;
}

export default MathjaxRefresh;
