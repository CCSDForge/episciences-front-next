'use client';

import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';

import { FetchedArticle, truncatedArticleAuthorsName } from '@/utils/article';
import { articleTypes } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import './SwiperArticleAcceptedCard.scss';

export type SwiperArticleAcceptedCardProps = FetchedArticle;

interface ISwiperArticleAcceptedCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  article: FetchedArticle;
}

export default function SwiperArticleAcceptedCard({ language, t, article }: ISwiperArticleAcceptedCardProps): JSX.Element {
  if (!article) {
    return <></>;
  }
  
  return (
    <div className='swiperArticleAcceptedCard'>
      {article?.tag && <div className='swiperArticleAcceptedCard-tag'>{t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}</div>}
      {article?.docLink && (
        <Link href={article?.docLink} target='_blank' lang={language}>
          <div className='swiperArticleAcceptedCard-title'>
            <MathJax dynamic>{article?.title}</MathJax>
          </div>
        </Link>
      )}
      <div className='swiperArticleAcceptedCard-authors'>{truncatedArticleAuthorsName(article)}</div>
      {article?.acceptanceDate ? (
        <div className='swiperArticleAcceptedCard-acceptanceDate'>{`${t('common.acceptedOn')} ${formatDate(article?.acceptanceDate, language, { month: 'short' })}`}</div>
      ) : (
        <div className='swiperArticleAcceptedCard-acceptanceDate'></div>
      )}
    </div>
  );
} 