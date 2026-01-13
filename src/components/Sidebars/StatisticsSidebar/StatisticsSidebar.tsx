'use client';

import { TFunction } from 'i18next';
import Checkbox from '@/components/Checkbox/Checkbox';
import './StatisticsSidebar.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface IStatisticsYearSelection {
  year: number;
  isChecked: boolean;
}

interface IStatisticsSidebarProps {
  t: TFunction<'translation', undefined>;
  years: IStatisticsYearSelection[];
  onCheckYearCallback: (year: number) => void;
}

export default function StatisticsSidebar({
  t,
  years,
  onCheckYearCallback,
}: IStatisticsSidebarProps): React.JSX.Element {
  return (
    <div className="statisticsSidebar">
      <div className="statisticsSidebar-title">{t('common.filters.years')}</div>
      <div className="statisticsSidebar-years">
        <div className="statisticsSidebar-years-list">
          {years.map((y, index) => (
            <div key={index} className="statisticsSidebar-years-list-choice">
              <div className="statisticsSidebar-years-list-choice-checkbox">
                <Checkbox
                  checked={y.isChecked}
                  onChangeCallback={(): void => onCheckYearCallback(y.year)}
                />
              </div>
              <span
                className={`statisticsSidebar-years-list-choice-label ${y.isChecked && 'statisticsSidebar-years-list-choice-label-checked'}`}
                role="button"
                tabIndex={0}
                onClick={(): void => onCheckYearCallback(y.year)}
                onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckYearCallback(y.year))}
              >
                {y.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
