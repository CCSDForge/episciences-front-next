'use client';

import { useState } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import { MathJax } from 'better-react-mathjax';
import './VolumeCard.scss';

import { PATHS } from '@/config/paths';
import { IJournal } from '@/types/journal';
import { IVolume } from "@/types/volume";
import { RENDERING_MODE } from '@/utils/card';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';

interface IVolumeCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  mode: RENDERING_MODE;
  volume: IVolume;
  currentJournal?: IJournal;
}

export default function VolumeCard({ language, t, mode, volume, currentJournal }: IVolumeCardProps): JSX.Element {
  const [openedDescription, setOpenedDescription] = useState(false);
  
  // Construire le chemin vers la page de détail du volume
  const volumeDetailPath = `/${PATHS.volumes}/${volume.id}`.replace(/\/\/+/g, '/');

  const toggleDescription = (): void => setOpenedDescription(!openedDescription);

  const renderVolumeTileNum = (): JSX.Element => {
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
      <Link href={volumeDetailPath} prefetch={false} className='volumeCard-tile-text-volume'>
        {`${text} ${volume.num}`}
      </Link>
    );
  };

  const renderVolumeListNum = (isMobile: boolean): JSX.Element | null => {
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
        className={`volumeCard-content-num ${isMobile && 'volumeCard-content-num-mobile'}`}
      >
        {`${text} ${volume.num}`}
      </Link>
    );
  };

  if (mode === RENDERING_MODE.TILE) {
    return (
      <div className='volumeCard volumeCard-tile'>
        {volume.tileImageURL ? (
          <Link href={volumeDetailPath} prefetch={false}>
            <img className='volumeCard-tile-img' src={volume.tileImageURL} alt='Volume tile' />
          </Link>
        ) : (
          <Link href={volumeDetailPath} prefetch={false} className="volumeCard-tile-template">
            <div className="volumeCard-tile-template-jpe">{currentJournal?.code.toUpperCase()}</div>
            <div className="volumeCard-tile-template-volume">{t('common.volumeCard.volume')}</div>
            {volume.types && volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE) && (
              <div className="volumeCard-tile-template-issue">{t('common.volumeCard.specialIssue')}</div>
            )}
            <div className="volumeCard-tile-template-number">{volume.num}</div>
            <div className="volumeCard-tile-template-year">{volume.year}</div>
          </Link>
        )}
        <div className="volumeCard-tile-text">
          {renderVolumeTileNum()}
          <Link href={volumeDetailPath} prefetch={false} className="volumeCard-tile-text-title">
            {volume.title ? volume.title[language] : ''}
          </Link>
          <div className="volumeCard-tile-text-year">{volume.year}</div>
          <div className="volumeCard-tile-text-count">
            <img className="volumeCard-tile-text-count-icon" src="/icons/file-grey.svg" alt='File icon' />
            <div className="volumeCard-tile-text-count-text">{volume.articles.length > 1 ? `${volume.articles.length} ${t('common.articles')}`: `${volume.articles.length} ${t('common.article')}`}</div>
          </div>
          {volume.downloadLink && (
            <Link href={volume.downloadLink} target='_blank' className="volumeCard-tile-text-download">
              <img className="volumeCard-tile-text-download-icon" src="/icons/download-red.svg" alt='Download icon' />
              <div className="volumeCard-tile-text-download-text">{t('common.pdf')}</div>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='volumeCard'>
      <div className='volumeCard-resume'>
        {volume.year && <div className='volumeCard-resume-year'>{volume.year}</div>}
        {renderVolumeListNum(true)}
        <div className='volumeCard-resume-count'>
          <img className='volumeCard-resume-count-icon' src="/icons/file-grey.svg" alt='File icon' />
          <span className='volumeCard-resume-count-text'>{volume.articles.length > 1 ? `${volume.articles.length} ${t('common.articles')}`: `${volume.articles.length} ${t('common.article')}`}</span>
        </div>
      </div>
      <div className='volumeCard-content'>
        {renderVolumeListNum(false)}
        <Link href={volumeDetailPath} prefetch={false} className='volumeCard-content-title'>
          {volume.title ? volume.title[language] : ''}
        </Link>
        {volume.committee && volume.committee.length > 0 && (
          <div className='volumeCard-content-committee'>
            {volume.committee.map((member) => member.screenName).join(', ')}
          </div>
        )}
        {volume.description && volume.description[language] && (
          <div className='volumeCard-content-description'>
            <div className={`volumeCard-content-description-title ${!openedDescription && 'volumeCard-content-description-title-closed'}`} onClick={toggleDescription}>
              <div className='volumeCard-content-description-title-text'>{t('common.about')}</div>
              <img 
                className='volumeCard-content-description-title-caret' 
                src={openedDescription ? "/icons/caret-up-red.svg" : "/icons/caret-down-red.svg"}
                alt={openedDescription ? 'Caret up icon' : 'Caret down icon'} 
              />
            </div>
            <div className={`volumeCard-content-description-content ${openedDescription && 'volumeCard-content-description-content-opened'}`}>
              <MathJax dynamic>{volume.description[language]}</MathJax>
            </div>
          </div>
        )}
        {volume.downloadLink && (
          <Link href={volume.downloadLink} target='_blank' className="volumeCard-content-download">
            <img className="volumeCard-content-download-icon" src="/icons/download-red.svg" alt='Download icon' />
            <div className="volumeCard-content-download-text">{t('common.pdf')}</div>
          </Link>
        )}
      </div>
    </div>
  )
} 