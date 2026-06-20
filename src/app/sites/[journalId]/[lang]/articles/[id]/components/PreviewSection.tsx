'use client';

import { PDFProxyIframe } from '@/components/PDFProxyIframe/PDFProxyIframe';

interface PreviewSectionProps {
  previewHref: string;
}

export default function PreviewSection({
  previewHref,
}: PreviewSectionProps): React.JSX.Element | null {
  if (!previewHref) return null;

  return (
    <PDFProxyIframe
      src={previewHref}
      height="600px"
      title="Document preview"
      className="articleDetails-content-article-section-content-preview"
    />
  );
}
