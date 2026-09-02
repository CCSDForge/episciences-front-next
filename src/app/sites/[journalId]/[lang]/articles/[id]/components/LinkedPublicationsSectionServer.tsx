import React from 'react';
import { Link } from '@/components/Link/Link';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';
import { DatasetIcon } from '@/components/icons';
import { IArticleRelatedItem } from '@/types/article';
import { RepositoryPreview } from '@/types/repository-preview';
import {
  INTER_WORK_RELATIONSHIP,
  interworkRelationShipTypes,
  LINKED_PUBLICATION_IDENTIFIER_TYPE,
} from '@/utils/article';
import { decodeText } from '@/utils/markdown';
import { DOI_URL, ARXIV_URL, HAL_URL, SOFTWARE_HERITAGE_URL } from '@/config/external-urls';
import { Translations, t } from '@/utils/server-i18n';
import type { Components, ExtraProps } from 'react-markdown';
import type { ComponentProps } from 'react';
import RepositoryPreviewItem from './RepositoryPreviewItem';

interface LinkedPublicationsSectionServerProps {
  readonly relatedItems: IArticleRelatedItem[];
  readonly translations: Translations;
  readonly language?: string;
  /** Server-resolved repository previews, keyed by `${identifierType}-${value}`. */
  readonly repositoryPreviews?: Record<string, RepositoryPreview>;
}

function renderCitationMarkdownLink({
  href,
  children,
}: ComponentProps<'a'> & ExtraProps): React.JSX.Element {
  return (
    <Link
      href={href!}
      target="_blank"
      rel="noopener noreferrer"
      className="articleDetails-content-article-section-content-linkedPublications-publication-markdown-link"
    >
      {children?.toString()}
    </Link>
  );
}

const citationMarkdownComponents: Components = { a: renderCitationMarkdownLink };

// Human-readable provider names for UI labels (viewer title, "too many files" link text).
// Kept here rather than on RepositoryProvider since it is a display-only concern.
const PROVIDER_DISPLAY_NAMES: Record<string, string> = { nakala: 'Nakala' };

/** The relationship badge (e.g. "Cites") repeated by every row variant below. */
function RelationshipBadge({
  labelPath,
  translations,
}: {
  labelPath?: string;
  translations: Translations;
}): React.JSX.Element | null {
  if (!labelPath) return null;
  return (
    <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">
      {t(labelPath, translations)}
    </div>
  );
}

export default function LinkedPublicationsSectionServer({
  relatedItems,
  translations,
  repositoryPreviews = {},
}: LinkedPublicationsSectionServerProps): React.JSX.Element | null {
  if (!relatedItems?.length) return null;

  // Filter out specific relationship types
  const filteredItems = relatedItems.filter(
    relatedItem =>
      relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.IS_SAME_AS &&
      relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.HAS_PREPRINT
  );

  // If no items remain after filtering, return null
  if (filteredItems.length === 0) return null;

  const getLinkedPublicationRow = (relatedItem: IArticleRelatedItem): React.JSX.Element => {
    const relationship = interworkRelationShipTypes.find(
      relationship => relationship.value === relatedItem.relationshipType
    )?.labelPath;
    const badge = <RelationshipBadge labelPath={relationship} translations={translations} />;

    // Checked before the `citation` branch below: a repository item (e.g. Nakala) may carry a
    // citation too, and must still render through RepositoryPreviewItem to get its viewer toggle.
    const preview = repositoryPreviews[`${relatedItem.identifierType}-${relatedItem.value}`];
    if (preview) {
      const providerLabel = PROVIDER_DISPLAY_NAMES[preview.providerId] || preview.providerId;
      return (
        <RepositoryPreviewItem
          preview={preview}
          providerLabel={providerLabel}
          icon={<DatasetIcon size={20} />}
          relationshipBadge={badge}
          labels={{
            preview: t('pages.articleDetails.repositoryPreview.preview', translations),
            hidePreview: t('pages.articleDetails.repositoryPreview.hidePreview', translations),
            viewerTitle: t('pages.articleDetails.repositoryPreview.viewerTitle', translations, {
              provider: providerLabel,
            }),
            imageBadge: t('pages.articleDetails.repositoryPreview.imageBadge', translations),
            loading: t('pages.articleDetails.repositoryPreview.loading', translations),
            error: t('pages.articleDetails.repositoryPreview.error', translations),
            retry: t('pages.articleDetails.repositoryPreview.retry', translations),
            selectFile: t('pages.articleDetails.repositoryPreview.selectFile', translations),
            openOnRepository: t(
              'pages.articleDetails.repositoryPreview.openOnRepository',
              translations,
              { provider: providerLabel }
            ),
          }}
        >
          {relatedItem.citation && (
            <MarkdownRenderer components={citationMarkdownComponents}>
              {decodeText(relatedItem.citation)}
            </MarkdownRenderer>
          )}
        </RepositoryPreviewItem>
      );
    }

    if (relatedItem.citation) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <MarkdownRenderer components={citationMarkdownComponents}>
            {decodeText(relatedItem.citation)}
          </MarkdownRenderer>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.URI) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={relatedItem.value}
            className="articleDetails-content-article-section-content-linkedPublications-publication-uri"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.DOI) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={`${DOI_URL}/${relatedItem.value}`}
            className="articleDetails-content-article-section-content-linkedPublications-publication-doi"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.ARXIV) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={`${ARXIV_URL}/abs/${relatedItem.value}`}
            className="articleDetails-content-article-section-content-linkedPublications-publication-arxiv"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.HAL) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={`${HAL_URL}/${relatedItem.value}`}
            className="articleDetails-content-article-section-content-linkedPublications-publication-hal"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (
      relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER &&
      relatedItem.value.includes('swh')
    ) {
      const swhHomepage = SOFTWARE_HERITAGE_URL;

      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={`${swhHomepage}/${relatedItem.value}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="articleDetails-content-article-section-content-linkedPublications-publication-img"
              src={`${swhHomepage}/badge/${relatedItem.value}`}
              alt={relatedItem.value}
            />
          </Link>
          <iframe
            title="Software preview"
            loading="lazy"
            className="articleDetails-content-article-section-content-linkedPublications-publication-embed"
            src={`${swhHomepage}/browse/embed/${relatedItem.value}`}
          />
        </div>
      );
    }

    if (
      relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER &&
      relatedItem.value.includes('https')
    ) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {badge}
          <Link
            href={relatedItem.value}
            className="articleDetails-content-article-section-content-linkedPublications-publication-uri"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    return (
      <div className="articleDetails-content-article-section-content-linkedPublications-publication">
        {badge}
        <div>{relatedItem.value}</div>
      </div>
    );
  };

  return (
    <ul>
      {filteredItems.map(relatedItem => (
        <li key={`${relatedItem.identifierType}-${relatedItem.value}`}>
          {getLinkedPublicationRow(relatedItem)}
        </li>
      ))}
    </ul>
  );
}
