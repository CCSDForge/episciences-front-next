'use client';

import { Fragment, useState, useEffect } from 'react';
import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';
import { isMobileOnly, isTablet } from 'react-device-detect';

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderedNews = (): INews[] => {
    if (!isMounted) {
      return news;
    }

    if (isMobileOnly) {
      return news.slice(0, 1);
    }

    if (isTablet) {
      return news.slice(0, 2);
    }

    return news;
  };

  return (
    <div className="newsSection">
      {renderedNews().map((singleNews, index) => (
        <Fragment key={index}>
          <div className="newsSection-row">
            <div className="newsSection-row-title">
              <Link href={`${PATHS.news}#${singleNews.id}`}>{singleNews.title[language]}</Link>
            </div>
            <div className="newsSection-row-publicationDate">{`${t('common.publishedOn')} ${formatDate(singleNews.publicationDate, language, { month: 'short' })}`}</div>
          </div>
          <div className={`${index !== renderedNews().length - 1 && 'newsSection-divider'}`}></div>
        </Fragment>
      ))}
    </div>
  );
}
