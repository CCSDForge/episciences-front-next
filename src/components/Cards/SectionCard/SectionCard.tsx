'use client';

import { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import { MathJax } from 'better-react-mathjax';
import './SectionCard.scss';

import { PATHS } from '@/config/paths';
import { ISection } from '@/types/section';
import { AvailableLanguage } from '@/utils/i18n';

interface ISectionCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  section: ISection;
}

export default function SectionCard({ language, t, section }: ISectionCardProps): JSX.Element {
  const [openedDescription, setOpenedDescription] = useState(false);
  const toggleDescription = (): void => setOpenedDescription(!openedDescription);

  return (
    <div className='sectionCard'>
      <div className='sectionCard-title'>
        <Link href={`${PATHS.sections}/${section.id}`}>
          <div className='sectionCard-title-text'>{section.title ? section.title[language] : ''}</div>
        </Link>
        <div className='sectionCard-title-count'>{section.articles.length > 1 ? `${section.articles.length} ${t('common.articles')}`: `${section.articles.length} ${t('common.article')}`}</div>
      </div>
      {section.description && section.description[language] && (
        <div className='sectionCard-description'>
          <div className={`sectionCard-description-title ${!openedDescription && 'sectionCard-description-title-closed'}`} onClick={toggleDescription}>
            <div className='sectionCard-description-title-text'>{t('common.about')}</div>
            <img 
              className='sectionCard-description-title-caret' 
              src={openedDescription ? "/icons/caret-up-red.svg" : "/icons/caret-down-red.svg"} 
              alt={openedDescription ? 'Caret up icon' : 'Caret down icon'} 
            />
          </div>
          <div className={`sectionCard-description-content ${openedDescription && 'sectionCard-description-content-opened'}`}>
            <MathJax dynamic>{section.description[language]}</MathJax>
          </div>
        </div>
      )}
      <div className='sectionCard-countMobile'>{section.articles.length > 1 ? `${section.articles.length} ${t('common.articles')}`: `${section.articles.length} ${t('common.article')}`}</div>
    </div>
  )
} 