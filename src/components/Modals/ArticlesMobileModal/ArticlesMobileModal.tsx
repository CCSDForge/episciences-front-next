'use client';

import { useState, useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import './ArticlesMobileModal.scss';

enum FILTERS_SECTION {
  TYPE = 'type',
  YEAR = 'year'
}

type ArticlesTypeFilter = 'type' | 'year';

interface IArticlesTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

interface IArticlesYearSelection {
  year: number;
  isChecked: boolean;
}

interface IArticlesFilter {
  type: ArticlesTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

interface IArticlesMobileModalProps {
  t: TFunction<"translation", undefined>
  initialTypes: IArticlesTypeSelection[];
  onUpdateTypesCallback: (types: IArticlesTypeSelection[]) => void;
  initialYears: IArticlesYearSelection[];
  onUpdateYearsCallback: (years: IArticlesYearSelection[]) => void;
  onCloseCallback: () => void;
}

export default function ArticlesMobileModal({ t, initialTypes, onUpdateTypesCallback, initialYears, onUpdateYearsCallback, onCloseCallback }: IArticlesMobileModalProps): JSX.Element {
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<{ key: FILTERS_SECTION, isOpened: boolean }[]>([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false }
  ]);

  const [types, setTypes] = useState<IArticlesTypeSelection[]>(initialTypes)
  const [years, setYears] = useState<IArticlesYearSelection[]>(initialYears)
  const [taggedFilters, setTaggedFilters] = useState<IArticlesFilter[]>([]);

  const onCheckType = (value: string): void => {
    const updatedTypes = types.map((t) => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }
      return { ...t };
    });

    setTypes(updatedTypes);
  }

  const onCheckYear = (value: number): void => {
    const updatedYears = years.map((y) => {
      if (y.year === value) {
        return { ...y, isChecked: !y.isChecked };
      }
      return { ...y };
    });

    setYears(updatedYears);
  }

  const setAllTaggedFilters = (): void => {
    const initFilters: IArticlesFilter[] = []

    types.filter((t) => t.isChecked).forEach((t) => {
      initFilters.push({
        type: 'type',
        value: t.value,
        labelPath: t.labelPath
      })
    })

    years.filter((y) => y.isChecked).forEach((y) => {
      initFilters.push({
        type: 'year',
        value: y.year,
        label: y.year
      })
    })

    setTaggedFilters(initFilters)
  }

  const onCloseTaggedFilter = (type: ArticlesTypeFilter, value: string | number) => {
    if (type === 'type') {
      const updatedTypes = types.map((t) => {
        if (t.value === value) {
          return { ...t, isChecked: false };
        }
        return t;
      });

      setTypes(updatedTypes);
    } else if (type === 'year') {
      const updatedYears = years.map((y) => {
        if (y.year === value) {
          return { ...y, isChecked: false };
        }
        return y;
      });

      setYears(updatedYears);
    }
  }

  const clearTaggedFilters = (): void => {
    const updatedTypes = types.map((t) => {
      return { ...t, isChecked: false };
    });

    const updatedYears = years.map((y) => {
      return { ...y, isChecked: false };
    });

    setTypes(updatedTypes);
    setYears(updatedYears);
    setTaggedFilters([]);
  }

  const onClose = (): void => {
    clearTaggedFilters();
    onCloseCallback();
    dispatch(setFooterVisibility(true))
  }

  const onApplyFilters = (): void => {
    onUpdateTypesCallback(types);
    onUpdateYearsCallback(years);
    onCloseCallback();
    dispatch(setFooterVisibility(true))
  }

  useEffect(() => {
    setAllTaggedFilters()
  }, [types, years])

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

  useEffect(() => {
    if (isFooterEnabled) {
      dispatch(setFooterVisibility(false))
    }
  }, [isFooterEnabled]);

  const toggleSection = (sectionKey: FILTERS_SECTION) => {
    const updatedSections = openedSections.map((section) => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }
      return { ...section };
    });

    setOpenedSections(updatedSections);
  }

  const isOpenedSection = (sectionKey: FILTERS_SECTION): boolean | undefined => openedSections.find(section => section.key === sectionKey)?.isOpened

  return (
    <div className='articlesMobileModal' ref={modalRef}>
      <div className='articlesMobileModal-title'>
        <div className='articlesMobileModal-title-text'>{t('common.filters.filter')}</div>
        <img className='articlesMobileModal-title-close' src="/icons/close-red.svg" alt='Close icon' onClick={onClose} />
      </div>
      {taggedFilters.length > 0 && (
        <div className="articlesMobileModal-tags">
          <div className="articlesMobileModal-tags-row">
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
            ))}
          </div>
          <div className="articlesMobileModal-tags-clear" onClick={clearTaggedFilters}>{t('common.filters.clearAll')}</div>
        </div>
      )}
      <div className='articlesMobileModal-filters'>
        <div className='articlesMobileModal-filters-types'>
          <div className='articlesMobileModal-filters-types-title'>
            <div className='articlesMobileModal-filters-types-title-text' onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}>{t('common.filters.documentTypes')}</div>
            <img 
              className='articlesMobileModal-filters-types-title-caret' 
              src={isOpenedSection(FILTERS_SECTION.TYPE) ? "/icons/caret-up-grey.svg" : "/icons/caret-down-grey.svg"} 
              alt={isOpenedSection(FILTERS_SECTION.TYPE) ? 'Caret up icon' : 'Caret down icon'} 
              onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)} 
            />
          </div>
          <div className={`articlesMobileModal-filters-types-list ${isOpenedSection(FILTERS_SECTION.TYPE) && 'articlesMobileModal-filters-types-list-opened'}`}>
            {types.map((type, index) => (
              <div
                key={index}
                className='articlesMobileModal-filters-types-list-choice'
              >
                <div className='articlesMobileModal-filters-types-list-choice-checkbox'>
                  <Checkbox checked={type.isChecked} onChangeCallback={(): void => onCheckType(type.value)}/>
                </div>
                <span
                  className={`articlesMobileModal-filters-types-list-choice-label ${type.isChecked && 'articlesMobileModal-filters-types-list-choice-label-checked'}`}
                  onClick={(): void => onCheckType(type.value)}
                >
                  {t(type.labelPath)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className='articlesMobileModal-filters-years'>
          <div className='articlesMobileModal-filters-years-title'>
            <div className='articlesMobileModal-filters-years-title-text' onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}>{t('common.filters.years')}</div>
            <img 
              className='articlesMobileModal-filters-years-title-caret' 
              src={isOpenedSection(FILTERS_SECTION.YEAR) ? "/icons/caret-up-grey.svg" : "/icons/caret-down-grey.svg"} 
              alt={isOpenedSection(FILTERS_SECTION.YEAR) ? 'Caret up icon' : 'Caret down icon'} 
              onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)} 
            />
          </div>
          <div className={`articlesMobileModal-filters-years-list ${isOpenedSection(FILTERS_SECTION.YEAR) && 'articlesMobileModal-filters-years-list-opened'}`}>
            {years.map((y, index) => (
              <div
                key={index}
                className='articlesMobileModal-filters-years-list-choice'
              >
                <div className='articlesMobileModal-filters-years-list-choice-checkbox'>
                  <Checkbox checked={y.isChecked} onChangeCallback={(): void => onCheckYear(y.year)}/>
                </div>
                <span
                  className={`articlesMobileModal-filters-years-list-choice-label ${y.isChecked && 'articlesMobileModal-filters-years-list-choice-label-checked'}`}
                  onClick={(): void => onCheckYear(y.year)}
                >
                  {y.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className='articlesMobileModal-submit'>
        <Button text={t('common.filters.applyFilters')} onClickCallback={(): void => onApplyFilters()} />
      </div>
    </div>
  )
} 