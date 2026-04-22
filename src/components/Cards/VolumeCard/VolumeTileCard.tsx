'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import { FileGreyIcon, DownloadBlackIcon } from '@/components/icons';
import { VOLUME_COVER_BLUR } from '@/utils/image-placeholders';
import './VolumeCard.scss';

import { PATHS } from '@/config/paths';
import { IJournal } from '@/types/journal';
import { IVolume } from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';

interface IVolumeTileCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  volume: IVolume;
  currentJournal?: IJournal;
  journalCode?: string;
}

function VolumeTileCard({
  language,
  t,
  volume,
  currentJournal,
  journalCode,
}: IVolumeTileCardProps): React.JSX.Element {
  const volumeDetailPath = `/${PATHS.volumes}/${volume.id}`.replace(/\/\/+/g, '/');
  const displayJournalCode = (journalCode || currentJournal?.code || '').toUpperCase();

  const formatVolumeNum = (): string => {
    const num = volume.num != null ? ` ${volume.num}` : '';
    if (volume.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return `${t('common.volumeCard.proceeding')}${num}`;
      }
      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return `${t('common.volumeCard.specialIssue')}${num}`;
      }
    }
    return `${t('common.volumeCard.volume')}${num}`;
  };

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
          <div className="volumeCard-tile-template-code">{displayJournalCode}</div>
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
        <Link
          href={volumeDetailPath}
          prefetch={false}
          lang={language}
          className="volumeCard-tile-text-volume"
        >
          {formatVolumeNum()}
        </Link>
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

export default React.memo(VolumeTileCard);
