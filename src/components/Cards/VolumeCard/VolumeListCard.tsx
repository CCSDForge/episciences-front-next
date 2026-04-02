'use client';

import React, { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { FileGreyIcon, DownloadBlackIcon, CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import './VolumeCard.scss';

import { PATHS } from '@/config/paths';
import { IVolume } from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import { handleKeyboardClick } from '@/utils/keyboard';

interface IVolumeListCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  volume: IVolume;
}

function VolumeListCard({ language, t, volume }: IVolumeListCardProps): React.JSX.Element {
  const [openedDescription, setOpenedDescription] = useState(false);

  const volumeDetailPath = `/${PATHS.volumes}/${volume.id}`.replace(/\/\/+/g, '/');

  const toggleDescription = (): void => setOpenedDescription(prev => !prev);

  const formatVolumeNum = (): string => {
    if (volume.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return `${t('common.volumeCard.proceeding')} ${volume.num}`;
      }
      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return `${t('common.volumeCard.specialIssue')} ${volume.num}`;
      }
    }
    return `${t('common.volumeCard.volume')} ${volume.num}`;
  };

  const renderVolumeListNum = (isMobile: boolean): React.JSX.Element => (
    <Link
      href={volumeDetailPath}
      prefetch={false}
      lang={language}
      className={`volumeCard-content-num${isMobile ? ' volumeCard-content-num-mobile' : ''}`}
    >
      {formatVolumeNum()}
    </Link>
  );

  return (
    <div className="volumeCard">
      <div className="volumeCard-resume">
        {volume.year && <div className="volumeCard-resume-year">{volume.year}</div>}
        {renderVolumeListNum(true)}
        <div className="volumeCard-resume-count">
          <FileGreyIcon size={16} className="volumeCard-resume-count-icon" ariaLabel="Articles" />
          <span className="volumeCard-resume-count-text">
            {volume.articles.length > 1
              ? `${volume.articles.length} ${t('common.articles')}`
              : `${volume.articles.length} ${t('common.article')}`}
          </span>
        </div>
      </div>
      <div className="volumeCard-content">
        {renderVolumeListNum(false)}
        <Link
          href={volumeDetailPath}
          prefetch={false}
          lang={language}
          className="volumeCard-content-title"
        >
          {volume.title ? volume.title[language] : ''}
        </Link>
        {volume.committee && volume.committee.length > 0 && (
          <div className="volumeCard-content-committee">
            {volume.committee.map(member => member.screenName).join(', ')}
          </div>
        )}
        {volume.description && volume.description[language] && (
          <div className="volumeCard-content-description">
            <div
              className={`volumeCard-content-description-title ${!openedDescription && 'volumeCard-content-description-title-closed'}`}
              role="button"
              tabIndex={0}
              onClick={toggleDescription}
              onKeyDown={e => handleKeyboardClick(e, toggleDescription)}
              aria-expanded={openedDescription}
            >
              <div className="volumeCard-content-description-title-text">{t('common.about')}</div>
              {openedDescription ? (
                <CaretUpBlackIcon
                  size={14}
                  className="volumeCard-content-description-title-caret"
                  ariaLabel="Collapse description"
                />
              ) : (
                <CaretDownBlackIcon
                  size={14}
                  className="volumeCard-content-description-title-caret"
                  ariaLabel="Expand description"
                />
              )}
            </div>
            <div
              className={`volumeCard-content-description-content ${openedDescription && 'volumeCard-content-description-content-opened'}`}
            >
              <MathJax dynamic>{volume.description[language]}</MathJax>
            </div>
          </div>
        )}
        {volume.downloadLink && (
          <Link
            href={volume.downloadLink}
            target="_blank"
            lang={language}
            className="volumeCard-content-download"
          >
            <DownloadBlackIcon
              size={16}
              className="volumeCard-content-download-icon"
              ariaLabel="Download PDF"
            />
            <div className="volumeCard-content-download-text">{t('common.pdf')}</div>
          </Link>
        )}
      </div>
    </div>
  );
}

export default React.memo(VolumeListCard);
