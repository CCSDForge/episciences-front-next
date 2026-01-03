"use client";

import { Fragment, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/Link/Link';
import { IArticleCitedBy } from '@/types/article';
import orcid from '/public/icons/orcid.svg';

interface CitedBySectionProps {
  citedBy: IArticleCitedBy[];
}

export default function CitedBySection({ citedBy }: CitedBySectionProps): JSX.Element | null {
  const { t } = useTranslation();

  if (!citedBy?.length) return null;

  return (
    <div className="articleDetails-content-article-section-content-citedBy">
      {citedBy.map((cb, index) => (
        <div key={index} className="articleDetails-content-article-section-content-citedBy-row">
          <p className="articleDetails-content-article-section-content-citedBy-row-source">
            {t('pages.articleDetails.citedBySection.source')}{cb.source}
          </p>
          <ul className="articleDetails-content-article-section-content-citedBy-row-citations">
            {cb.citations.map((citation, index) => (
              <li key={index} className="articleDetails-content-article-section-content-citedBy-row-citations-citation">
                <p className="articleDetails-content-article-section-content-citedBy-row-citations-citation-title">
                  {citation.title}
                </p>
                <p className="articleDetails-content-article-section-content-citedBy-row-citations-citation-source">
                  {citation.sourceTitle}
                </p>
                <p className="articleDetails-content-article-section-content-citedBy-row-citations-citation-authors">
                  {t('pages.articleDetails.citedBySection.authors')} : {citation.authors.map<ReactNode>((author, index) => (
                    <Fragment key={index}>
                      <span>{author.fullname}</span>
                      {author.orcid && (
                        <Link href={`${process.env.NEXT_PUBLIC_VITE_ORCID_HOMEPAGE}/${author.orcid}`} title={author.orcid} target='_blank' rel="noopener noreferrer">
                          {' '}
                          <img src={orcid} alt='ORCID icon' />
                        </Link>
                      )}
                    </Fragment>
                  )).reduce((prev, curr) => [prev, ', ', curr])}
                </p>
                <p className="articleDetails-content-article-section-content-citedBy-row-citations-citation-reference">
                  {t('pages.articleDetails.citedBySection.reference')} : {t('pages.articleDetails.citedBySection.volume')} {citation.reference.volume}, {citation.reference.year}, {t('pages.articleDetails.citedBySection.page')} {citation.reference.page}
                </p>
                <Link 
                  href={`${process.env.NEXT_PUBLIC_VITE_DOI_HOMEPAGE}/${citation.doi}`} 
                  className="articleDetails-content-article-section-content-citedBy-row-citations-citation-doi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {t('pages.articleDetails.citedBySection.doi')} : {citation.doi}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
} 