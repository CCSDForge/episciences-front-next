'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import FocusTrap from 'focus-trap-react';
import './ArticlesMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

enum FILTERS_SECTION {
  TYPE = 'type',
  YEAR = 'year',
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
  t: TFunction<'translation', undefined>;
  initialTypes: IArticlesTypeSelection[];
  onUpdateTypesCallback: (types: IArticlesTypeSelection[]) => void;
  initialYears: IArticlesYearSelection[];
  onUpdateYearsCallback: (years: IArticlesYearSelection[]) => void;
  onCloseCallback: () => void;
}

export default function ArticlesMobileModal({
  t,
  initialTypes,
  onUpdateTypesCallback,
  initialYears,
  onUpdateYearsCallback,
  onCloseCallback,
}: IArticlesMobileModalProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
  ]);

  const [types, setTypes] = useState<IArticlesTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<IArticlesYearSelection[]>(initialYears);
  const [taggedFilters, setTaggedFilters] = useState<IArticlesFilter[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const onCheckType = (value: string): void => {
    const updatedTypes = types.map(t => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }
      return { ...t };
    });

    setTypes(updatedTypes);
  };

  const onCheckYear = (value: number): void => {
    const updatedYears = years.map(y => {
      if (y.year === value) {
        return { ...y, isChecked: !y.isChecked };
      }
      return { ...y };
    });

    setYears(updatedYears);
  };

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: IArticlesFilter[] = [];

    types
      .filter(t => t.isChecked)
      .forEach(t => {
        initFilters.push({
          type: 'type',
          value: t.value,
          labelPath: t.labelPath,
        });
      });

    years
      .filter(y => y.isChecked)
      .forEach(y => {
        initFilters.push({
          type: 'year',
          value: y.year,
          label: y.year,
        });
      });

    setTaggedFilters(initFilters);
  }, [types, years]);

  const onCloseTaggedFilter = (type: ArticlesTypeFilter, value: string | number) => {
    if (type === 'type') {
      const updatedTypes = types.map(t => {
        if (t.value === value) {
          return { ...t, isChecked: false };
        }
        return t;
      });

      setTypes(updatedTypes);
    } else if (type === 'year') {
      const updatedYears = years.map(y => {
        if (y.year === value) {
          return { ...y, isChecked: false };
        }
        return y;
      });

      setYears(updatedYears);
    }
  };

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev =>
      prev.map(t => {
        return { ...t, isChecked: false };
      })
    );

    setYears(prev =>
      prev.map(y => {
        return { ...y, isChecked: false };
      })
    );

    setTaggedFilters([]);
  }, []);

  const onClose = useCallback((): void => {
    clearTaggedFilters();
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  }, [clearTaggedFilters, onCloseCallback, dispatch]);

  const onApplyFilters = (): void => {
    onUpdateTypesCallback(types);
    onUpdateYearsCallback(years);

    // Announce filter count to screen readers
    const filterCount = taggedFilters.length;
    if (filterCount > 0) {
      setAnnouncement(
        t('common.filters.filtersActive', { count: filterCount })
      );
    } else {
      setAnnouncement(t('common.filters.noFilters'));
    }

    onCloseCallback();
    dispatch(setFooterVisibility(true));
  };

  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (isFooterEnabled) {
      dispatch(setFooterVisibility(false));
    }
  }, [isFooterEnabled, dispatch]);

  const toggleSection = (sectionKey: FILTERS_SECTION) => {
    const updatedSections = openedSections.map(section => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }
      return { ...section };
    });

    setOpenedSections(updatedSections);
  };

  const isOpenedSection = (sectionKey: FILTERS_SECTION): boolean | undefined =>
    openedSections.find(section => section.key === sectionKey)?.isOpened;

  return (
    <FocusTrap>
      <div
        className="articlesMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <LiveRegion message={announcement} />
        <div className="articlesMobileModal-title">
          <h2 id="modal-title" className="articlesMobileModal-title-text">
            {t('common.filters.filter')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="articlesMobileModal-title-close"
            aria-label={t('common.close')}
          >
            <CloseBlackIcon size={24} />
          </button>
        </div>
        {taggedFilters.length > 0 && (
          <div className="articlesMobileModal-tags">
            <div className="articlesMobileModal-tags-row">
              {taggedFilters.map((filter, index) => (
                <Tag
                  key={index}
                  text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                  onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
                />
              ))}
            </div>
            <button
              type="button"
              className="articlesMobileModal-tags-clear"
              onClick={clearTaggedFilters}
            >
              {t('common.filters.clearAll')}
            </button>
          </div>
        )}
      <div className="articlesMobileModal-filters">
        <div className="articlesMobileModal-filters-types">
          <button
            type="button"
            className="articlesMobileModal-filters-types-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.TYPE)}
            aria-controls="filter-section-type"
          >
            <span className="articlesMobileModal-filters-types-title-text">
              {t('common.filters.documentTypes')}
            </span>
            {isOpenedSection(FILTERS_SECTION.TYPE) ? (
              <CaretUpGreyIcon
                size={16}
                className="articlesMobileModal-filters-types-title-caret"
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="articlesMobileModal-filters-types-title-caret"
              />
            )}
          </button>
          <div
            id="filter-section-type"
            className={`articlesMobileModal-filters-types-list ${isOpenedSection(FILTERS_SECTION.TYPE) && 'articlesMobileModal-filters-types-list-opened'}`}
          >
            {types.map((type, index) => (
              <div key={index} className="articlesMobileModal-filters-types-list-choice">
                <div className="articlesMobileModal-filters-types-list-choice-checkbox">
                  <Checkbox
                    checked={type.isChecked}
                    onChangeCallback={(): void => onCheckType(type.value)}
                    ariaLabel={t(type.labelPath)}
                  />
                </div>
                <span
                  className={`articlesMobileModal-filters-types-list-choice-label ${type.isChecked && 'articlesMobileModal-filters-types-list-choice-label-checked'}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onCheckType(type.value)}
                  onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckType(type.value))}
                >
                  {t(type.labelPath)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="articlesMobileModal-filters-years">
          <button
            type="button"
            className="articlesMobileModal-filters-years-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.YEAR)}
            aria-controls="filter-section-year"
          >
            <span className="articlesMobileModal-filters-years-title-text">
              {t('common.filters.years')}
            </span>
            {isOpenedSection(FILTERS_SECTION.YEAR) ? (
              <CaretUpGreyIcon
                size={16}
                className="articlesMobileModal-filters-years-title-caret"
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="articlesMobileModal-filters-years-title-caret"
              />
            )}
          </button>
          <div
            id="filter-section-year"
            className={`articlesMobileModal-filters-years-list ${isOpenedSection(FILTERS_SECTION.YEAR) && 'articlesMobileModal-filters-years-list-opened'}`}
          >
            {years.map((y, index) => (
              <div key={index} className="articlesMobileModal-filters-years-list-choice">
                <div className="articlesMobileModal-filters-years-list-choice-checkbox">
                  <Checkbox
                    checked={y.isChecked}
                    onChangeCallback={(): void => onCheckYear(y.year)}
                    ariaLabel={String(y.year)}
                  />
                </div>
                <span
                  className={`articlesMobileModal-filters-years-list-choice-label ${y.isChecked && 'articlesMobileModal-filters-years-list-choice-label-checked'}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onCheckYear(y.year)}
                  onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckYear(y.year))}
                >
                  {y.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
        <div className="articlesMobileModal-submit">
          <Button
            text={t('common.filters.applyFilters')}
            onClickCallback={(): void => onApplyFilters()}
          />
        </div>
      </div>
    </FocusTrap>
  );
}
