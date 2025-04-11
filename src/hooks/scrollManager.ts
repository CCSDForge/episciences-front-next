'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const MAX_ATTEMPTS = 10;
const ATTEMPTS_INTERVAL = 200;

function ScrollManager(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Récupérer le hash depuis l'URL
    const hash = window.location.hash;
    
    if (hash) {
      const id = hash.replace('#', '');
      let attempts = 0;

      const tryScrollToElement = (): void => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          clearInterval(intervalId);
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalId);
        }
        attempts++;
      };

      const intervalId = setInterval(tryScrollToElement, ATTEMPTS_INTERVAL);
      return () => clearInterval(intervalId);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, searchParams]);

  return null;
}

export default ScrollManager; 