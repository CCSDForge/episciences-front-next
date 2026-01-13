'use client';

import { useEffect, useRef } from 'react';
import { handleKeyboardClick } from '@/utils/keyboard';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearOnUnmount?: boolean;
}

/**
 * LiveRegion component for announcing dynamic content changes to screen readers.
 *
 * @param message - The message to announce
 * @param politeness - 'polite' (default) or 'assertive' for urgency
 * @param clearOnUnmount - Whether to clear message when component unmounts
 *
 * @example
 * // Announce pagination change
 * <LiveRegion message="Page 2 loaded" />
 *
 * @example
 * // Announce urgent error
 * <LiveRegion message="Form submission failed" politeness="assertive" />
 *
 * WCAG: Fixes 4.1.3 Status Messages (Level AA)
 */
export default function LiveRegion({
  message,
  politeness = 'polite',
  clearOnUnmount = true,
}: LiveRegionProps): React.JSX.Element {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const regionElement = regionRef.current;
    if (regionElement && message) {
      // Update the text content to trigger screen reader announcement
      regionElement.textContent = message;
    }

    return () => {
      if (clearOnUnmount && regionElement) {
        regionElement.textContent = '';
      }
    };
  }, [message, clearOnUnmount]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
