"use client";

import { useTranslation } from 'react-i18next';
import { Link } from '@/components/Link/Link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IArticleRelatedItem } from '@/types/article';
import { INTER_WORK_RELATIONSHIP, interworkRelationShipTypes, LINKED_PUBLICATION_IDENTIFIER_TYPE } from '@/utils/article';
import { decodeText } from "@/utils/markdown";

interface LinkedPublicationsSectionProps {
  relatedItems: IArticleRelatedItem[];
}

export default function LinkedPublicationsSection({ relatedItems }: LinkedPublicationsSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!relatedItems?.length) return null;

  // Filter out specific relationship types
  const filteredItems = relatedItems.filter(
    (relatedItem) =>
      relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.IS_SAME_AS &&
      relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.HAS_PREPRINT
  );

  // If no items remain after filtering, return null
  if (filteredItems.length === 0) return null;

  const getLinkedPublicationRow = (relatedItem: IArticleRelatedItem): React.JSX.Element => {
    const relationship = interworkRelationShipTypes.find(relationship => relationship.value === relatedItem.relationshipType)?.labelPath;

    if (relatedItem.citation) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ ...props }) => (
                <Link 
                  href={props.href!} 
                  target='_blank' 
                  rel="noopener noreferrer" 
                  className="articleDetails-content-article-section-content-linkedPublications-publication-markdown-link"
                >
                  {props.children?.toString()}
                </Link>
              )
            }}
          >
            {decodeText(relatedItem.citation)}
          </ReactMarkdown>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.URI) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={relatedItem.value} className="articleDetails-content-article-section-content-linkedPublications-publication-uri" target="_blank" rel="noopener noreferrer">
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.DOI) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={`${process.env.NEXT_PUBLIC_VITE_DOI_HOMEPAGE}/${relatedItem.value}`} className="articleDetails-content-article-section-content-linkedPublications-publication-doi" target="_blank" rel="noopener noreferrer">
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.ARXIV) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={`${process.env.NEXT_PUBLIC_VITE_ARXIV_HOMEPAGE}/abs/${relatedItem.value}`} className="articleDetails-content-article-section-content-linkedPublications-publication-arxiv" target="_blank" rel="noopener noreferrer">
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.HAL) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={`${process.env.NEXT_PUBLIC_VITE_HAL_HOMEPAGE}/${relatedItem.value}`} className="articleDetails-content-article-section-content-linkedPublications-publication-hal" target="_blank" rel="noopener noreferrer">
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER && relatedItem.value.includes('swh')) {
      const swhHomepage = process.env.NEXT_PUBLIC_VITE_ARCHIVE_SOFTWARE_HERITAGE_HOMEPAGE || 'https://archive.softwareheritage.org';
      
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={`${swhHomepage}/${relatedItem.value}`} target='_blank' rel="noopener noreferrer">
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

    if (relatedItem.identifierType === LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER && relatedItem.value.includes('https')) {
      return (
        <div className="articleDetails-content-article-section-content-linkedPublications-publication">
          {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
          <Link href={relatedItem.value} className="articleDetails-content-article-section-content-linkedPublications-publication-uri" target="_blank" rel="noopener noreferrer">
            {relatedItem.value}
          </Link>
        </div>
      );
    }

    return (
      <div className="articleDetails-content-article-section-content-linkedPublications-publication">
        {relationship && <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">{t(relationship)}</div>}
        <div>{relatedItem.value}</div>
      </div>
    );
  };

  return (
    <ul>
      {filteredItems.map((relatedItem, index) => (
        <li key={index}>{getLinkedPublicationRow(relatedItem)}</li>
      ))}
    </ul>
  );
} 