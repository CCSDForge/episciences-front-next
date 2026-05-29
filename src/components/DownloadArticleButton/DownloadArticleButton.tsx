'use client';

import React from 'react';

interface DownloadArticleButtonProps {
  downloadHref: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export default function DownloadArticleButton({ downloadHref, ariaLabel, children }: DownloadArticleButtonProps) {
  return (
    <a
      href={downloadHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
