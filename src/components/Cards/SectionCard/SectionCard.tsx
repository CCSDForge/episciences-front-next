'use client';

import { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import './SectionCard.scss';

import { PATHS } from '@/config/paths';
import { ISection } from '@/types/section';
import { AvailableLanguage } from '@/utils/i18n';

interface ISectionCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  section: ISection;
}

export default function SectionCard({
  language,
  t,
  section,
}: ISectionCardProps): React.JSX.Element {
  const [openedDescription, setOpenedDescription] = useState(false);
  const toggleDescription = (): void => setOpenedDescription(!openedDescription);

  return (
    <div className="sectionCard">
      <div className="sectionCard-title">
        <Link href={`${PATHS.sections}/${section.id}`} lang={language}>
          <div className="sectionCard-title-text">
            {section.title ? section.title[language] : ''}
          </div>
        </Link>
        <div className="sectionCard-title-count">
          {section.articles.length > 1
            ? `${section.articles.length} ${t('common.articles')}`
            : `${section.articles.length} ${t('common.article')}`}
        </div>
      </div>
      {section.description && section.description[language] && (
        <div className="sectionCard-description">
          <div
            className={`sectionCard-description-title ${!openedDescription && 'sectionCard-description-title-closed'}`}
            
        role="button"
        tabIndex={0}
        
        onClick={toggleDescription}        onKeyDown={(e) => handleKeyboardClick(e, toggleDescription)}>
            <div className="sectionCard-description-title-text">{t('common.about')}</div>
            {openedDescription ? (
              <CaretUpBlackIcon
                size={14}
                className="sectionCard-description-title-caret"
                ariaLabel="Collapse description"
              />
            ) : (
              <CaretDownBlackIcon
                size={14}
                className="sectionCard-description-title-caret"
                ariaLabel="Expand description"
              />
            )}
          </div>
          <div
            className={`sectionCard-description-content ${openedDescription && 'sectionCard-description-content-opened'}`}
          >
            <MathJax dynamic>{section.description[language]}</MathJax>
          </div>
        </div>
      )}
      <div className="sectionCard-countMobile">
        {section.articles.length > 1
          ? `${section.articles.length} ${t('common.articles')}`
          : `${section.articles.length} ${t('common.article')}`}
      </div>
    </div>
  );
}
