'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MAX_ATTEMPTS = 10;
const ATTEMPTS_INTERVAL = 200;

function MathjaxRefresh(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      let attempts = 0;

      const tryRefetchMathjax = (): void => {
        if (window && window.MathJax && window.MathJax.Hub) {
          window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
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
