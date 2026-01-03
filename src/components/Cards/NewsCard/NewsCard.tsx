'use client';

import { MouseEvent, useState } from 'react';
import { Link } from '@/components/Link/Link';
import ReactMarkdown from 'react-markdown';
import { TFunction } from 'i18next';
import './NewsCard.scss';

import externalLink from '../../../../public/icons/external-link-red.svg';
import { INews } from "@/types/news";
import { formatDate } from '@/utils/date';
import { RENDERING_MODE } from '@/utils/card';
import { AvailableLanguage } from '@/utils/i18n';
import { generateIdFromText } from '@/utils/markdown';

const MAX_CONTENT_LENGTH = 400;

interface INewsCardTile {
  fullCard: boolean;
  blurCard: boolean;
  setFullNewsIndexCallback: () => void;
}

interface INewsCardProps extends INewsCardTile {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  mode: RENDERING_MODE;
  news: INews;
}

export default function NewsCard({ language, t, mode, fullCard, blurCard, setFullNewsIndexCallback, news }: INewsCardProps): JSX.Element {
  const [showFullContent, setShowFullContent] = useState(false);

  const toggleFullContent = (e: MouseEvent): void => {
    e.stopPropagation();
    setShowFullContent(!showFullContent);
  }

  const renderContent = (): JSX.Element | null => {
    if (!news.content || !news.content[language]) return null;
    
    if (news.content[language].length <= MAX_CONTENT_LENGTH) {
      return (
        <ReactMarkdown>{news.content[language]}</ReactMarkdown>
      );
    }

    return (
      <div className="newsCard-content-content">
        {showFullContent ? (
          <ReactMarkdown>{news.content[language]}</ReactMarkdown>
        ) : (
          <ReactMarkdown>{`${news.content[language].substring(0, MAX_CONTENT_LENGTH)}...`}</ReactMarkdown>
        )}
        <div 
          onClick={(e): void => toggleFullContent(e)} 
          className="newsCard-content-content-toggle"
        >
          {showFullContent ? t('common.readLess') : t('common.readMore')}
        </div>
      </div>
    );
  }

  const cardId = (): string => generateIdFromText(news.id.toString());

  if (mode === RENDERING_MODE.TILE) {
    if (fullCard) {
      return (
        <div 
          id={cardId()} 
          className="newsCard newsCard-tile newsCard-tile-full" 
          onClick={setFullNewsIndexCallback}
        >
          <div className="newsCard-tile-full-initial">
            <div className="newsCard-content newsCard-content-tile-full">
              <div className="newsCard-content-title newsCard-content-title-tile">
                {news.title[language]}
              </div>
              <div className="newsCard-tile-anchor">
                <div className="newsCard-publicationDate newsCard-publicationDate-tile">
                  {formatDate(news.publicationDate, language)}
                </div>
              </div>
            </div>
          </div>
          <div className="newsCard-tile-full-expanded">
            {renderContent()}
            {news.link && (
              <div className="newsCard-content-read newsCard-content-read-full">
                <Link
                  href={news.link}
                  lang={language}
                  target="_blank"
                  prefetch={false}
                  onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                >
                  <img
                    src={externalLink}
                    alt="External link icon"
                  />
                  <div className="newsCard-content-read-text">
                    {t('common.read')}
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        id={cardId()}
        className={blurCard ? 'newsCard newsCard-tile newsCard-tile-blur' : 'newsCard newsCard-tile'}
        onClick={setFullNewsIndexCallback}
      >
        <div className="newsCard-content newsCard-content-tile">
          <div className="newsCard-content-title newsCard-content-title-tile">
            {news.title[language]}
          </div>
          <div className="newsCard-tile-anchor">
            <div className="newsCard-publicationDate newsCard-publicationDate-tile">
              {formatDate(news.publicationDate, language)}
            </div>
                        {news.link && (
                          <div className="newsCard-content-read">
                            <Link
                              href={news.link}
                              lang={language}
                              target="_blank"
                              prefetch={false}
                              onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                            >
                              <img 
                                src={externalLink} 
                                alt="External link icon" 
                              />
                              <div className="newsCard-content-read-text">
                                {t('common.read')}
                              </div>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            
              return (
                <div id={cardId()} className="newsCard">
                  <div className="newsCard-publicationDate">
                    {formatDate(news.publicationDate, language)}
                  </div>
                  <div className="newsCard-content">
                    <div className="newsCard-content-title">
                      {news.title[language]}
                    </div>
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
                          <img 
                            src={externalLink} 
                            alt="External link icon" 
                          />
                          <div className="newsCard-content-read-text">
                            {t('common.read')}
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
             