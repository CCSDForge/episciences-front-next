'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';
import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import './VolumesMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

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
  const dispatch = useAppDispatch();

  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);

  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
  ]);

  const [types, setTypes] = useState<IVolumesTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<IVolumesYearSelection[]>(initialYears);
  const [taggedFilters, setTaggedFilters] = useState<IVolumesFilter[]>([]);

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
        return { ...y, isSelected: !y.isSelected };
      }

      return { ...y };
    });

    setYears(updatedYears);
  };

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: IVolumesFilter[] = [];

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
      .filter(y => y.isSelected)
      .forEach(y => {
        initFilters.push({
          type: 'year',
          value: y.year,
          label: y.year,
        });
      });

    setTaggedFilters(initFilters);
  }, [types, years]);

  const onCloseTaggedFilter = (type: VolumesTypeFilter, value: string | number) => {
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
          return { ...y, isSelected: false };
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
        return { ...y, isSelected: false };
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
    <div className="volumesMobileModal" ref={modalRef}>
      <div className="title">
        <div>{t('common.filters.filter')}</div>
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
            onKeyDown={(e) => handleKeyboardClick(e, clearTaggedFilters)}
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
              onKeyDown={(e) => handleKeyboardClick(e, (): void => toggleSection(FILTERS_SECTION.TYPE))}
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
                  onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckType(type.value))}
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
              onKeyDown={(e) => handleKeyboardClick(e, (): void => toggleSection(FILTERS_SECTION.YEAR))}
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
                  onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckYear(y.year))}
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
