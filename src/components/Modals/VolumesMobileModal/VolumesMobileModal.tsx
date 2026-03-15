'use client';

import { useState, useEffect, useCallback } from 'react';
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
  t: TFunction<'translation', undefined>;
  initialTypes: IVolumesTypeSelection[];
  onUpdateTypesCallback: (types: IVolumesTypeSelection[]) => void;
  initialYears: IVolumesYearSelection[];
  onUpdateYearsCallback: (years: IVolumesYearSelection[]) => void;
  onCloseCallback: () => void;
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
  const [taggedFilters, setTaggedFilters] = useState<IVolumesFilter[]>([]);

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev => prev.map(t => ({ ...t, isChecked: false })));
    setYears(prev => prev.map(y => ({ ...y, isSelected: false })));
    setTaggedFilters([]);
  }, []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearTaggedFilters,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
  ]);

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: IVolumesFilter[] = [];
    types.filter(t => t.isChecked).forEach(t => {
      initFilters.push({ type: 'type', value: t.value, labelPath: t.labelPath });
    });
    years.filter(y => y.isSelected).forEach(y => {
      initFilters.push({ type: 'year', value: y.year, label: y.year });
    });
    setTaggedFilters(initFilters);
  }, [types, years]);

  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

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
        <div className="title">
          <h2 id="volumes-modal-title" className="title-text">
            {t('common.filters.filter')}
          </h2>
          <CloseBlackIcon size={24} className="titleClose" ariaLabel="Close" onClick={onClose} />
        </div>
        {taggedFilters.length > 0 && (
          <div className="tags">
            <div className="tagsRow">
              {taggedFilters.map((filter, index) => (
                <Tag
                  key={index}
                  text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                  onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
                />
              ))}
            </div>
            <div
              className="tagsClear"
              role="button"
              tabIndex={0}
              onClick={clearTaggedFilters}
              onKeyDown={e => handleKeyboardClick(e, clearTaggedFilters)}
            >
              {t('common.filters.clearAll')}
            </div>
          </div>
        )}
        <div className="filters">
          <div className="filtersTypes">
            <div className="filtersTypesTitle">
              <div
                role="button"
                tabIndex={0}
                onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
                onKeyDown={e =>
                  handleKeyboardClick(e, (): void => toggleSection(FILTERS_SECTION.TYPE))
                }
              >
                {t('common.filters.documentTypes')}
              </div>
              {isOpenedSection(FILTERS_SECTION.TYPE) ? (
                <CaretUpGreyIcon
                  size={16}
                  className="filtersTypesTitleCaret"
                  ariaLabel="Collapse"
                  onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
                />
              ) : (
                <CaretDownGreyIcon
                  size={16}
                  className="filtersTypesTitleCaret"
                  ariaLabel="Expand"
                  onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
                />
              )}
            </div>
            <div
              className={`filtersTypesList ${isOpenedSection(FILTERS_SECTION.TYPE) ? 'filtersTypesListOpened' : ''}`}
            >
              {types.map((type, index) => (
                <div key={index} className="filtersTypesListChoice">
                  <div>
                    <Checkbox
                      checked={type.isChecked}
                      onChangeCallback={(): void => onCheckType(type.value)}
                      ariaLabel={t(`common.volumeTypes.${type.value}`)}
                    />
                  </div>
                  <span
                    className={`filtersTypesListChoiceLabel ${type.isChecked ? 'filtersTypesListChoiceLabelChecked' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckType(type.value)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckType(type.value))}
                  >
                    {t(`common.volumeTypes.${type.value}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
              {years.map((y, index) => (
                <div key={index} className="filtersYearsListChoice">
                  <div>
                    <Checkbox
                      checked={y.isSelected}
                      onChangeCallback={(): void => onCheckYear(y.year)}
                      ariaLabel={String(y.year)}
                    />
                  </div>
                  <span
                    className={`filtersYearsListChoiceLabel ${y.isSelected ? 'filtersYearsListChoiceLabelChecked' : ''}`}
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
