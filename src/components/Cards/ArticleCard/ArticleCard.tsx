'use client';

import React from 'react';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { Link } from '@/components/Link/Link';
import {
  CaretUpBlackIcon,
  CaretDownBlackIcon,
  DownloadBlackIcon,
  QuoteBlackIcon,
} from '@/components/icons';
import './ArticleCard.scss';

import { PATHS } from '@/config/paths';
import { IArticle } from '@/types/article';
import { articleTypes, getAbstractText } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { useCitationsDropdown } from '@/hooks/useCitationsDropdown';

export interface IArticleCard extends IArticle {
  openedAbstract: boolean;
}

interface IArticleCardProps {
  language: AvailableLanguage;
  rvcode?: string;
  t: TFunction<'translation', undefined>;
  article: IArticleCard;
  toggleAbstractCallback: () => void;
}

function ArticleCard({
  language,
  rvcode,
  t,
  article,
  toggleAbstractCallback,
}: IArticleCardProps): React.JSX.Element {
  const {
    citations,
    showCitationsDropdown,
    citationsDropdownRef,
    copyCitation,
    handleTriggerMouseEnter,
    handleTriggerClick,
    handleContainerMouseLeave,
  } = useCitationsDropdown(article.id, rvcode, t);

  const getArticlePath = () => {
    return `${PATHS.articles}/${article.id}`;
  };

  return (
    <div className="articleCard">
      {article.tag && (
        <div className="articleCard-tag">
          {t(articleTypes.find(tag => tag.value === article.tag)?.labelPath!)}
        </div>
      )}
      <Link
        href={getArticlePath()}
        lang={language}
        className="articleCard-title"
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
      >
        <MathJax dynamic>{article.title}</MathJax>
      </Link>
      <div className="articleCard-authors">
        {article.authors.map(author => author.fullname).join(', ')}
      </div>
      {article.abstract && (
        <div className="articleCard-abstract">
          <button
            type="button"
            className={`articleCard-abstract-title ${!article.openedAbstract ? 'articleCard-abstract-title-closed' : ''}`}
            onClick={toggleAbstractCallback}
          >
            <div className="articleCard-abstract-title-text">{t('common.abstract')}</div>
            {article.openedAbstract ? (
              <CaretUpBlackIcon
                size={14}
                className="articleCard-abstract-title-caret"
                ariaLabel="Collapse abstract"
              />
            ) : (
              <CaretDownBlackIcon
                size={14}
                className="articleCard-abstract-title-caret"
                ariaLabel="Expand abstract"
              />
            )}
          </button>
          <div
            className={`articleCard-abstract-content ${article.openedAbstract ? 'articleCard-abstract-content-opened' : ''}`}
          >
            <MathJax dynamic>{getAbstractText(article.abstract, language)}</MathJax>
          </div>
        </div>
      )}
      <div className="articleCard-anchor">
        <div className="articleCard-anchor-publicationDate">
          {`${t('common.publishedOn')} ${formatDate(article?.publicationDate!, language)}`}
        </div>
        <div className="articleCard-anchor-icons">
          {article.pdfLink && (
            <a href={`/${language}/${PATHS.articles}/${article.id}/download`}>
              <div className="articleCard-anchor-icons-download">
                <DownloadBlackIcon
                  size={16}
                  className="articleCard-anchor-icons-download-icon"
                  ariaLabel="Download PDF"
                />
                <div className="articleCard-anchor-icons-download-text">{t('common.pdf')}</div>
              </div>
            </a>
          )}
          {article.id && (
            <div
              ref={citationsDropdownRef}
              className="articleCard-anchor-icons-cite"
              onMouseLeave={handleContainerMouseLeave}
            >
              <button
                type="button"
                className="articleCard-anchor-icons-cite-trigger"
                onMouseEnter={handleTriggerMouseEnter}
                onClick={handleTriggerClick}
              >
                <QuoteBlackIcon
                  size={16}
                  className="articleCard-anchor-icons-cite-icon"
                  ariaLabel="Cite article"
                />
                <div className="articleCard-anchor-icons-cite-text">{t('common.cite')}</div>
              </button>
              <div
                className={`articleCard-anchor-icons-cite-content ${showCitationsDropdown ? 'articleCard-anchor-icons-cite-content-displayed' : ''}`}
              >
                <div className="articleCard-anchor-icons-cite-content-links">
                  {citations.length > 0 ? (
                    citations.map(citation => (
                      <button
                        type="button"
                        key={citation.key}
                        onClick={(): void => copyCitation(citation)}
                        onTouchEnd={(): void => copyCitation(citation)}
                      >
                        {citation.key}
                      </button>
                    ))
                  ) : (
                    <span className="articleCard-anchor-icons-cite-loading">
                      {t('common.loading')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export default React.memo(ArticleCard, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.openedAbstract === nextProps.article.openedAbstract &&
    prevProps.language === nextProps.language &&
    prevProps.rvcode === nextProps.rvcode
  );
});
