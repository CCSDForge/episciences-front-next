"use client";

interface PreviewSectionProps {
  pdfLink: string;
}

export default function PreviewSection({ pdfLink }: PreviewSectionProps): JSX.Element | null {
  return pdfLink ? <iframe title="Document preview" loading="lazy" src={pdfLink} className="articleDetails-content-article-section-content-preview" /> : null;
} 