'use client';

import { CloseRedIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import './StatisticsMobileModal.scss';

enum FILTERS_SECTION {
  YEAR = 'year',
}

interface IStatisticYearSelection {
  year: number;
  isChecked: boolean;
}

interface IStatisticsMobileModalProps {
  t: TFunction<'translation', undefined>;
  years: IStatisticYearSelection[];
  onUpdateYearsCallback: (years: IStatisticYearSelection[]) => void;
  onCloseCallback: () => void;
}

export default function StatisticsMobileModal({
  t,
  years,
  onUpdateYearsCallback,
  onCloseCallback,
}: IStatisticsMobileModalProps): React.JSX.Element {
  const dispatch = useAppDispatch();

  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);

  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([{ key: FILTERS_SECTION.YEAR, isOpened: true }]);

  const [filtersYears, setFiltersYears] = useState<IStatisticYearSelection[]>(years);

  const onCheckYear = (year: number): void => {
    const updatedYears = filtersYears.map(y => {
      if (y.year === year) {
        return { ...y, isChecked: !y.isChecked };
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
    <div className="statisticsMobileModal" ref={modalRef}>
      <div className="title">
        <div>{t('common.filters.filter')}</div>
        <CloseRedIcon size={24} className="titleClose" ariaLabel="Close" onClick={onClose} />
      </div>
      <div className="filters">
        <div className="filtersYears">
          <div className="filtersYearsTitle">
            <div onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}>
              {t('common.filters.years')}
            </div>
            {isOpenedSection(FILTERS_SECTION.YEAR) ? (
              <CaretUpGreyIcon
                size={16}
                className="filtersYearsTitleCaret"
                ariaLabel="Collapse"
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="filtersYearsTitleCaret"
                ariaLabel="Expand"
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              />
            )}
          </div>
          <div
            className={`filtersYearsList ${isOpenedSection(FILTERS_SECTION.YEAR) ? 'filtersYearsListOpened' : ''}`}
          >
            {filtersYears.map((y, index) => (
              <div key={index} className="filtersYearsListChoice">
                <div>
                  <Checkbox
                    checked={y.isChecked}
                    onChangeCallback={(): void => onCheckYear(y.year)}
                  />
                </div>
                <span
                  className={`filtersYearsListChoiceLabel ${y.isChecked ? 'filtersYearsListChoiceLabelChecked' : ''}`}
                  onClick={(): void => onCheckYear(y.year)}
                >
                  {y.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="submit">
        <Button
          text={t('common.filters.applyFilters')}
          onClickCallback={(): void => onApplyFilters()}
        />
      </div>
    </div>
  );
}
