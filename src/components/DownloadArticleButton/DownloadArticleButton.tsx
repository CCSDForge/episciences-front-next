'use client';

import React from 'react';

interface DownloadArticleButtonProps {
  readonly downloadHref: string;
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
}

export default function DownloadArticleButton({
  downloadHref,
  ariaLabel,
  children,
}: DownloadArticleButtonProps) {
  return (
    <a href={downloadHref} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
      {children}
    </a>
  );
}
