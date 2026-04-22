'use client';

import { useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import FocusTrap from 'focus-trap-react';

import Checkbox from '@/components/Checkbox/Checkbox';
import './VolumesModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface IVolumeTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

export interface IVolumeYearSelection {
  year: number;
  isSelected: boolean;
}

interface IVolumesModalProps {
  t: TFunction<'translation', undefined>;
  types: IVolumeTypeSelection[];
  onCheckTypeCallback: (value: string) => void;
  years: IVolumeYearSelection[];
  onSelectYearCallback: (year: number) => void;
  onCloseCallback: () => void;
}

export default function VolumesModal({
  t,
  types,
  onCheckTypeCallback,
  years,
  onSelectYearCallback,
  onCloseCallback,
}: IVolumesModalProps): React.JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCloseCallback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCloseCallback]);

  return (
    <FocusTrap>
      <div
        className="volumesModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="volumesModal-typesSection">
          <h2 id="modal-title" className="volumesModal-typesSection-title">
            {t('common.filters.volumeTypes')}
          </h2>
          <div className="volumesModal-typesSection-types">
            {types.map((type, index) => (
              <div key={index} className="volumesModal-typesSection-types-choice">
                <div>
                  <Checkbox
                    checked={type.isChecked}
                    onChangeCallback={(): void => onCheckTypeCallback(type.value)}
                    ariaLabel={t(type.labelPath)}
                  />
                </div>
                <span
                  className={`volumesModal-typesSection-types-choice-label ${type.isChecked ? 'volumesModal-typesSection-types-choice-label-checked' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onCheckTypeCallback(type.value)}
                  onKeyDown={e =>
                    handleKeyboardClick(e, (): void => onCheckTypeCallback(type.value))
                  }
                >
                  {t(type.labelPath)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="volumesModal-yearsSection">
          <div className="volumesModal-yearsSection-title">{t('common.filters.years')}</div>
          <div className="volumesModal-yearsSection-years">
            <div className="volumesModal-yearsSection-years-list">
              {years.map(y => (
                <div
                  key={y.year}
                  className={`volumesModal-yearsSection-years-list-year ${y.isSelected ? 'volumesModal-yearsSection-years-list-year-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onSelectYearCallback(y.year)}
                  onKeyDown={e => handleKeyboardClick(e, (): void => onSelectYearCallback(y.year))}
                >
                  {y.year}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
