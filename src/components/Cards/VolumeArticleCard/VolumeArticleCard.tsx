'use client';

import { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { useRouter } from 'next/navigation';
import { TFunction } from 'i18next';
import { MathJax } from 'better-react-mathjax';
import './VolumeArticleCard.scss';

import { PATHS } from '@/config/paths';
import { IArticle } from '@/types/article';
import { articleTypes, getAbstractText } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';

interface IVolumeArticleCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  article: IArticle;
}

export default function VolumeArticleCard({ language, t, article }: IVolumeArticleCardProps): JSX.Element {
  const router = useRouter();
  const [openedAbstract, setOpenedAbstract] = useState(false);

  const navigateToArticle = () => {
    const path = `${PATHS.articles}/${article.id}`.replace(/^\//, '');
    router.push(`/${path}`);
  };

  const toggleAbstract = (): void => setOpenedAbstract(!openedAbstract);

  return (
    <div className="volumeArticleCard">
      {article.tag && <div className="volumeArticleCard-tag">{t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}</div>}
      <div className="volumeArticleCard-title" onClick={navigateToArticle} style={{ cursor: 'pointer' }}>
        <MathJax dynamic>{article.title}</MathJax>
      </div>
      <div className="volumeArticleCard-authors">{article.authors.map(author => author.fullname).join(', ')}</div>
      {article.abstract && (
        <div className="volumeArticleCard-abstract">
          <div 
            className={`volumeArticleCard-abstract-title ${!openedAbstract && 'volumeArticleCard-abstract-title-closed'}`} 
            onClick={toggleAbstract}
          >
            <div className="volumeArticleCard-abstract-title-text">{t('common.abstract')}</div>
            <img 
              className="volumeArticleCard-abstract-title-caret" 
              src={openedAbstract ? "/icons/caret-up-red.svg" : "/icons/caret-down-red.svg"} 
              alt={openedAbstract ? 'Caret up icon' : 'Caret down icon'} 
            />
          </div>
          <div className={`volumeArticleCard-abstract-content ${openedAbstract && 'volumeArticleCard-abstract-content-opened'}`}>
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
            <Link href={`${PATHS.articles}/${article.id}/download`} target="_blank" rel="noopener noreferrer">
              <div className="volumeArticleCard-anchor-icons-download">
                <img
                  className="volumeArticleCard-anchor-icons-download-icon"
                  src="/icons/download-red.svg"
                  alt="Download icon"
                />
                <div className="volumeArticleCard-anchor-icons-download-text">{t('common.pdf')}</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
} 