"use client";

import { useTranslation } from 'react-i18next';
import { Link } from '@/components/Link/Link';
import { IArticleReference } from '@/types/article';

interface ReferencesSectionProps {
  references: IArticleReference[];
}

export default function ReferencesSection({ references }: ReferencesSectionProps): JSX.Element | null {
  const { t } = useTranslation();

  if (!references?.length) return null;

  return (
    <ol className="articleDetails-content-article-section-content-references">
      {references.map((reference, index) => (
        <li key={index} className="articleDetails-content-article-section-content-references-reference">
          <p>{reference.citation}</p>
          {reference.doi && (
            <Link 
              href={`${process.env.NEXT_PUBLIC_VITE_DOI_HOMEPAGE}/${reference.doi}`} 
              className="articleDetails-content-article-section-content-references-reference-doi" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {t('common.doi')} : {reference.doi}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
} 