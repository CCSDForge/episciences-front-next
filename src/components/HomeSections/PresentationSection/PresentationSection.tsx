'use client';

import { Link } from '@/components/Link/Link';
import ReactMarkdown from 'react-markdown';
import { TFunction } from 'i18next';

import caretRight from '/public/icons/caret-right-grey.svg';
import { HOMEPAGE_LAST_INFORMATION_BLOCK } from '@/config/homepage';
import { PATHS } from '@/config/paths';
import { INews } from '@/types/news';
import { IVolume } from '@/types/volume';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import './PresentationSection.scss';

const MAX_ABOUT_CONTENT_LENGTH = 400;
const MAX_NEWS_CONTENT_LENGTH = 200;

interface IPresentationSectionProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  aboutContent?: Record<AvailableLanguage, string>;
  lastInformation?: {
    type: HOMEPAGE_LAST_INFORMATION_BLOCK;
    information?: IVolume | INews }
}

const truncateText = (text: string | undefined | null, maxLength: number): string => {
  if (!text || typeof text !== 'string') return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export default function PresentationSection({ language, t, aboutContent = {}, lastInformation }: IPresentationSectionProps): JSX.Element {
  // Si aucune carte à afficher, ne rien rendre
  const renderNewsContent = (news: INews) => {
    try {
      const date = news.date_creation || news.publicationDate;
      const title = news.title?.[language];
      const content = news.content?.[language];

      if (!date || !title) return null;

      return (
        <div className='presentationSection-new'>
          <div className='presentationSection-new-title'>
            <div className='presentationSection-new-title-date'>
              {formatDate(date, language)}
            </div>
            <div className='presentationSection-new-title-text'>{title}</div>
          </div>
          {content && (
            <div className='presentationSection-new-description'>
              {truncateText(content, MAX_NEWS_CONTENT_LENGTH)}
            </div>
          )}
          <Link href={PATHS.news}>
            <div className='presentationSection-new-seeMore'>
              <div className='presentationSection-new-seeMore-text'>{t('common.seeMore')}</div>
              <img className='presentationSection-new-seeMore-icon' src='/icons/caret-right-grey.svg' alt='Caret right icon' />
            </div>
          </Link>
        </div>
      );
    } catch (error) {
      console.error('Error rendering news content:', error);
      return null;
    }
  };

  const renderVolumeContent = (volume: IVolume) => {
    try {
      const title = volume.title?.[language];
      const description = volume.description?.[language];

      if (!volume.year || !title) return null;

      return (
        <div className='presentationSection-new'>
          <div className='presentationSection-new-title'>
            <div className='presentationSection-new-title-date'>{volume.year}</div>
            <div className='presentationSection-new-title-text'>{title}</div>
          </div>
          {description && (
            <div className='presentationSection-new-description'>
              {truncateText(description, MAX_NEWS_CONTENT_LENGTH)}
            </div>
          )}
          <Link href={lastInformation?.type === HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_VOLUME ? PATHS.volumes : `${PATHS.volumes}?type=${VOLUME_TYPE.SPECIAL_ISSUE}`}>
            <div className='presentationSection-new-seeMore'>
              <div className='presentationSection-new-seeMore-text'>{t('common.seeMore')}</div>
              <img className='presentationSection-new-seeMore-icon' src='/icons/caret-right-grey.svg' alt='Caret right icon' />
            </div>
          </Link>
        </div>
      );
    } catch (error) {
      console.error('Error rendering volume content:', error);
      return null;
    }
  };

  // Débogage du rendu de la section about
  const hasValidAboutContent = aboutContent && typeof aboutContent === 'object' && aboutContent[language];
  
  return (
    <div className='presentationSection'>
      {hasValidAboutContent && (
        <div className='presentationSection-about'>
          <div className='presentationSection-about-content'>
            <ReactMarkdown>{`${aboutContent[language]?.substring(0, MAX_ABOUT_CONTENT_LENGTH) ?? ''}...`}</ReactMarkdown>
          </div>
          <Link href={PATHS.about}>
            <div className='presentationSection-about-seeMore'>
              <div className='presentationSection-about-seeMore-text'>{t('common.seeMore')}</div>
              <img className='presentationSection-about-seeMore-icon' src='/icons/caret-right-grey.svg' alt='Caret right icon' />
            </div>
          </Link>
        </div>
      )}
      {lastInformation && lastInformation.information && (
        <>
          {lastInformation.type === HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS && (
            <div className='presentationSection-new'>
              <div className='presentationSection-new-title'>
                <div className='presentationSection-new-title-date'>
                  {formatDate((lastInformation.information as INews).publicationDate, language)}
                </div>
                <div className='presentationSection-new-title-text'>
                  {(lastInformation.information as INews).title[language]}
                </div>
              </div>
              {(lastInformation.information as INews).content && (
                <div className='presentationSection-new-description'>
                  {`${(lastInformation.information as INews).content![language]?.substring(0, MAX_NEWS_CONTENT_LENGTH) ?? ''}...`}
                </div>
              )}
              <Link href={PATHS.news}>
                <div className='presentationSection-new-seeMore'>
                  <div className='presentationSection-new-seeMore-text'>{t('common.seeMore')}</div>
                  <img className='presentationSection-new-seeMore-icon' src='/icons/caret-right-grey.svg' alt='Caret right icon' />
                </div>
              </Link>
            </div>
          )}
          {(lastInformation.type === HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_VOLUME || 
            lastInformation.type === HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_SPECIAL_ISSUE) && (
            <div className='presentationSection-new'>
              <div className='presentationSection-new-title'>
                <div className='presentationSection-new-title-date'>
                  {(lastInformation.information as IVolume).year}
                </div>
                <div className='presentationSection-new-title-text'>
                  {(lastInformation.information as IVolume).title ? 
                    (lastInformation.information as IVolume).title![language] : ''}
                </div>
              </div>
              {(lastInformation.information as IVolume).description && (
                <div className='presentationSection-new-description'>
                  {`${(lastInformation.information as IVolume).description![language]?.substring(0, MAX_NEWS_CONTENT_LENGTH) ?? ''}...`}
                </div>
              )}
              <Link 
                href={lastInformation.type === HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_VOLUME ? 
                  PATHS.volumes : 
                  `${PATHS.volumes}?type=${VOLUME_TYPE.SPECIAL_ISSUE}`}
              >
                <div className='presentationSection-new-seeMore'>
                  <div className='presentationSection-new-seeMore-text'>{t('common.seeMore')}</div>
                  <img className='presentationSection-new-seeMore-icon' src='/icons/caret-right-grey.svg' alt='Caret right icon' />
                </div>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
} 