'use client';

import { CloseBlackIcon } from '@/components/icons';
import FocusTrap from 'focus-trap-react';
import { useState, useCallback } from 'react';
import { TFunction } from 'i18next';
import { IVolume } from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import Button from '@/components/Button/Button';
import './VolumeDetailsMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';
import { useMobileModal } from '@/hooks/useMobileModal';

interface IVolumeDetailsMobileModalProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  volume?: IVolume;
  relatedVolumes: IVolume[];
  onSelectRelatedVolumeCallback: (id: number) => void;
  onCloseCallback: () => void;
}

export default function VolumeDetailsMobileModal({
  language,
  t,
  volume,
  relatedVolumes,
  onSelectRelatedVolumeCallback,
  onCloseCallback,
}: IVolumeDetailsMobileModalProps): React.JSX.Element {
  const [chosenVolume, setChosenVolume] = useState<IVolume | undefined>(volume);

  const clearChosenVolume = useCallback(() => setChosenVolume(undefined), []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearChosenVolume,
  });

  const onApplyFilters = (): void => {
    if (!chosenVolume) return;
    onSelectRelatedVolumeCallback(chosenVolume.id);
    closeModal();
  };

  const getTitle = (): string => {
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

  const getSubmitText = (): string => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return t('pages.volumeDetails.relatedVolumes.lookAtSelectedProceedings');
      }
      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return t('pages.volumeDetails.relatedVolumes.lookAtSelectedIssue');
      }
    }
    return t('pages.volumeDetails.relatedVolumes.lookAtSelectedVolume');
  };

  return (
    <FocusTrap>
      <div
        className="volumeDetailsMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="volumeDetailsMobileModal-title">
          <h2 id="modal-title" className="volumeDetailsMobileModal-title-text">
            {getTitle()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="volumeDetailsMobileModal-title-close"
            aria-label={t('common.close')}
          >
            <CloseBlackIcon size={24} />
          </button>
        </div>
        <div className="volumeDetailsMobileModal-relatedVolumes">
          {relatedVolumes.map((relatedVolume, index) => (
            <div
              key={index}
              className={`volumeDetailsMobileModal-relatedVolumes-volume ${relatedVolume.id === chosenVolume?.id ? 'volumeDetailsMobileModal-relatedVolumes-volume-current' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(): void =>
                setChosenVolume(chosenVolume?.id !== relatedVolume.id ? relatedVolume : undefined)
              }
              onKeyDown={e =>
                handleKeyboardClick(e, () =>
                  setChosenVolume(chosenVolume?.id !== relatedVolume.id ? relatedVolume : undefined)
                )
              }
            >
              {relatedVolume.title ? relatedVolume.title[language] : ''}
            </div>
          ))}
        </div>
        <div className="volumeDetailsMobileModal-submit">
          <Button text={getSubmitText()} onClickCallback={(): void => onApplyFilters()} />
        </div>
      </div>
    </FocusTrap>
  );
}
