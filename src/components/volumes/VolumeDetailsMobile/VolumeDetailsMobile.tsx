'use client';

import { useState, useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import { IVolume } from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import Button from '@/components/Button/Button';
import './VolumeDetailsMobile.scss';

interface IVolumeDetailsMobileProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  volume?: IVolume;
  relatedVolumes: IVolume[];
  onSelectRelatedVolumeCallback: (id: number) => void;
  onCloseCallback: () => void;
}

export function VolumeDetailsMobile({ language, t, volume, relatedVolumes, onSelectRelatedVolumeCallback, onCloseCallback }: IVolumeDetailsMobileProps): JSX.Element {
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);
  const [chosenVolume, setChosenVolume] = useState<IVolume | undefined>(volume);

  const onClose = (): void => {
    setChosenVolume(undefined);
    onCloseCallback();
    dispatch(setFooterVisibility(true))
  }

  const onApplyFilters = (): void => {
    if (!chosenVolume) return;

    onSelectRelatedVolumeCallback(chosenVolume.id);
    onCloseCallback();
    dispatch(setFooterVisibility(true))
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getTitle = (): string => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
          return t('pages.volumeDetails.relatedVolumes.proceedings')
      }

      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return t('pages.volumeDetails.relatedVolumes.specialIssues')
      }
    }

    return t('pages.volumeDetails.relatedVolumes.volumes')
  }

  const getSubmitText = (): string => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
          return t('pages.volumeDetails.relatedVolumes.lookAtSelectedProceedings')
      }

      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return t('pages.volumeDetails.relatedVolumes.lookAtSelectedIssue')
      }
    }

    return t('pages.volumeDetails.relatedVolumes.lookAtSelectedVolume')
  }

  useEffect(() => {
    if (isFooterEnabled) {
      dispatch(setFooterVisibility(false))
    }
  }, [isFooterEnabled]);

  return (
    <div className="volumeDetailsMobile" ref={modalRef}>
      <div className="volumeDetailsMobile-title">
        <div className="volumeDetailsMobile-title-text">{getTitle()}</div>
        <img className="volumeDetailsMobile-title-close" src="/icons/close-red.svg" alt='Close icon' onClick={onClose} />
      </div>
      <div className="volumeDetailsMobile-relatedVolumes">
        {relatedVolumes.map((relatedVolume, index) => (
          <div
            key={index}
            className={`volumeDetailsMobile-relatedVolumes-volume ${relatedVolume.id === chosenVolume?.id && 'volumeDetailsMobile-relatedVolumes-volume-current'}`}
            onClick={(): void => setChosenVolume(chosenVolume?.id !== relatedVolume.id ? relatedVolume : undefined)}
          >
            {relatedVolume.title ? relatedVolume.title[language] : ''}
          </div>
        ))}
      </div>
      <div className="volumeDetailsMobile-submit">
        <Button text={getSubmitText()} onClickCallback={(): void => onApplyFilters()} />
      </div>
    </div>
  )
} 