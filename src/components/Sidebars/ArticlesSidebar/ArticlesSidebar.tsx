'use client';

import { TFunction } from 'i18next';

import Checkbox from '@/components/Checkbox/Checkbox';
import './ArticlesSidebar.scss';

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
  t: TFunction<"translation", undefined>
  types: IArticleTypeSelection[];
  onCheckTypeCallback: (value: string) => void;
  years: IArticleYearSelection[];
  onCheckYearCallback: (year: number) => void;
}

export default function ArticlesSidebar({ t, types, onCheckTypeCallback, years, onCheckYearCallback }: IArticlesSidebarProps): React.JSX.Element {
  return (
    <div className="articlesSidebar">
      <div className="articlesSidebar-typesSection">
        <div className="articlesSidebar-typesSection-title">{t('common.filters.documentTypes')}</div>
        <div className="articlesSidebar-typesSection-types">
          {types.map((type, index) => (
            <div
              key={index}
              className="articlesSidebar-typesSection-types-choice"
            >
              <div className="articlesSidebar-typesSection-types-choice-checkbox">
                <Checkbox checked={type.isChecked} onChangeCallback={(): void => onCheckTypeCallback(type.value)}/>
              </div>
              <span
                className={`articlesSidebar-typesSection-types-choice-label ${type.isChecked && 'articlesSidebar-typesSection-types-choice-label-checked'}`}
                onClick={(): void => onCheckTypeCallback(type.value)}
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
            {years.map((y, index) => (
              <div
                key={index}
                className="articlesSidebar-yearsSection-years-list-choice"
              >
                <div className="articlesSidebar-yearsSection-years-list-choice-checkbox">
                  <Checkbox checked={y.isChecked} onChangeCallback={(): void => onCheckYearCallback(y.year)}/>
                </div>
                <span
                  className={`articlesSidebar-yearsSection-years-list-choice-label ${y.isChecked && 'articlesSidebar-yearsSection-years-list-choice-label-checked'}`}
                  onClick={(): void => onCheckYearCallback(y.year)}
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