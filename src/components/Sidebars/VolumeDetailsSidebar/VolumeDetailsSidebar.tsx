'use client';

import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';

import { PATHS } from '@/config/paths';
import { IArticle } from '@/types/article';
import { IJournal } from '@/types/journal';
import { IVolume, IVolumeMetadata } from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import './VolumeDetailsSidebar.scss';

interface IVolumeDetailsSidebarProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  volume?: IVolume;
  articles?: IArticle[];
  currentJournal?: IJournal;
  relatedVolumes: IVolume[];
}

export default function VolumeDetailsSidebar({ language, t, volume, articles = [], currentJournal, relatedVolumes }: IVolumeDetailsSidebarProps): JSX.Element {
  const NOT_RENDERED_SIDEBAR_METADATAS = ['tile'];
  
  // Utiliser les articles fournis ou les récupérer depuis le volume
  const volumeArticles = articles.length > 0 ? articles : (volume?.articles || []);

  const renderMetadatas = (): IVolumeMetadata[] => {
    if (!volume?.metadatas || !volume.metadatas.length) return [];

    return volume.metadatas.filter((metadata) => metadata.file && metadata.title && metadata.title[language] && !NOT_RENDERED_SIDEBAR_METADATAS.includes(metadata.title[language].replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  };

  const renderVolumeTemplateSpecial = (): JSX.Element => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return <div className='volumeDetailsSidebar-template-volume'>{t('common.volumeCard.proceeding')}</div>;
      } else if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return <div className='volumeDetailsSidebar-template-volume'>{t('common.volumeCard.specialIssue')}</div>;
      }
    }

    return <div className='volumeDetailsSidebar-template-volume'>{t('common.volumeCard.volume')}</div>;
  };

  const renderVolumeTemplateNumber = (): JSX.Element => {
    if (volume?.types && volume?.types.includes(VOLUME_TYPE.PROCEEDINGS) && volume.settingsProceeding && volume.settingsProceeding.length) {
      const conferenceAcronym = volume!.settingsProceeding!.find((setting) => setting.setting === "conference_acronym");
      const conferenceNumber = volume!.settingsProceeding!.find((setting) => setting.setting === "conference_number");

      if (conferenceAcronym && conferenceAcronym.value && conferenceNumber && conferenceNumber.value) {
        return <div className='volumeDetailsSidebar-template-number volumeDetailsSidebar-template-number-conference'>{`${conferenceAcronym.value} ${conferenceNumber.value}`}</div>;
      }
    }

    return <div className='volumeDetailsSidebar-template-number'>{volume?.num}</div>;
  };

  const renderRelatedVolumesTitle = (): string => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return t('pages.volumeDetails.relatedVolumes.proceedings');
      }

      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return t('pages.volumeDetails.relatedVolumes.specialIssues');
      }
    }

    return t('pages.volumeDetails.relatedVolumes.volumes');
  };

  return (
    <div className='volumeDetailsSidebar'>
      {volume?.tileImageURL ? (
        <img className='volumeDetailsSidebar-tile' src={volume.tileImageURL} alt='Volume tile' />
      ) : (
        <div className='volumeDetailsSidebar-template'>
          <div className='volumeDetailsSidebar-template-jpe'>{currentJournal?.code.toUpperCase()}</div>
          {renderVolumeTemplateSpecial()}
          {renderVolumeTemplateNumber()}
          <div className='volumeDetailsSidebar-template-year'>{volume?.year}</div>
        </div>
      )}
      <div className='volumeDetailsSidebar-count'>
        {volumeArticles.length > 1 ? `${volumeArticles.length} ${t('common.articles')}` : `${volumeArticles.length} ${t('common.article')}`}
      </div>
      <div className='volumeDetailsSidebar-actions'>
        {volume && (
          <Link href={volume.downloadLink} target='_blank' rel="noopener noreferrer" className='volumeDetailsSidebar-actions-action'>
            <img src='/icons/download-blue.svg' alt='Download icon' />
            <span className='volumeDetailsSidebar-actions-action-text'>{t('pages.volumeDetails.actions.downloadAll')}</span>
          </Link>
        )}
        {renderMetadatas().map((metadata, index) => (
          <Link key={index} className='volumeDetailsSidebar-actions-action' href={`https://${currentJournal?.code}.episciences.org/public/volumes/${volume?.id}/${metadata.file}`} target='_blank' rel="noopener noreferrer">
            <img src='/icons/download-blue.svg' alt='Download icon' />
            <span className='volumeDetailsSidebar-actions-action-text'>{metadata.title && metadata.title[language]}</span>
          </Link>
        ))}
      </div>
      {relatedVolumes.length > 0 && (
        <div className='volumeDetailsSidebar-relatedVolumes'>
          <div className='volumeDetailsSidebar-relatedVolumes-title'>{renderRelatedVolumesTitle()}</div>
          <div className='volumeDetailsSidebar-relatedVolumes-volumes'>
            <div className='volumeDetailsSidebar-relatedVolumes-volumes-list'>
              {relatedVolumes.map((relatedVolume, index) => (
                <Link
                  key={index}
                  href={`${PATHS.volumes}/${relatedVolume.id}`}
                  className={`volumeDetailsSidebar-relatedVolumes-volumes-list-volume ${relatedVolume.id === volume?.id && 'volumeDetailsSidebar-relatedVolumes-volumes-list-volume-current'}`}
                >
                  {relatedVolume.title ? relatedVolume.title[language] : ''}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 