import React from 'react';
import Link from 'next/link';
import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { formatDate } from '@/utils/date';
import { VOLUME_TYPE } from '@/utils/volume';
import { PATHS } from '@/config/paths';
import { Translations, t } from '@/utils/server-i18n';
import { getLicenseLabelInfo } from '@/utils/article';
import { ExternalLinkBlackIcon, DownloadBlackIcon } from '@/components/icons';
import InteractiveDropdown from './InteractiveDropdown';
import SidebarCollapsibleWrapper from './SidebarCollapsibleWrapper';

import '@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar.scss';

interface ArticleDetailsSidebarServerProps {
  article: IArticle;
  relatedVolume?: IVolume | null;
  metadataCSL?: string | null;
  metadataBibTeX?: string | null;
  metrics?: React.JSX.Element;
  translations: Translations;
  language?: string;
}

export default function ArticleDetailsSidebarServer({
  article,
  relatedVolume,
  metadataCSL,
  metadataBibTeX,
  metrics,
  translations,
  language = 'en',
}: ArticleDetailsSidebarServerProps): React.JSX.Element {
  /**
   * Get localized path for server-side rendering
   */
  const getLocalizedPath = (path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // Add language prefix
    return `/${language}/${cleanPath}`;
  };

  /**
   * Get multilingual title with language fallback for server-side rendering
   * Priority: current language > english > first available language
   */
  const getMultilingualTitle = (titles: Record<string, string> | undefined): string => {
    if (!titles || typeof titles !== 'object') return '';

    // Try current language
    if (language && titles[language]) {
      return titles[language];
    }

    // Fallback to English
    if (titles['en']) {
      return titles['en'];
    }

    // Fallback to first available language
    const availableLanguages = Object.keys(titles);
    if (availableLanguages.length > 0) {
      return titles[availableLanguages[0]];
    }

    return '';
  };

  const renderRelatedVolume = (relatedVolume?: IVolume | null): React.JSX.Element | null => {
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

    const volumeTitle = getMultilingualTitle(relatedVolume.title);

    return (
      <>
        <Link
          href={getLocalizedPath(`${PATHS.volumes}/${relatedVolume.id}`)}
          className="articleDetailsSidebar-volumeDetails-number"
        >
          {text} {relatedVolume.num}
        </Link>
        {volumeTitle && (
          <div className="articleDetailsSidebar-volumeDetails-title">{volumeTitle}</div>
        )}
      </>
    );
  };

  const renderRelatedSection = (): React.JSX.Element | null => {
    if (!article?.section) return null;

    const sectionTitle = getMultilingualTitle(article.section.title);

    if (!sectionTitle) return null;

    return (
      <Link
        href={getLocalizedPath(`sections/${article.section.id}`)}
        className="articleDetailsSidebar-volumeDetails-section"
      >
        {sectionTitle}
      </Link>
    );
  };

  const renderLicenseContent = (): React.JSX.Element | null => {
    if (!article?.license) return null;

    const info = getLicenseLabelInfo(article.license);
    let label = article.license;
    if (info) {
      let obj: any = translations;
      for (const k of info.parent.split('.')) {
        obj = obj?.[k];
      }
      if (obj && info.key in obj) {
        label = obj[info.key];
      }
    }
    const isLink = article.license.startsWith('http');

    return (
      <div className="articleDetailsSidebar-license">
        <div className="articleDetailsSidebar-license-label">
          {t('pages.articleDetails.license', translations)}
        </div>
        {isLink ? (
          <a
            href={article.license}
            className="articleDetailsSidebar-license-content articleDetailsSidebar-license-content-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        ) : (
          <div className="articleDetailsSidebar-license-content">{label}</div>
        )}
      </div>
    );
  };

  const renderPublicationDetails = (): React.JSX.Element => {
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

  const renderFunding = (): React.JSX.Element | null => {
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

  const renderMetrics = (): React.JSX.Element | null => {
    if (!article?.metrics || (article.metrics.views === 0 && article.metrics.downloads === 0)) {
      return null;
    }

    return (
      <div className="articleDetailsSidebar-metrics">
        <div className="articleDetailsSidebar-metrics-title">
          {t('pages.articleDetails.metrics.title', translations)}
        </div>
        <div className="articleDetailsSidebar-metrics-data">
          <div className="articleDetailsSidebar-metrics-data-item">
            <div className="articleDetailsSidebar-metrics-data-item-number">
              {article.metrics.views}
            </div>
            <div className="articleDetailsSidebar-metrics-data-item-label">
              {t('pages.articleDetails.metrics.views', translations)}
            </div>
          </div>
          <div className="articleDetailsSidebar-metrics-data-divider"></div>
          <div className="articleDetailsSidebar-metrics-data-item">
            <div className="articleDetailsSidebar-metrics-data-item-number">
              {article.metrics.downloads}
            </div>
            <div className="articleDetailsSidebar-metrics-data-item-label">
              {t('pages.articleDetails.metrics.downloads', translations)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="articleDetailsSidebar">
      <div className="articleDetailsSidebar-links">
        {article?.pdfLink && (
          <a
            href={getLocalizedPath(`${PATHS.articles}/${article.id}/download`)}
          >
            <div className="articleDetailsSidebar-links-link">
              <DownloadBlackIcon
                size={14}
                className="articleDetailsSidebar-links-link-icon"
                ariaLabel="Download"
              />
              <div className="articleDetailsSidebar-links-link-text">
                {t('pages.articleDetails.actions.download', translations)}
              </div>
            </div>
          </a>
        )}
        {article?.docLink && (
          <a
            href={article.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="articleDetailsSidebar-links-link"
          >
            <ExternalLinkBlackIcon
              size={14}
              className="articleDetailsSidebar-links-link-icon"
              ariaLabel="External link"
            />
            <div className="articleDetailsSidebar-links-link-text">
              {t('pages.articleDetails.actions.openOn', translations, {
                repositoryName: article.repositoryName,
              })}{' '}
              {article.repositoryName}
            </div>
          </a>
        )}

        <InteractiveDropdown
          type="cite"
          metadataCSL={metadataCSL}
          metadataBibTeX={metadataBibTeX}
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
        {renderRelatedSection()}
      </div>

      {article?.doi && article.doi.trim() !== '' && (
        <div className="articleDetailsSidebar-doi">
          <div className="articleDetailsSidebar-doi-label">{t('common.doi', translations)}</div>
          <a
            href={`https://doi.org/${article.doi}`}
            className="articleDetailsSidebar-doi-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {article.doi}
          </a>
        </div>
      )}

      {renderLicenseContent()}

      {renderFunding()}
      {renderMetrics()}
    </div>
  );
}
