'use client';

import { TFunction } from 'i18next';

import Checkbox from '@/components/Checkbox/Checkbox';
import './ArticlesSidebar.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface IArticleTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

export interface IArticleYearSelection {
  year: number;
  isChecked: boolean;
}

interface IArticlesSidebarProps {
  readonly t: TFunction<'translation', undefined>;
  readonly types: IArticleTypeSelection[];
  readonly onCheckTypeCallback: (value: string) => void;
  readonly years: IArticleYearSelection[];
  readonly onCheckYearCallback: (year: number) => void;
}

export default function ArticlesSidebar({
  t,
  types,
  onCheckTypeCallback,
  years,
  onCheckYearCallback,
}: IArticlesSidebarProps): React.JSX.Element {
  return (
    <div className="articlesSidebar">
      <div className="articlesSidebar-typesSection">
        <div className="articlesSidebar-typesSection-title">
          {t('common.filters.documentTypes')}
        </div>
        <div className="articlesSidebar-typesSection-types">
          {types.map(type => (
            <div key={type.value} className="articlesSidebar-typesSection-types-choice">
              <div className="articlesSidebar-typesSection-types-choice-checkbox">
                <Checkbox
                  checked={type.isChecked}
                  onChangeCallback={(): void => onCheckTypeCallback(type.value)}
                />
              </div>
              <span
                className={`articlesSidebar-typesSection-types-choice-label ${type.isChecked && 'articlesSidebar-typesSection-types-choice-label-checked'}`}
                role="button"
                tabIndex={0}
                onClick={(): void => onCheckTypeCallback(type.value)}
                onKeyDown={e => handleKeyboardClick(e, (): void => onCheckTypeCallback(type.value))}
              >
                {t(type.labelPath)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="articlesSidebar-yearsSection">
        <div className="articlesSidebar-yearsSection-title">{t('common.filters.years')}</div>
        <div className="articlesSidebar-yearsSection-years">
          <div className="articlesSidebar-yearsSection-years-list">
            {years.map(y => (
              <div key={y.year} className="articlesSidebar-yearsSection-years-list-choice">
                <div className="articlesSidebar-yearsSection-years-list-choice-checkbox">
                  <Checkbox
                    checked={y.isChecked}
                    onChangeCallback={(): void => onCheckYearCallback(y.year)}
                  />
                </div>
                <span
                  className={`articlesSidebar-yearsSection-years-list-choice-label ${y.isChecked && 'articlesSidebar-yearsSection-years-list-choice-label-checked'}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onCheckYearCallback(y.year)}
                  onKeyDown={e => handleKeyboardClick(e, (): void => onCheckYearCallback(y.year))}
                >
                  {y.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
