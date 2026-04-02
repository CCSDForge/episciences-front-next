'use client';

import { memo, useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { CaretUpBlackIcon, CaretDownBlackIcon, DownloadBlackIcon } from '@/components/icons';
import './VolumeArticleCard.scss';

import { PATHS } from '@/config/paths';
import { IArticle } from '@/types/article';
import { getArticleTypeLabel, getAbstractText } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { handleKeyboardClick } from '@/utils/keyboard';

interface IVolumeArticleCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  article: IArticle;
}

function VolumeArticleCard({
  language,
  t,
  article,
}: IVolumeArticleCardProps): React.JSX.Element {
  const [openedAbstract, setOpenedAbstract] = useState(false);

  const articlePath = `/${PATHS.articles}/${article.id}`.replace(/\/\/+/g, '/');

  const toggleAbstract = (): void => setOpenedAbstract(prev => !prev);

  return (
    <div className="volumeArticleCard">
      {article.tag && (
        <div className="volumeArticleCard-tag">
          {t(getArticleTypeLabel(article.tag))}
        </div>
      )}
      <Link
        href={articlePath}
        lang={language}
        className="volumeArticleCard-title"
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
      >
        <MathJax dynamic>{article.title}</MathJax>
      </Link>
      <div className="volumeArticleCard-authors">
        {article.authors.map(author => author.fullname).join(', ')}
      </div>
      {article.abstract && (
        <div className="volumeArticleCard-abstract">
          <div
            className={`volumeArticleCard-abstract-title ${!openedAbstract && 'volumeArticleCard-abstract-title-closed'}`}
            role="button"
            tabIndex={0}
            onClick={toggleAbstract}
            onKeyDown={e => handleKeyboardClick(e, toggleAbstract)}
            aria-expanded={openedAbstract}
          >
            <div className="volumeArticleCard-abstract-title-text">{t('common.abstract')}</div>
            {openedAbstract ? (
              <CaretUpBlackIcon
                size={14}
                className="volumeArticleCard-abstract-title-caret"
                ariaLabel="Collapse abstract"
              />
            ) : (
              <CaretDownBlackIcon
                size={14}
                className="volumeArticleCard-abstract-title-caret"
                ariaLabel="Expand abstract"
              />
            )}
          </div>
          <div
            className={`volumeArticleCard-abstract-content ${openedAbstract && 'volumeArticleCard-abstract-content-opened'}`}
          >
            <MathJax dynamic>{getAbstractText(article.abstract, language)}</MathJax>
          </div>
        </div>
      )}
      <div className="volumeArticleCard-anchor">
        <div className="volumeArticleCard-anchor-publicationDate">
          {`${t('common.publishedOn')} ${formatDate(article?.publicationDate!, language)}`}
        </div>
        <div className="volumeArticleCard-anchor-icons">
          {article.pdfLink && (
            <a href={`/${language}/${PATHS.articles}/${article.id}/download`}>
              <div className="volumeArticleCard-anchor-icons-download">
                <DownloadBlackIcon
                  size={16}
                  className="volumeArticleCard-anchor-icons-download-icon"
                  ariaLabel="Download PDF"
                />
                <div className="volumeArticleCard-anchor-icons-download-text">
                  {t('common.pdf')}
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(VolumeArticleCard);
