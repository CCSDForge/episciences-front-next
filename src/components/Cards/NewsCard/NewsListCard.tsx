'use client';

import React, { MouseEvent, useState } from 'react';
import { Link } from '@/components/Link/Link';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';
import { TFunction } from 'i18next';
import { ExternalLinkBlackIcon } from '@/components/icons';
import './NewsCard.scss';

import { INews } from '@/types/news';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { truncate } from '@/utils/string';
import { generateIdFromText } from '@/utils/markdown';
import { handleKeyboardClick } from '@/utils/keyboard';

const MAX_CONTENT_LENGTH = 400;

interface INewsListCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  news: INews;
}

function NewsListCard({ language, t, news }: INewsListCardProps): React.JSX.Element {
  const [showFullContent, setShowFullContent] = useState(false);

  const toggleFullContent = (e: MouseEvent): void => {
    e.stopPropagation();
    setShowFullContent(prev => !prev);
  };

  const renderContent = (): React.JSX.Element | null => {
    if (!news.content || !news.content[language]) return null;

    const content = news.content[language];
    const isTruncated = content.length > MAX_CONTENT_LENGTH;

    return (
      <div className="newsCard-content-content">
        <MarkdownRenderer>
          {showFullContent ? content : truncate(content, MAX_CONTENT_LENGTH)}
        </MarkdownRenderer>
        {isTruncated && (
          <div
            onClick={(e): void => toggleFullContent(e)}
            onKeyDown={e =>
              handleKeyboardClick(e, (evt): void => {
                evt.stopPropagation();
                setShowFullContent(prev => !prev);
              })
            }
            role="button"
            tabIndex={0}
            aria-expanded={showFullContent}
            className="newsCard-content-content-toggle"
          >
            {showFullContent ? t('common.readLess') : t('common.readMore')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id={generateIdFromText(news.id.toString())} className="newsCard">
      <div className="newsCard-publicationDate">{formatDate(news.publicationDate, language)}</div>
      <div className="newsCard-content">
        <div className="newsCard-content-title">{news.title[language]}</div>
        {renderContent()}
        {news.link && (
          <div className="newsCard-content-read">
            <Link
              href={news.link}
              lang={language}
              target="_blank"
              prefetch={false}
              onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
            >
              <ExternalLinkBlackIcon
                size={16}
                className="newsCard-content-read-icon"
                ariaLabel="External link"
              />
              <div className="newsCard-content-read-text">{t('common.read')}</div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(NewsListCard);
