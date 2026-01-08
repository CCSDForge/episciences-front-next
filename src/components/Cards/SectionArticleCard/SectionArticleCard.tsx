'use client';

import { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { CaretUpRedIcon, CaretDownRedIcon, DownloadRedIcon } from '@/components/icons';
import './SectionArticleCard.scss';

import { PATHS } from '@/config/paths';
import { IArticle } from '@/types/article';
import { articleTypes, getAbstractText } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';

interface ISectionArticleCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  article: IArticle;
}

export default function SectionArticleCard({
  language,
  t,
  article,
}: ISectionArticleCardProps): React.JSX.Element {
  const [openedAbstract, setOpenedAbstract] = useState(false);

  const toggleAbstract = (): void => setOpenedAbstract(!openedAbstract);

  return (
    <div className="sectionArticleCard">
      {article.tag && (
        <div className="volumeArticleCard-tag">
          {t(articleTypes.find(tag => tag.value === article.tag)?.labelPath!)}
        </div>
      )}
      <Link href={`${PATHS.articles}/${article.id}`}>
        <div className="sectionArticleCard-title">
          <MathJax dynamic>{article.title}</MathJax>
        </div>
      </Link>
      <div className="sectionArticleCard-authors">
        {article.authors.map(author => author.fullname).join(', ')}
      </div>
      {article.abstract && (
        <div className="sectionArticleCard-abstract">
          <div
            className={`sectionArticleCard-abstract-title ${!openedAbstract && 'sectionArticleCard-abstract-title-closed'}`}
            onClick={toggleAbstract}
          >
            <div className="sectionArticleCard-abstract-title-text">{t('common.abstract')}</div>
            {openedAbstract ? (
              <CaretUpRedIcon
                size={14}
                className="sectionArticleCard-abstract-title-caret"
                ariaLabel="Collapse abstract"
              />
            ) : (
              <CaretDownRedIcon
                size={14}
                className="sectionArticleCard-abstract-title-caret"
                ariaLabel="Expand abstract"
              />
            )}
          </div>
          <div
            className={`sectionArticleCard-abstract-content ${openedAbstract && 'sectionArticleCard-abstract-content-opened'}`}
          >
            <MathJax dynamic>{getAbstractText(article.abstract, language)}</MathJax>
          </div>
        </div>
      )}
      <div className="sectionArticleCard-anchor">
        <div className="sectionArticleCard-anchor-publicationDate">
          {formatDate(article.publicationDate, language)}
        </div>
        <div className="sectionArticleCard-anchor-icons">
          {article.pdfLink && (
            <Link
              href={`${PATHS.articles}/${article.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="sectionArticleCard-anchor-icons-download">
                <DownloadRedIcon
                  size={16}
                  className="sectionArticleCard-anchor-icons-download-icon"
                  ariaLabel="Download PDF"
                />
                <div className="sectionArticleCard-anchor-icons-download-text">
                  {t('common.pdf')}
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
