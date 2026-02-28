'use client';

import { memo } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';

import { FetchedArticle, truncatedArticleAuthorsName, getArticleTypeLabel } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import './SwiperArticleAcceptedCard.scss';

export type SwiperArticleAcceptedCardProps = FetchedArticle;

interface ISwiperArticleAcceptedCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  article: FetchedArticle;
}

function SwiperArticleAcceptedCard({
  language,
  t,
  article,
}: ISwiperArticleAcceptedCardProps): React.JSX.Element {
  if (!article) {
    return <></>;
  }

  return (
    <div className="swiperArticleAcceptedCard">
      {article?.tag && (
        <div className="swiperArticleAcceptedCard-tag">
          {t(getArticleTypeLabel(article.tag))}
        </div>
      )}
      {article?.docLink && (
        <Link href={article?.docLink} target="_blank" lang={language}>
          <div className="swiperArticleAcceptedCard-title">
            <MathJax dynamic>{article?.title}</MathJax>
          </div>
        </Link>
      )}
      <div className="swiperArticleAcceptedCard-authors">
        {truncatedArticleAuthorsName(article)}
      </div>
      {article?.acceptanceDate ? (
        <div className="swiperArticleAcceptedCard-acceptanceDate">{`${t('common.acceptedOn')} ${formatDate(article?.acceptanceDate, language, { month: 'short' })}`}</div>
      ) : (
        <div className="swiperArticleAcceptedCard-acceptanceDate"></div>
      )}
    </div>
  );
}

export default memo(SwiperArticleAcceptedCard);
