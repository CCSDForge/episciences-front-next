'use client';

import { useEffect, useState } from 'react';

interface HeaderClientWrapperProps {
  children: React.ReactNode;
}

/**
 * Client wrapper that adds scroll behavior to the header
 * This component adds the "header-reduced" class when scrolling down
 */
export default function HeaderClientWrapper({ children }: HeaderClientWrapperProps): JSX.Element {
  const [isReduced, setIsReduced] = useState(false);
  const reducedScrollPosition = 100;

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setIsReduced(position > reducedScrollPosition);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedScrollPosition]);

  useEffect(() => {
    // Apply the class to the header element
    const header = document.querySelector('header.header');
    if (header) {
      if (isReduced) {
        header.classList.add('header-reduced');
      } else {
        header.classList.remove('header-reduced');
      }
    }
  }, [isReduced]);

  return <>{children}</>;
}