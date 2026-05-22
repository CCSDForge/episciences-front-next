'use client';

import React from 'react';

interface DownloadArticleButtonProps {
  downloadHref: string;
  children: React.ReactNode;
}

export default function DownloadArticleButton({ downloadHref, children }: DownloadArticleButtonProps) {
  return <a href={downloadHref} download>{children}</a>;
}
