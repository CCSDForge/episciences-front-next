import React from 'react';
import { Link } from '@/components/Link/Link';
import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { ICitation } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { VOLUME_TYPE } from '@/utils/volume';
import { PATHS } from '@/config/paths';
import { Translations, t } from '@/utils/server-i18n';
import { supportsInlinePreview } from '@/utils/pdf-preview';
import InteractiveDropdown from './InteractiveDropdown';
import SidebarCollapsibleWrapper from './SidebarCollapsibleWrapper';

// Import icon paths
const externalLink = '/icons/external-link-black.svg';
const download = '/icons/download-black.svg';

import '@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar.scss';

interface ArticleDetailsSidebarServerProps {
  article: IArticle;
  relatedVolume?: IVolume | null;
  citations: ICitation[];
  metrics?: JSX.Element;
  translations: Translations;
}

export default function ArticleDetailsSidebarServer({
  article,
  relatedVolume,
  citations,
  metrics,
  translations
}: ArticleDetailsSidebarServerProps): JSX.Element {

  const renderRelatedVolume = (relatedVolume?: IVolume | null): JSX.Element | null => {
    if (!relatedVolume) return null;

    let text = '';

    if (relatedVolume?.types && relatedVolume.types.length > 0) {
      if (relatedVolume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        text += t('common.volumeCard.proceeding', translations);
      }

      if (relatedVolume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        text += t('common.volumeCard.specialIssue', translations);
      }
    } else {
      text += t('common.volumeCard.volume', translations);
    }

    return (
      <Link href={`/${PATHS.volumes}/${relatedVolume.id}`} className="articleDetailsSidebar-volumeDetails-number">
        {text} {relatedVolume.num}
      </Link>
    );
  };

  const renderLicenseContent = (): JSX.Element | null => {
    if (!article?.license) return null;

    return (
      <div className="articleDetailsSidebar-volumeDetails-license">
        <div>{t('pages.articleDetails.license', translations)}</div>
        <div className="articleDetailsSidebar-volumeDetails-license-content">{article.license}</div>
      </div>
    );
  };

  const renderPublicationDetails = (): JSX.Element => {
    return (
      <>
        {article?.submissionDate && (
          <div className="articleDetailsSidebar-publicationDetails-content-row">
            <div>{t('pages.articleDetails.publicationDetails.submittedOn', translations)}</div>
            <div>{formatDate(article.submissionDate, 'en')}</div>
          </div>
        )}
        {article?.acceptanceDate && (
          <div className="articleDetailsSidebar-publicationDetails-content-row">
            <div>{t('pages.articleDetails.publicationDetails.acceptedOn', translations)}</div>
            <div>{formatDate(article.acceptanceDate, 'en')}</div>
          </div>
        )}
        {article?.publicationDate && (
          <div className="articleDetailsSidebar-publicationDetails-content-row articleDetailsSidebar-publicationDetails-content-row-publicationDate">
            <div>{t('pages.articleDetails.publicationDetails.publishedOn', translations)}</div>
            <div className="articleDetailsSidebar-publicationDetails-content-row-publicationDate-value">
              {formatDate(article.publicationDate, 'en')}
            </div>
          </div>
        )}
        {article?.modificationDate && (
          <div className="articleDetailsSidebar-publicationDetails-content-row">
            <div>{t('pages.articleDetails.publicationDetails.lastModifiedOn', translations)}</div>
            <div>{formatDate(article.modificationDate, 'en')}</div>
          </div>
        )}
      </>
    );
  };

  const renderFunding = (): JSX.Element | null => {
    if (!article?.fundings || article.fundings.length === 0) {
      return null;
    }

    return (
      <SidebarCollapsibleWrapper
        title={t('pages.articleDetails.funding', translations)}
        initialOpen={true}
        className="articleDetailsSidebar-funding"
      >
        {article.fundings.map((fund: any, index: number) => (
          <div key={index} className="articleDetailsSidebar-funding-content-row">
            <div>{fund.funder || fund}</div>
            {fund.award && <div>#{fund.award}</div>}
          </div>
        ))}
      </SidebarCollapsibleWrapper>
    );
  };

  const renderMetrics = (): JSX.Element | null => {
    if (!article?.metrics || (article.metrics.views === 0 && article.metrics.downloads === 0)) {
      return null;
    }

    return (
      <SidebarCollapsibleWrapper
        title={t('pages.articleDetails.metrics.title', translations)}
        initialOpen={true}
        className="articleDetailsSidebar-metrics"
      >
        <div className="articleDetailsSidebar-metrics-data">
          <div className="articleDetailsSidebar-metrics-data-item">
            <div className="articleDetailsSidebar-metrics-data-item-number">{article.metrics.views}</div>
            <div className="articleDetailsSidebar-metrics-data-item-label">
              {t('pages.articleDetails.metrics.views', translations)}
            </div>
          </div>
          <div className="articleDetailsSidebar-metrics-data-divider"></div>
          <div className="articleDetailsSidebar-metrics-data-item">
            <div className="articleDetailsSidebar-metrics-data-item-number">{article.metrics.downloads}</div>
            <div className="articleDetailsSidebar-metrics-data-item-label">
              {t('pages.articleDetails.metrics.downloads', translations)}
            </div>
          </div>
        </div>
      </SidebarCollapsibleWrapper>
    );
  };

  return (
    <div className="articleDetailsSidebar">
      <div className="articleDetailsSidebar-links">
        {article?.pdfLink && (
          <>
            {supportsInlinePreview(article.pdfLink) ? (
              <Link href={`/${PATHS.articles}/${article.id}/download`} target="_blank">
                <div className="articleDetailsSidebar-links-link">
                  <img className="articleDetailsSidebar-links-link-icon" src={download} alt="Download icon" />
                  <div className="articleDetailsSidebar-links-link-text">
                    {t('pages.articleDetails.actions.download', translations)}
                  </div>
                </div>
              </Link>
            ) : (
              <a href={article.pdfLink} target="_blank" rel="noopener noreferrer" download>
                <div className="articleDetailsSidebar-links-link">
                  <img className="articleDetailsSidebar-links-link-icon" src={download} alt="Download icon" />
                  <div className="articleDetailsSidebar-links-link-text">
                    {t('pages.articleDetails.actions.download', translations)}
                  </div>
                </div>
              </a>
            )}
          </>
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
              {t('pages.articleDetails.actions.openOn', translations, { repositoryName: article.repositoryName })} {article.repositoryName}
            </div>
          </a>
        )}

        <InteractiveDropdown
          type="cite"
          citations={citations}
          articleId={article.id.toString()}
          label={t('pages.articleDetails.actions.cite', translations)}
        />
        <InteractiveDropdown
          type="metadata"
          articleId={article.id.toString()}
          label={t('pages.articleDetails.actions.metadata', translations)}
        />
        <InteractiveDropdown
          type="share"
          label={t('pages.articleDetails.actions.share.text', translations)}
        />
      </div>

      <SidebarCollapsibleWrapper
        title={t('pages.articleDetails.publicationDetails.title', translations)}
        initialOpen={true}
        className="articleDetailsSidebar-publicationDetails"
      >
        {renderPublicationDetails()}
      </SidebarCollapsibleWrapper>

      <div className="articleDetailsSidebar-volumeDetails">
        {renderRelatedVolume(relatedVolume)}
        {renderLicenseContent()}
      </div>

      {article?.doi && article.doi.trim() !== '' && (
        <div className="articleDetailsSidebar-doi">
          <div className="articleDetailsSidebar-doi-label">{t('common.doi', translations)}</div>
          <Link href={`https://doi.org/${article.doi}`} className="articleDetailsSidebar-doi-link" target="_blank" rel="noopener noreferrer">
            {article.doi}
          </Link>
        </div>
      )}

      {renderFunding()}
      {renderMetrics()}
    </div>
  );
}