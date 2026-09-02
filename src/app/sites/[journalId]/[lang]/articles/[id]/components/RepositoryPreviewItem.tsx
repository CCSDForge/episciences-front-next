'use client';

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { Link } from '@/components/Link/Link';
import { EyeIcon, EyeSlashIcon } from '@/components/icons';
import { RepositoryPreview } from '@/types/repository-preview';

const ExternalEmbedViewer = dynamic(
  () => import('@/components/ExternalEmbedViewer/ExternalEmbedViewer'),
  { loading: () => null }
);

// A deposit with an unreasonable number of previewable files has no IIIF manifest to page
// through it; fall back to a plain outbound link rather than rendering dozens of tabs/options.
const MAX_SELECTABLE_FILES = 50;
const TAB_SELECTOR_THRESHOLD = 6;

export interface RepositoryPreviewItemLabels {
  readonly preview: string;
  readonly hidePreview: string;
  readonly viewerTitle: string;
  readonly imageBadge: string;
  readonly loading: string;
  readonly error: string;
  readonly retry: string;
  readonly selectFile: string;
  readonly openOnRepository: string;
}

interface RepositoryPreviewItemProps {
  readonly preview: RepositoryPreview;
  readonly providerLabel: string;
  readonly icon: React.ReactNode;
  readonly relationshipBadge?: React.ReactNode;
  readonly labels: RepositoryPreviewItemLabels;
  readonly children?: React.ReactNode;
}

export default function RepositoryPreviewItem({
  preview,
  providerLabel,
  icon,
  relationshipBadge,
  labels,
  children,
}: RepositoryPreviewItemProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const viewerId = useId();

  const files = preview.files.slice(0, MAX_SELECTABLE_FILES);
  const selectedFile = files[selectedIndex] ?? files[0];
  const tooManyFiles = preview.files.length > MAX_SELECTABLE_FILES;

  return (
    <div className="articleDetails-content-article-section-content-linkedPublications-publication">
      {relationshipBadge}
      <div className="articleDetails-content-article-section-content-linkedPublications-repository-header">
        <span
          className="articleDetails-content-article-section-content-linkedPublications-repository-icon"
          role="img"
          aria-label={providerLabel}
        >
          {icon}
        </span>
        <Link
          href={preview.landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="articleDetails-content-article-section-content-linkedPublications-publication-doi"
        >
          {preview.identifier}
        </Link>
        <span className="articleDetails-content-article-section-content-linkedPublications-repository-typeBadge">
          {labels.imageBadge}
        </span>
        {!tooManyFiles && selectedFile && (
          <button
            type="button"
            className="articleDetails-content-article-section-content-linkedPublications-repository-toggle"
            aria-expanded={isOpen}
            aria-controls={viewerId}
            onClick={() => setIsOpen(open => !open)}
          >
            {isOpen ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
            <span>{isOpen ? labels.hidePreview : labels.preview}</span>
          </button>
        )}
      </div>

      {children && (
        <div className="articleDetails-content-article-section-content-linkedPublications-repository-citation">
          {children}
        </div>
      )}

      {isOpen && selectedFile && (
        <div
          id={viewerId}
          className="articleDetails-content-article-section-content-linkedPublications-repository-viewer"
        >
          {files.length > 1 && files.length <= TAB_SELECTOR_THRESHOLD && (
            <div
              className="articleDetails-content-article-section-content-linkedPublications-repository-tabs"
              role="tablist"
            >
              {files.map((file, index) => (
                <button
                  key={file.id}
                  type="button"
                  role="tab"
                  aria-selected={index === selectedIndex}
                  className="articleDetails-content-article-section-content-linkedPublications-repository-tab"
                  onClick={() => setSelectedIndex(index)}
                >
                  {file.label}
                </button>
              ))}
            </div>
          )}

          {files.length > TAB_SELECTOR_THRESHOLD && (
            <label className="articleDetails-content-article-section-content-linkedPublications-repository-selectLabel">
              {labels.selectFile}
              <select
                value={selectedIndex}
                onChange={event => setSelectedIndex(Number(event.target.value))}
                className="articleDetails-content-article-section-content-linkedPublications-repository-select"
              >
                {files.map((file, index) => (
                  <option key={file.id} value={index}>
                    {file.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ExternalEmbedViewer
            src={selectedFile.embedUrl}
            title={labels.viewerTitle}
            loadingLabel={labels.loading}
            errorLabel={labels.error}
            retryLabel={labels.retry}
            className="articleDetails-content-article-section-content-linkedPublications-repository-embed"
          />
        </div>
      )}

      {tooManyFiles && (
        <Link
          href={preview.landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="articleDetails-content-article-section-content-linkedPublications-publication-uri"
        >
          {labels.openOnRepository}
        </Link>
      )}
    </div>
  );
}
