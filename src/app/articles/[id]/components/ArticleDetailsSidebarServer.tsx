'use client';

import React, { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { ICitation, getLicenseTranslations, getMetadataTypes } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { VOLUME_TYPE } from '@/utils/volume';
import { PATHS } from '@/config/paths';
import InteractiveDropdown from './InteractiveDropdown';

// Import des icônes
import externalLink from '/public/icons/external-link-black.svg';
import download from '/public/icons/download-black.svg';
import caretUpGrey from '/public/icons/caret-up-grey.svg';
import caretDownGrey from '/public/icons/caret-down-grey.svg';

import '@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar.scss';

interface ArticleDetailsSidebarServerProps {
  article: IArticle;
  relatedVolume?: IVolume | null;
  citations: ICitation[];
  metrics?: JSX.Element;
}

export default function ArticleDetailsSidebarServer({ 
  article, 
  relatedVolume, 
  citations, 
  metrics 
}: ArticleDetailsSidebarServerProps): JSX.Element {

  // State for collapsible sections
  const [isPublicationDetailsOpen, setIsPublicationDetailsOpen] = useState(true);
  const [isFundingOpen, setIsFundingOpen] = useState(true);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(true);

  const renderRelatedVolume = (relatedVolume?: IVolume | null): JSX.Element | null => {
    if (!relatedVolume) return null;

    let text = '';

    if (relatedVolume?.types && relatedVolume.types.length > 0) {
      if (relatedVolume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        text += 'Proceedings';
      }

      if (relatedVolume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        text += 'Special issue';
      }
    } else {
      text += 'Volume';
    }

    return (
      <Link href={`/${PATHS.volumes}/${relatedVolume.id}`} className="articleDetailsSidebar-volumeDetails-number">
        {text} {relatedVolume.num}
      </Link>
    );
  };

  const renderLicenseContent = (): JSX.Element | null => {
    if (!article?.license) return null;

    // Simplified license rendering for server-side
    return (
      <div className="articleDetailsSidebar-volumeDetails-license">
        <div>License</div>
        <div className="articleDetailsSidebar-volumeDetails-license-content">{article.license}</div>
      </div>
    );
  };

  return (
    <div className="articleDetailsSidebar">
      <div className="articleDetailsSidebar-links">
        {article?.pdfLink && (
          <Link href={`/${PATHS.articles}/${article.id}/download`}>
            <div className="articleDetailsSidebar-links-link">
              <img className="articleDetailsSidebar-links-link-icon" src={download} alt="Download icon" />
              <div className="articleDetailsSidebar-links-link-text">Download article</div>
            </div>
          </Link>
        )}
        {article?.docLink && (
          <a
            href={article.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="articleDetailsSidebar-links-link"
          >
            <img
              className="articleDetailsSidebar-links-link-icon"
              src={externalLink}
              alt="External link icon"
            />
            <div className="articleDetailsSidebar-links-link-text">
              Open on {article.repositoryName}
            </div>
          </a>
        )}
        
        <InteractiveDropdown type="cite" citations={citations} articleId={article.id.toString()} />
        <InteractiveDropdown type="metadata" articleId={article.id.toString()} />
        <InteractiveDropdown type="share" />
      </div>
      
      <div className="articleDetailsSidebar-publicationDetails">
        <div className="articleDetailsSidebar-publicationDetails-title" onClick={() => setIsPublicationDetailsOpen(!isPublicationDetailsOpen)}>
          <div className="articleDetailsSidebar-publicationDetails-title-text">Publication Details</div>
          <img className="articleDetailsSidebar-publicationDetails-title-caret" src={isPublicationDetailsOpen ? caretUpGrey : caretDownGrey} alt="Caret icon" />
        </div>
        <div className={`articleDetailsSidebar-publicationDetails-content ${isPublicationDetailsOpen ? 'articleDetailsSidebar-publicationDetails-content-opened' : ''}`}>
          {article?.submissionDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>Submitted on</div>
              <div>{formatDate(article.submissionDate, 'en')}</div>
            </div>
          )}
          {article?.acceptanceDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>Accepted on</div>
              <div>{formatDate(article.acceptanceDate, 'en')}</div>
            </div>
          )}
          {article?.publicationDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row articleDetailsSidebar-publicationDetails-content-row-publicationDate">
              <div>Published on</div>
              <div className="articleDetailsSidebar-publicationDetails-content-row-publicationDate-value">
                {formatDate(article.publicationDate, 'en')}
              </div>
            </div>
          )}
          {article?.modificationDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>Last modified on</div>
              <div>{formatDate(article.modificationDate, 'en')}</div>
            </div>
          )}
        </div>
      </div>

      <div className="articleDetailsSidebar-volumeDetails">
        {renderRelatedVolume(relatedVolume)}
        {article?.doi && (
          <div className="articleDetailsSidebar-volumeDetails-doi">
            <div>DOI</div>
            <Link href={`https://doi.org/${article.doi}`} className="articleDetailsSidebar-volumeDetails-doi-content" target="_blank" rel="noopener noreferrer">
              {article.doi}
            </Link>
          </div>
        )}
        {renderLicenseContent()}
      </div>

      {article?.fundings && article.fundings.length > 0 && (
        <div className="articleDetailsSidebar-funding">
          <div className="articleDetailsSidebar-funding-title" onClick={() => setIsFundingOpen(!isFundingOpen)}>
            <div className="articleDetailsSidebar-funding-title-text">Funding</div>
            <img className="articleDetailsSidebar-funding-title-caret" src={isFundingOpen ? caretUpGrey : caretDownGrey} alt="Caret icon" />
          </div>
          <div className={`articleDetailsSidebar-funding-content ${isFundingOpen ? 'articleDetailsSidebar-funding-content-opened' : ''}`}>
            {article.fundings.map((fund: any, index: number) => (
              <div key={index} className="articleDetailsSidebar-funding-content-row">
                <div>{fund.funder || fund}</div>
                {fund.award && <div>#{fund.award}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {article?.metrics && (article.metrics.views > 0 || article.metrics.downloads > 0) && (
        <div className="articleDetailsSidebar-metrics">
          <div className="articleDetailsSidebar-metrics-title" onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}>
            <div className="articleDetailsSidebar-metrics-title-text">Indicators</div>
            <img className="articleDetailsSidebar-metrics-title-caret" src={isIndicatorsOpen ? caretUpGrey : caretDownGrey} alt="Caret icon" />
          </div>
          <div className={`articleDetailsSidebar-metrics-data ${isIndicatorsOpen ? 'articleDetailsSidebar-metrics-data-opened' : ''}`}>
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.views}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">Views</div>
            </div>
            <div className="articleDetailsSidebar-metrics-data-divider"></div>
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.downloads}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">Downloads</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}