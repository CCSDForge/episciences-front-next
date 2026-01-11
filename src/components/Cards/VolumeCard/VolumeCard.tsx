'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import {
  FileGreyIcon,
  DownloadBlackIcon,
  CaretUpBlackIcon,
  CaretDownBlackIcon,
} from '@/components/icons';
import { VOLUME_COVER_BLUR } from '@/utils/image-placeholders';
import './VolumeCard.scss';

import { PATHS } from '@/config/paths';
import { IJournal } from '@/types/journal';
import { IVolume } from '@/types/volume';
import { RENDERING_MODE } from '@/utils/card';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';

interface IVolumeCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  mode: RENDERING_MODE;
  volume: IVolume;
  currentJournal?: IJournal;
  journalCode?: string;
}

export default function VolumeCard({
  language,
  t,
  mode,
  volume,
  currentJournal,
  journalCode,
}: IVolumeCardProps): React.JSX.Element {
  const [openedDescription, setOpenedDescription] = useState(false);

  // Construire le chemin vers la page de détail du volume
  const volumeDetailPath = `/${PATHS.volumes}/${volume.id}`.replace(/\/\/+/g, '/');

  const displayJournalCode = (journalCode || currentJournal?.code || '').toUpperCase();

  const toggleDescription = (): void => setOpenedDescription(!openedDescription);

  const renderVolumeTileNum = (): React.JSX.Element => {
    let text = '';

    if (volume.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        text += `${t('common.volumeCard.proceeding')}`;
      } else if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        text += `${t('common.volumeCard.specialIssue')}`;
      }
    } else {
      text += `${t('common.volumeCard.volume')}`;
    }

    return (
      <Link
        href={volumeDetailPath}
        prefetch={false}
        lang={language}
        className="volumeCard-tile-text-volume"
      >
        {`${text} ${volume.num}`}
      </Link>
    );
  };

  const renderVolumeListNum = (isMobile: boolean): React.JSX.Element | null => {
    let text = '';

    if (volume.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        text += `${t('common.volumeCard.proceeding')}`;
      } else if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        text += `${t('common.volumeCard.specialIssue')}`;
      }
    } else {
      text += `${t('common.volumeCard.volume')}`;
    }

    return (
      <Link
        href={volumeDetailPath}
        prefetch={false}
        lang={language}
        className={`volumeCard-content-num ${isMobile && 'volumeCard-content-num-mobile'}`}
      >
        {`${text} ${volume.num}`}
      </Link>
    );
  };

  if (mode === RENDERING_MODE.TILE) {
    return (
      <div className="volumeCard volumeCard-tile">
        {volume.tileImageURL ? (
          <Link href={volumeDetailPath} prefetch={false} lang={language}>
            <Image
              className="volumeCard-tile-img"
              src={volume.tileImageURL}
              alt={`${t('common.volumeCard.volume')} ${volume.num} cover`}
              width={300}
              height={400}
              placeholder="blur"
              blurDataURL={VOLUME_COVER_BLUR}
              sizes="(max-width: 768px) 100vw, 300px"
            />
          </Link>
        ) : (
          <Link
            href={volumeDetailPath}
            prefetch={false}
            lang={language}
            className="volumeCard-tile-template"
          >
            <div className="volumeCard-tile-template-jpe">{displayJournalCode}</div>
            <div className="volumeCard-tile-template-volume">{t('common.volumeCard.volume')}</div>
            {volume.types && volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE) && (
              <div className="volumeCard-tile-template-issue">
                {t('common.volumeCard.specialIssue')}
              </div>
            )}
            <div className="volumeCard-tile-template-number">{volume.num}</div>
            <div className="volumeCard-tile-template-year">{volume.year}</div>
          </Link>
        )}
        <div className="volumeCard-tile-text">
          {renderVolumeTileNum()}
          <Link
            href={volumeDetailPath}
            prefetch={false}
            lang={language}
            className="volumeCard-tile-text-title"
          >
            {volume.title ? volume.title[language] : ''}
          </Link>
          <div className="volumeCard-tile-text-year">{volume.year}</div>
          <div className="volumeCard-tile-text-count">
            <FileGreyIcon
              size={16}
              className="volumeCard-tile-text-count-icon"
              ariaLabel="Articles"
            />
            <div className="volumeCard-tile-text-count-text">
              {volume.articles.length > 1
                ? `${volume.articles.length} ${t('common.articles')}`
                : `${volume.articles.length} ${t('common.article')}`}
            </div>
          </div>
          {volume.downloadLink && (
            <Link
              href={volume.downloadLink}
              target="_blank"
              lang={language}
              className="volumeCard-tile-text-download"
            >
              <DownloadBlackIcon
                size={16}
                className="volumeCard-tile-text-download-icon"
                ariaLabel="Download PDF"
              />
              <div className="volumeCard-tile-text-download-text">{t('common.pdf')}</div>
            </Link>
          )}
        </div>
      </div>
    );
  }

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
              onClick={toggleDescription}
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
