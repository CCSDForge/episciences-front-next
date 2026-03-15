'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import FocusTrap from 'focus-trap-react';
import { useState, useCallback } from 'react';
import { TFunction } from 'i18next';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import './StatisticsMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';
import { useMobileModal } from '@/hooks/useMobileModal';
import { useFilterSections } from '@/hooks/useFilterSections';

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
  const [filtersYears, setFiltersYears] = useState<IStatisticYearSelection[]>(years);

  const clearYears = useCallback(() => setFiltersYears([]), []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearYears,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.YEAR, isOpened: true },
  ]);

  const onCheckYear = (year: number): void => {
    setFiltersYears(prev =>
      prev.map(y => (y.year === year ? { ...y, isChecked: !y.isChecked } : y))
    );
  };

  const onApplyFilters = (): void => {
    onUpdateYearsCallback(filtersYears);
    closeModal();
  };

  return (
    <FocusTrap>
      <div
        className="statisticsMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="title">
          <div>{t('common.filters.filter')}</div>
          <CloseBlackIcon size={24} className="titleClose" ariaLabel="Close" onClick={onClose} />
        </div>
        <div className="filters">
          <div className="filtersYears">
            <div className="filtersYearsTitle">
              <div
                role="button"
                tabIndex={0}
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
                onKeyDown={e =>
                  handleKeyboardClick(e, (): void => toggleSection(FILTERS_SECTION.YEAR))
                }
              >
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
                      ariaLabel={String(y.year)}
                    />
                  </div>
                  <span
                    className={`filtersYearsListChoiceLabel ${y.isChecked ? 'filtersYearsListChoiceLabelChecked' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckYear(y.year)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckYear(y.year))}
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
    </FocusTrap>
  );
}
