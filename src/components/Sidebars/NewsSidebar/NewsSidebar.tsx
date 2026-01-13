'use client';

import { TFunction } from 'i18next';

import './NewsSidebar.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface INewsYearSelection {
  year: number;
  isSelected: boolean;
}

interface INewsSidebarProps {
  t: TFunction<'translation', undefined>;
  years: INewsYearSelection[];
  onSelectYearCallback: (year: number) => void;
}

export default function NewsSidebar({
  t,
  years,
  onSelectYearCallback,
}: INewsSidebarProps): React.JSX.Element {
  return (
    <div className="newsSidebar">
      <div className="newsSidebar-title">{t('common.filters.years')}</div>
      <div className="newsSidebar-years">
        <div className="newsSidebar-years-list">
          {years.map(y => (
            <div
              key={y.year}
              className={`newsSidebar-years-list-year ${y.isSelected && 'newsSidebar-years-list-year-selected'}`}
              role="button"
              tabIndex={0}
              onClick={(): void => onSelectYearCallback(y.year)}
              onKeyDown={(e) => handleKeyboardClick(e, (): void => onSelectYearCallback(y.year))}
            >
              {y.year}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
