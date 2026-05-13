'use client';

import React from 'react';
import { getPdfProxyUrl } from '@/utils/pdf';

interface DownloadArticleButtonProps {
  pdfLink: string;
  downloadHref: string;
  filename?: string;
  children: React.ReactNode;
}

export default function DownloadArticleButton({
  pdfLink,
  downloadHref,
  filename,
  children,
}: DownloadArticleButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    void fetch(downloadHref, { redirect: 'manual' }).catch(() => {});
    window.location.href = getPdfProxyUrl(pdfLink, 'attachment', filename);
  };

  return (
    <a href={downloadHref} onClick={handleClick}>
      {children}
    </a>
  );
}
