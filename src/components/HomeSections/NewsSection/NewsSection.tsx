'use client';

import { Fragment } from 'react';
import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';

import { PATHS } from '@/config/paths';
import { INews } from '@/types/news';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import './NewsSection.scss';

interface INewsSectionProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  news: INews[];
}

export default function NewsSection({ language, t, news }: INewsSectionProps): React.JSX.Element {
  return (
    <div className="newsSection">
      {news.map((singleNews, index) => (
        <Fragment key={singleNews.id}>
          <div className="newsSection-row">
            <div className="newsSection-row-title">
              <Link href={`${PATHS.news}#${singleNews.id}`}>{singleNews.title[language]}</Link>
            </div>
            <div className="newsSection-row-publicationDate">{`${t('common.publishedOn')} ${formatDate(singleNews.publicationDate, language, { month: 'short' })}`}</div>
          </div>
          <div className={`${index !== news.length - 1 && 'newsSection-divider'}`}></div>
        </Fragment>
      ))}
    </div>
  );
}
