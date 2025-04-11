'use client';

import { TFunction } from 'i18next';

import { AvailableLanguage } from '@/utils/i18n';
import Checkbox from '@/components/Checkbox/Checkbox';
import './SearchResultsSidebar.scss';

export interface ISearchResultTypeSelection {
  labelPath: string;
  value: string;
  count: number;
  isChecked: boolean;
}

export interface ISearchResultYearSelection {
  year: number;
  count: number;
  isChecked: boolean;
}

export interface ISearchResultVolumeSelection {
  id: number;
  label: Record<AvailableLanguage, string>;
  isChecked: boolean;
}

export interface ISearchResultSectionSelection {
  id: number;
  label: Record<AvailableLanguage, string>;
  isChecked: boolean;
}

export interface ISearchResultAuthorSelection {
  fullname: string;
  count: number;
  isChecked: boolean;
}

interface ISearchResultsSidebarProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  types: ISearchResultTypeSelection[];
  onCheckTypeCallback: (value: string) => void;
  years: ISearchResultYearSelection[];
  onCheckYearCallback: (year: number) => void;
  volumes: ISearchResultVolumeSelection[];
  onCheckVolumeCallback: (id: number) => void;
  sections: ISearchResultSectionSelection[];
  onCheckSectionCallback: (id: number) => void;
  authors: ISearchResultAuthorSelection[];
  onCheckAuthorCallback: (fullname: string) => void;
}

export default function SearchResultsSidebar({ language, t, types, onCheckTypeCallback, years, onCheckYearCallback, volumes, onCheckVolumeCallback, sections, onCheckSectionCallback, authors, onCheckAuthorCallback }: ISearchResultsSidebarProps): JSX.Element {
  return (
    <div className='searchResultsSidebar'>
      {types.length > 0 && (
        <div className='searchResultsSidebar-typesSection'>
          <div className='searchResultsSidebar-typesSection-title'>{t('common.filters.documentTypes')}</div>
          <div className='searchResultsSidebar-typesSection-types'>
            {types.map((type, index) => (
              <div
                key={index}
                className='searchResultsSidebar-typesSection-types-choice'
              >
                <div className='searchResultsSidebar-typesSection-types-choice-row'>
                  <div className='searchResultsSidebar-typesSection-types-choice-row-checkbox'>
                    <Checkbox checked={type.isChecked} onChangeCallback={(): void => onCheckTypeCallback(type.value)}/>
                  </div>
                  <span
                    className={`searchResultsSidebar-typesSection-types-choice-row-label ${type.isChecked && 'searchResultsSidebar-typesSection-types-choice-row-label-checked'}`}
                    onClick={(): void => onCheckTypeCallback(type.value)}
                  >
                    {t(type.labelPath)}
                  </span>
                </div>
                <div className='searchResultsSidebar-typesSection-types-choice-badge'>{type.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {years.length > 0 && (
        <div className='searchResultsSidebar-yearsSection'>
          <div className='searchResultsSidebar-yearsSection-title'>{t('common.filters.years')}</div>
          <div className='searchResultsSidebar-yearsSection-years'>
            <div className='searchResultsSidebar-yearsSection-years-list'>
              {years.map((y, index) => (
                <div
                  key={index}
                  className='searchResultsSidebar-yearsSection-years-list-choice'
                >
                  <div className='searchResultsSidebar-yearsSection-years-list-choice-row'>
                    <div className='searchResultsSidebar-yearsSection-years-list-choice-row-checkbox'>
                      <Checkbox checked={y.isChecked} onChangeCallback={(): void => onCheckYearCallback(y.year)}/>
                    </div>
                    <span
                      className={`searchResultsSidebar-yearsSection-years-list-choice-row-label ${y.isChecked && 'searchResultsSidebar-yearsSection-years-list-choice-row-label-checked'}`}
                      onClick={(): void => onCheckYearCallback(y.year)}
                    >
                      {y.year}
                    </span>
                  </div>
                  <div className='searchResultsSidebar-yearsSection-years-list-choice-badge'>{y.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {volumes.length > 0 && (
        <div className='searchResultsSidebar-volumesSection'>
          <div className='searchResultsSidebar-volumesSection-title'>{t('common.filters.volumes')}</div>
          <div className='searchResultsSidebar-volumesSection-volumes'>
            <div className='searchResultsSidebar-volumesSection-volumes-list'>
              {volumes.map((v, index) => (
                <div
                  key={index}
                  className='searchResultsSidebar-volumesSection-volumes-list-choice'
                >
                  <div className='searchResultsSidebar-volumesSection-volumes-list-choice-checkbox'>
                    <Checkbox checked={v.isChecked} onChangeCallback={(): void => onCheckVolumeCallback(v.id)}/>
                  </div>
                  <span
                    className={`searchResultsSidebar-volumesSection-volumes-list-choice-label ${v.isChecked && 'searchResultsSidebar-volumesSection-volumes-list-choice-label-checked'}`}
                    onClick={(): void => onCheckVolumeCallback(v.id)}
                  >
                    {v.label[language]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sections.length > 0 && (
        <div className='searchResultsSidebar-sectionsSection'>
          <div className='searchResultsSidebar-sectionsSection-title'>{t('common.filters.sections')}</div>
          <div className='searchResultsSidebar-sectionsSection-sections'>
            <div className='searchResultsSidebar-sectionsSection-sections-list'>
              {sections.map((s, index) => (
                <div
                  key={index}
                  className='searchResultsSidebar-sectionsSection-sections-list-choice'
                >
                  <div className='searchResultsSidebar-sectionsSection-sections-list-choice-checkbox'>
                    <Checkbox checked={s.isChecked} onChangeCallback={(): void => onCheckSectionCallback(s.id)}/>
                  </div>
                  <span
                    className={`searchResultsSidebar-sectionsSection-sections-list-choice-label ${s.isChecked && 'searchResultsSidebar-sectionsSection-sections-list-choice-label-checked'}`}
                    onClick={(): void => onCheckSectionCallback(s.id)}
                  >
                    {s.label[language]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {authors.length > 0 && (
        <div className='searchResultsSidebar-authorsSection'>
          <div className='searchResultsSidebar-authorsSection-title'>{t('common.filters.authors')}</div>
          <div className='searchResultsSidebar-authorsSection-authors'>
            <div className='searchResultsSidebar-authorsSection-authors-list'>
              {authors.map((a, index) => (
                <div
                  key={index}
                  className='searchResultsSidebar-authorsSection-authors-list-choice'
                >
                  <div className='searchResultsSidebar-authorsSection-authors-list-choice-row'>
                    <div className='searchResultsSidebar-authorsSection-authors-list-choice-row-checkbox'>
                      <Checkbox checked={a.isChecked} onChangeCallback={(): void => onCheckAuthorCallback(a.fullname)}/>
                    </div>
                    <span
                      className={`searchResultsSidebar-authorsSection-authors-list-choice-row-label ${a.isChecked && 'searchResultsSidebar-authorsSection-authors-list-choice-row-label-checked'}`}
                      onClick={(): void => onCheckAuthorCallback(a.fullname)}
                    >
                      {a.fullname}
                    </span>
                  </div>
                  <div className='searchResultsSidebar-authorsSection-authors-list-choice-badge'>{a.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 