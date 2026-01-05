'use client';

import { TFunction } from 'i18next';
import Checkbox from '@/components/Checkbox/Checkbox';
import './VolumesSidebar.scss';

export interface IVolumeTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

export interface IVolumeYearSelection {
  year: number;
  isSelected: boolean;
}

interface IVolumesSidebarProps {
  t: TFunction<"translation", undefined>;
  types: IVolumeTypeSelection[];
  onCheckTypeCallback: (value: string) => void;
  years: IVolumeYearSelection[];
  onSelectYearCallback: (year: number) => void;
}

export default function VolumesSidebar({ t, types, onCheckTypeCallback, years, onSelectYearCallback }: IVolumesSidebarProps): React.JSX.Element {
  return (
    <div className="volumesSidebar">
      <div className="volumesSidebar-typesSection">
        <div className="volumesSidebar-typesSection-title">{t('common.filters.volumeTypes')}</div>
        <div className="volumesSidebar-typesSection-types">
          {types.map((type, index) => (
            <div
              key={index}
              className="volumesSidebar-typesSection-types-choice"
            >
              <div className="volumesSidebar-typesSection-types-choice-checkbox">
                <Checkbox checked={type.isChecked} onChangeCallback={(): void => onCheckTypeCallback(type.value)} />
              </div>
              <span
                className={`volumesSidebar-typesSection-types-choice-label ${type.isChecked && 'volumesSidebar-typesSection-types-choice-label-checked'}`}
                onClick={(): void => onCheckTypeCallback(type.value)}
              >
                {t(type.labelPath)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="volumesSidebar-yearsSection">
        <div className="volumesSidebar-yearsSection-title">{t('common.filters.years')}</div>
        <div className="volumesSidebar-yearsSection-years">
          <div className="volumesSidebar-yearsSection-years-list">
            {years.map((y) => (
              <div
                key={y.year}
                className={`volumesSidebar-yearsSection-years-list-year ${y.isSelected && 'volumesSidebar-yearsSection-years-list-year-selected'}`}
                onClick={(): void => onSelectYearCallback(y.year)}
              >
                {y.year}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 