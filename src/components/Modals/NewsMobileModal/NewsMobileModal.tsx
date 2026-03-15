'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useCallback } from 'react';
import { TFunction } from 'i18next';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import './NewsMobileModal.scss';
import FocusTrap from 'focus-trap-react';
import { handleKeyboardClick } from '@/utils/keyboard';
import { useMobileModal } from '@/hooks/useMobileModal';
import { useFilterSections } from '@/hooks/useFilterSections';

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
  const [filtersYears, setFiltersYears] = useState<INewsYearSelection[]>(years);

  const clearYears = useCallback(() => setFiltersYears([]), []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearYears,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.YEAR, isOpened: true },
  ]);

  const onSelectYear = (year: number): void => {
    setFiltersYears(prev =>
      prev.map(y => (y.year === year ? { ...y, isSelected: !y.isSelected } : y))
    );
  };

  const onApplyFilters = (): void => {
    onUpdateYearsCallback(filtersYears);
    closeModal();
  };

  return (
    <FocusTrap>
      <div
        className="newsMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-modal-title"
      >
        <div className="newsMobileModal-title">
          <h2 id="news-modal-title" className="newsMobileModal-title-text">
            {t('common.filters.filter')}
          </h2>
          <CloseBlackIcon
            size={24}
            className="newsMobileModal-title-close"
            ariaLabel="Close"
            onClick={onClose}
            onKeyDown={e => handleKeyboardClick(e, onClose)}
            role="button"
            tabIndex={0}
          />
        </div>
        <div className="newsMobileModal-filters">
          <div className="newsMobileModal-filters-years">
            <div className="newsMobileModal-filters-years-title">
              <div
                className="newsMobileModal-filters-years-title-text"
                role="button"
                tabIndex={0}
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
                onKeyDown={e => handleKeyboardClick(e, () => toggleSection(FILTERS_SECTION.YEAR))}
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
                      ariaLabel={String(y.year)}
                    />
                  </div>
                  <span
                    className={`newsMobileModal-filters-years-list-choice-label ${y.isSelected && 'newsMobileModal-filters-years-list-choice-label-selected'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onSelectYear(y.year)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onSelectYear(y.year))}
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
    </FocusTrap>
  );
}
