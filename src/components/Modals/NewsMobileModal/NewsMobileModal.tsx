'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import './NewsMobileModal.scss';

enum FILTERS_SECTION {
  YEAR = 'year',
}

interface INewsYearSelection {
  year: number;
  isSelected: boolean;
}

interface INewsMobileModalProps {
  t: TFunction<'translation', undefined>;
  years: INewsYearSelection[];
  onUpdateYearsCallback: (years: INewsYearSelection[]) => void;
  onCloseCallback: () => void;
}

export default function NewsMobileModal({
  t,
  years,
  onUpdateYearsCallback,
  onCloseCallback,
}: INewsMobileModalProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([{ key: FILTERS_SECTION.YEAR, isOpened: true }]);

  const [filtersYears, setFiltersYears] = useState<INewsYearSelection[]>(years);

  const onSelectYear = (year: number): void => {
    const updatedYears = filtersYears.map(y => {
      if (y.year === year) {
        return { ...y, isSelected: !y.isSelected };
      }
      return { ...y };
    });

    setFiltersYears(updatedYears);
  };

  const onClose = useCallback((): void => {
    setFiltersYears([]);
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  }, [onCloseCallback, dispatch]);

  const onApplyFilters = (): void => {
    onUpdateYearsCallback(filtersYears);
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  };

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
    <div className="newsMobileModal" ref={modalRef}>
      <div className="newsMobileModal-title">
        <div className="newsMobileModal-title-text">{t('common.filters.filter')}</div>
        <CloseBlackIcon
          size={24}
          className="newsMobileModal-title-close"
          ariaLabel="Close"
          onClick={onClose}
        />
      </div>
      <div className="newsMobileModal-filters">
        <div className="newsMobileModal-filters-years">
          <div className="newsMobileModal-filters-years-title">
            <div
              className="newsMobileModal-filters-years-title-text"
              onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
            >
              {t('common.filters.years')}
            </div>
            {isOpenedSection(FILTERS_SECTION.YEAR) ? (
              <CaretUpGreyIcon
                size={16}
                className="newsMobileModal-filters-years-title-caret"
                ariaLabel="Collapse"
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="newsMobileModal-filters-years-title-caret"
                ariaLabel="Expand"
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              />
            )}
          </div>
          <div
            className={`newsMobileModal-filters-years-list ${isOpenedSection(FILTERS_SECTION.YEAR) && 'newsMobileModal-filters-years-list-opened'}`}
          >
            {filtersYears.map((y, index) => (
              <div key={index} className="newsMobileModal-filters-years-list-choice">
                <div className="newsMobileModal-filters-years-list-choice-checkbox">
                  <Checkbox
                    checked={y.isSelected}
                    onChangeCallback={(): void => onSelectYear(y.year)}
                  />
                </div>
                <span
                  className={`newsMobileModal-filters-years-list-choice-label ${y.isSelected && 'newsMobileModal-filters-years-list-choice-label-selected'}`}
                  onClick={(): void => onSelectYear(y.year)}
                >
                  {y.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="newsMobileModal-submit">
        <Button
          text={t('common.filters.applyFilters')}
          onClickCallback={(): void => onApplyFilters()}
        />
      </div>
    </div>
  );
}
