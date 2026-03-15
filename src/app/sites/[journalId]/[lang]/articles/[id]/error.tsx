'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Article Error]', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Article not available</h2>
      <p>This article could not be loaded. It may not exist or be temporarily unavailable.</p>
      <button
        type="button"
        onClick={reset}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
}
