'use client';

import { useAppSelector } from '@/hooks/store';
import { IVolume, IVolumeMetadata } from '@/types/volume';
import { VOLUME_TYPE } from '@/utils/volume';
import { formatDate } from '@/utils/date';
import ReactMarkdown from 'react-markdown';
import './VolumeDetailsDesktop.scss';

interface IVolumeDetailsDesktopProps {
  volume: IVolume;
}

export function VolumeDetailsDesktop({ volume }: IVolumeDetailsDesktopProps): JSX.Element {
  const language = useAppSelector(state => state.i18nReducer.language);

  const getEdito = (): IVolumeMetadata | null => {
    if (!volume?.metadatas || !volume.metadatas.length) return null;

    const edito = volume.metadatas.find((metadata) => 
      metadata.title && 
      metadata.title[language] && 
      metadata.title[language].replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'edito'
    );

    return edito || null;
  };

  const renderProceedingTheme = (): string | null => {
    if (!volume.settingsProceeding) return null;
    const proceedingTheme = volume.settingsProceeding.find((setting) => setting.setting === "conference_theme");
    return proceedingTheme?.value || null;
  };

  const renderProceedingDOI = (): string | null => {
    if (!volume.settingsProceeding) return null;
    const proceedingDOI = volume.settingsProceeding.find((setting) => setting.setting === "conference_proceedings_doi");
    return proceedingDOI?.value || null;
  };

  const renderProceedingLocation = (): string | null => {
    if (!volume.settingsProceeding) return null;
    const conferenceLocation = volume.settingsProceeding.find((setting) => setting.setting === "conference_location");
    return conferenceLocation?.value || null;
  };

  const renderProceedingDates = (): string | null => {
    if (!volume.settingsProceeding) return null;
    const conferenceStart = volume.settingsProceeding.find((setting) => setting.setting === "conference_start");
    const conferenceEnd = volume.settingsProceeding.find((setting) => setting.setting === "conference_end");

    return conferenceStart?.value && conferenceEnd?.value 
      ? `${formatDate(conferenceStart.value, language)} - ${formatDate(conferenceEnd.value, language)}` 
      : null;
  };

  const renderTitle = (): JSX.Element => {
    if (volume?.types?.includes(VOLUME_TYPE.PROCEEDINGS) && volume.settingsProceeding?.length) {
      const conferenceName = volume.settingsProceeding.find((setting) => setting.setting === "conference_name");
      if (conferenceName?.value) {
        return (
          <div className="volumeDetailsDesktop-title">
            {volume?.title ? `${volume?.title[language]} (${conferenceName.value})` : ''}
          </div>
        );
      }
    }

    return (
      <div className="volumeDetailsDesktop-title">
        {volume?.title ? volume?.title[language] : ''}
      </div>
    );
  };

  const renderCommittee = (): JSX.Element | null => {
    if (!volume?.committee?.length) return null;

    return (
      <div className="volumeDetailsDesktop-committee">
        {(!volume?.types?.includes(VOLUME_TYPE.PROCEEDINGS)) && (
          <span className="volumeDetailsDesktop-committee-note">Volume committee :</span>
        )}
        {volume?.committee.map((member) => member.screenName).join(', ')}
      </div>
    );
  };

  const edito = getEdito();

  return (
    <div className="volumeDetailsDesktop">
      {renderTitle()}
      {renderCommittee()}
      
      {volume?.description && volume.description[language] && (
        <div className="volumeDetailsDesktop-description">
          <ReactMarkdown>{volume.description[language]}</ReactMarkdown>
        </div>
      )}

      {volume?.types?.includes(VOLUME_TYPE.PROCEEDINGS) && volume.settingsProceeding && (
        <div className="volumeDetailsDesktop-proceeding">
          {renderProceedingTheme() && (
            <div className="volumeDetailsDesktop-proceeding-theme">
              {renderProceedingTheme()}
            </div>
          )}
          <div className="volumeDetailsDesktop-proceeding-info">
            {renderProceedingLocation() && (
              <div>{renderProceedingLocation()}</div>
            )}
            {renderProceedingDates() && (
              <div>{renderProceedingDates()}</div>
            )}
            {renderProceedingDOI() && (
              <a 
                href={renderProceedingDOI()!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="volumeDetailsDesktop-proceeding-doi"
              >
                {renderProceedingDOI()}
              </a>
            )}
          </div>
        </div>
      )}

      {edito && (
        <div className="volumeDetailsDesktop-edito">
          <div className="volumeDetailsDesktop-edito-title">
            {edito.title?.[language]}
          </div>
          <div className="volumeDetailsDesktop-edito-content">
            <ReactMarkdown>{edito.content?.[language] || ''}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
} 