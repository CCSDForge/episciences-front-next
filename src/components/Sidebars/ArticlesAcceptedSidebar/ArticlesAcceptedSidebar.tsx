'use client';

import { TFunction } from 'i18next';

import Checkbox from '@/components/Checkbox/Checkbox';
import './ArticlesAcceptedSidebar.scss';

export interface IArticleTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

interface IArticlesAcceptedSidebarProps {
  t: TFunction<"translation", undefined>
  types: IArticleTypeSelection[];
  onCheckTypeCallback: (value: string) => void;
}

export default function ArticlesAcceptedSidebar({ t, types, onCheckTypeCallback }: IArticlesAcceptedSidebarProps): JSX.Element {
  return (
    <div className='articlesAcceptedSidebar'>
      <div className='articlesAcceptedSidebar-typesSection'>
        <div className='articlesAcceptedSidebar-typesSection-title'>{t('common.filters.documentTypes')}</div>
        <div className='articlesAcceptedSidebar-typesSection-types'>
          {types.map((type, index) => (
            <div
              key={index}
              className='articlesAcceptedSidebar-typesSection-types-choice'
            >
              <div className='articlesAcceptedSidebar-typesSection-types-choice-checkbox'>
                <Checkbox checked={type.isChecked} onChangeCallback={(): void => onCheckTypeCallback(type.value)}/>
              </div>
              <span
                className={`articlesAcceptedSidebar-typesSection-types-choice-label ${type.isChecked && 'articlesAcceptedSidebar-typesSection-types-choice-label-checked'}`}
                onClick={(): void => onCheckTypeCallback(type.value)}
              >
                {t(type.labelPath)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 