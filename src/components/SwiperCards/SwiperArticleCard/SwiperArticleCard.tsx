'use client';

import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import { MathJax } from 'better-react-mathjax';

import { PATHS } from '@/config/paths';
import { FetchedArticle, truncatedArticleAuthorsName } from '@/utils/article';
import { articleTypes } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import './SwiperArticleCard.scss';

export type SwiperArticleCardProps = FetchedArticle;

interface ISwiperArticleCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  article: FetchedArticle;
}

export default function SwiperArticleCard({ language, t, article }: ISwiperArticleCardProps): JSX.Element {
  if (!article) {
    return <></>;
  }

  return (
    <div className='swiperArticleCard'>
      {article?.tag && <div className='swiperArticleCard-tag'>{t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}</div>}
      <Link href={`${PATHS.articles}/${article?.id}`} lang={language}>
        <div className='swiperArticleCard-title'>
          <MathJax dynamic>{article?.title}</MathJax>
        </div>
      </Link>
      <div className='swiperArticleCard-authors'>{truncatedArticleAuthorsName(article)}</div>
      <div className='swiperArticleCard-publicationDate'>{`${t('common.publishedOn')} ${formatDate(article?.publicationDate!, language, { month: 'short' })}`}</div>
    </div>
  );
} 