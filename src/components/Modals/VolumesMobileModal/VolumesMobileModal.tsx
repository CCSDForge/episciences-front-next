'use client';

import { useState, useCallback, useMemo } from 'react';
import { TFunction } from 'i18next';
import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import './VolumesMobileModal.scss';
import FocusTrap from 'focus-trap-react';
import { handleKeyboardClick } from '@/utils/keyboard';
import { useMobileModal } from '@/hooks/useMobileModal';
import { useFilterSections } from '@/hooks/useFilterSections';

enum FILTERS_SECTION {
  TYPE = 'type',
  YEAR = 'year',
}

type VolumesTypeFilter = 'type' | 'year';

interface IVolumesTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

interface IVolumesYearSelection {
  year: number;
  isSelected: boolean;
}

interface IVolumesFilter {
  type: VolumesTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

interface IVolumesMobileModalProps {
  readonly t: TFunction<'translation', undefined>;
  readonly initialTypes: IVolumesTypeSelection[];
  readonly onUpdateTypesCallback: (types: IVolumesTypeSelection[]) => void;
  readonly initialYears: IVolumesYearSelection[];
  readonly onUpdateYearsCallback: (years: IVolumesYearSelection[]) => void;
  readonly onCloseCallback: () => void;
}

export default function VolumesMobileModal({
  t,
  initialTypes,
  onUpdateTypesCallback,
  initialYears,
  onUpdateYearsCallback,
  onCloseCallback,
}: IVolumesMobileModalProps): React.JSX.Element {
  const [types, setTypes] = useState<IVolumesTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<IVolumesYearSelection[]>(initialYears);
  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev => prev.map(t => ({ ...t, isChecked: false })));
    setYears(prev => prev.map(y => ({ ...y, isSelected: false })));
  }, []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearTaggedFilters,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
  ]);

  // Pure projection of the current selections: derived during render, not in an effect.
  const taggedFilters = useMemo<IVolumesFilter[]>(
    () => [
      ...types
        .filter(t => t.isChecked)
        .map(t => ({ type: 'type' as const, value: t.value, labelPath: t.labelPath })),
      ...years
        .filter(y => y.isSelected)
        .map(y => ({ type: 'year' as const, value: y.year, label: y.year })),
    ],
    [types, years]
  );

  const onCheckType = (value: string): void => {
    setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: !t.isChecked } : t)));
  };

  const onCheckYear = (value: number): void => {
    setYears(prev => prev.map(y => (y.year === value ? { ...y, isSelected: !y.isSelected } : y)));
  };

  const onCloseTaggedFilter = (type: VolumesTypeFilter, value: string | number) => {
    if (type === 'type') {
      setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: false } : t)));
    } else if (type === 'year') {
      setYears(prev => prev.map(y => (y.year === value ? { ...y, isSelected: false } : y)));
    }
  };

  const onApplyFilters = (): void => {
    onUpdateTypesCallback(types);
    onUpdateYearsCallback(years);
    closeModal();
  };

  return (
    <FocusTrap>
      <div
        className="volumesMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="volumes-modal-title"
      >
        <div className="volumesMobileModal-title">
          <h2 id="volumes-modal-title" className="volumesMobileModal-title-text">
            {t('common.filters.filter')}
          </h2>
          <button
            type="button"
            className="volumesMobileModal-title-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseBlackIcon size={24} />
          </button>
        </div>
        {taggedFilters.length > 0 && (
          <div className="volumesMobileModal-tags">
            <div className="volumesMobileModal-tags-row">
              {taggedFilters.map(filter => (
                <Tag
                  key={`${filter.type}-${filter.value}`}
                  text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                  onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
                />
              ))}
            </div>
            <div
              className="volumesMobileModal-tags-clear"
              role="button"
              tabIndex={0}
              onClick={clearTaggedFilters}
              onKeyDown={e => handleKeyboardClick(e, clearTaggedFilters)}
            >
              {t('common.filters.clearAll')}
            </div>
          </div>
        )}
        <div className="volumesMobileModal-filters">
          <div className="volumesMobileModal-filters-types">
            <div className="volumesMobileModal-filters-types-title">
              <button
                type="button"
                aria-expanded={isOpenedSection(FILTERS_SECTION.TYPE)}
                onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
              >
                {t('common.filters.documentTypes')}
              </button>
              {isOpenedSection(FILTERS_SECTION.TYPE) ? (
                <CaretUpGreyIcon
                  size={16}
                  className="volumesMobileModal-filters-types-title-caret"
                  ariaLabel="Collapse"
                  onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
                />
              ) : (
                <CaretDownGreyIcon
                  size={16}
                  className="volumesMobileModal-filters-types-title-caret"
                  ariaLabel="Expand"
                  onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
                />
              )}
            </div>
            <div
              className={`volumesMobileModal-filters-types-list ${isOpenedSection(FILTERS_SECTION.TYPE) ? 'volumesMobileModal-filters-types-list-opened' : ''}`}
            >
              {types.map(type => (
                <div key={type.value} className="volumesMobileModal-filters-types-list-choice">
                  <div>
                    <Checkbox
                      checked={type.isChecked}
                      onChangeCallback={(): void => onCheckType(type.value)}
                      ariaLabel={t(type.labelPath)}
                    />
                  </div>
                  <span
                    className={`volumesMobileModal-filters-types-list-choice-label ${type.isChecked ? 'volumesMobileModal-filters-types-list-choice-label-checked' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckType(type.value)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckType(type.value))}
                  >
                    {t(type.labelPath)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="volumesMobileModal-filters-years">
            <div className="volumesMobileModal-filters-years-title">
              <button
                type="button"
                aria-expanded={isOpenedSection(FILTERS_SECTION.YEAR)}
                onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              >
                {t('common.filters.years')}
              </button>
              {isOpenedSection(FILTERS_SECTION.YEAR) ? (
                <CaretUpGreyIcon
                  size={16}
                  className="volumesMobileModal-filters-years-title-caret"
                  ariaLabel="Collapse"
                  onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
                />
              ) : (
                <CaretDownGreyIcon
                  size={16}
                  className="volumesMobileModal-filters-years-title-caret"
                  ariaLabel="Expand"
                  onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
                />
              )}
            </div>
            <div
              className={`volumesMobileModal-filters-years-list ${isOpenedSection(FILTERS_SECTION.YEAR) ? 'volumesMobileModal-filters-years-list-opened' : ''}`}
            >
              {years.map(y => (
                <div key={y.year} className="volumesMobileModal-filters-years-list-choice">
                  <div>
                    <Checkbox
                      checked={y.isSelected}
                      onChangeCallback={(): void => onCheckYear(y.year)}
                      ariaLabel={String(y.year)}
                    />
                  </div>
                  <span
                    className={`volumesMobileModal-filters-years-list-choice-label ${y.isSelected ? 'volumesMobileModal-filters-years-list-choice-label-checked' : ''}`}
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
        <div className="volumesMobileModal-submit">
          <Button
            text={t('common.filters.applyFilters')}
            onClickCallback={(): void => onApplyFilters()}
          />
        </div>
      </div>
    </FocusTrap>
  );
}
