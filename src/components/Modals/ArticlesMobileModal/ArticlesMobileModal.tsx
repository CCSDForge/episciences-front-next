'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useCallback, useMemo } from 'react';
import { TFunction } from 'i18next';
import Button from '@/components/Button/Button';
import FilterChoiceList, { IFilterChoice } from '@/components/FilterChoiceList/FilterChoiceList';
import Tag from '@/components/Tag/Tag';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import {
  IArticleFiltersSelection,
  IArticleTypeSelection,
  IArticleYearSelection,
} from '@/components/Sidebars/ArticlesSidebar/ArticlesSidebar';
import { FocusTrap } from 'focus-trap-react';
import './ArticlesMobileModal.scss';
import { useMobileModal } from '@/hooks/useMobileModal';
import { useFilterSections } from '@/hooks/useFilterSections';

enum FILTERS_SECTION {
  TYPE = 'type',
  YEAR = 'year',
}

type ArticlesTypeFilter = 'type' | 'year';

interface IArticlesFilter {
  type: ArticlesTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

interface IArticlesMobileModalProps {
  t: TFunction<'translation', undefined>;
  initialTypes: IArticleTypeSelection[];
  initialYears: IArticleYearSelection[];
  /** Called once with the whole selection when the filters are applied. */
  onApplyFiltersCallback: (selection: IArticleFiltersSelection) => void;
  onCloseCallback: () => void;
}

interface IModalFacetProps<V extends string | number> {
  /** BEM block of the facet, e.g. `articlesMobileModal-filters-types`. */
  readonly base: string;
  readonly listId: string;
  readonly title: string;
  readonly isOpened: boolean;
  readonly onToggleOpened: () => void;
  readonly choices: IFilterChoice<V>[];
  readonly onToggle: (value: V) => void;
}

/** Collapsible facet: a title button expanding a list of checkbox choices. */
function ModalFacet<V extends string | number>({
  base,
  listId,
  title,
  isOpened,
  onToggleOpened,
  choices,
  onToggle,
}: IModalFacetProps<V>): React.JSX.Element {
  const CaretIcon = isOpened ? CaretUpGreyIcon : CaretDownGreyIcon;
  return (
    <div className={base}>
      <button
        type="button"
        className={`${base}-title`}
        onClick={onToggleOpened}
        aria-expanded={isOpened}
        aria-controls={listId}
      >
        <span className={`${base}-title-text`}>{title}</span>
        <CaretIcon size={16} className={`${base}-title-caret`} />
      </button>
      <FilterChoiceList
        id={listId}
        base={`${base}-list`}
        className={isOpened ? `${base}-list ${base}-list-opened` : `${base}-list`}
        choices={choices}
        onToggle={onToggle}
      />
    </div>
  );
}

export default function ArticlesMobileModal({
  t,
  initialTypes,
  initialYears,
  onApplyFiltersCallback,
  onCloseCallback,
}: Readonly<IArticlesMobileModalProps>): React.JSX.Element {
  const [types, setTypes] = useState<IArticleTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<IArticleYearSelection[]>(initialYears);
  const [announcement, setAnnouncement] = useState('');

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev => prev.map(t => ({ ...t, isChecked: false })));
    setYears(prev => prev.map(y => ({ ...y, isChecked: false })));
  }, []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearTaggedFilters,
    lockBodyScroll: true,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
  ]);

  // Pure projection of the current selections: derived during render, not in an effect.
  const taggedFilters = useMemo<IArticlesFilter[]>(
    () => [
      ...types
        .filter(t => t.isChecked)
        .map(t => ({ type: 'type' as const, value: t.value, labelPath: t.labelPath })),
      ...years
        .filter(y => y.isChecked)
        .map(y => ({ type: 'year' as const, value: y.year, label: y.year })),
    ],
    [types, years]
  );

  const onCheckType = (value: string): void => {
    setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: !t.isChecked } : t)));
  };

  const onCheckYear = (value: number): void => {
    setYears(prev => prev.map(y => (y.year === value ? { ...y, isChecked: !y.isChecked } : y)));
  };

  const onCloseTaggedFilter = (type: ArticlesTypeFilter, value: string | number) => {
    if (type === 'type') {
      setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: false } : t)));
    } else if (type === 'year') {
      setYears(prev => prev.map(y => (y.year === value ? { ...y, isChecked: false } : y)));
    }
  };

  const onApplyFilters = (): void => {
    onApplyFiltersCallback({ types, years });

    const filterCount = taggedFilters.length;
    if (filterCount > 0) {
      setAnnouncement(t('common.filters.filtersActive', { count: filterCount }));
    } else {
      setAnnouncement(t('common.filters.noFilters'));
    }

    closeModal();
  };

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
              {taggedFilters.map(filter => (
                <Tag
                  key={`${filter.type}-${filter.value}`}
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
          {types.length > 0 && (
            <ModalFacet
              base="articlesMobileModal-filters-types"
              listId="filter-section-type"
              title={t('common.filters.documentTypes')}
              isOpened={isOpenedSection(FILTERS_SECTION.TYPE)}
              onToggleOpened={(): void => toggleSection(FILTERS_SECTION.TYPE)}
              choices={types.map(type => ({
                value: type.value,
                label: t(type.labelPath),
                isChecked: type.isChecked,
              }))}
              onToggle={onCheckType}
            />
          )}
          {years.length > 0 && (
            <ModalFacet
              base="articlesMobileModal-filters-years"
              listId="filter-section-year"
              title={t('common.filters.years')}
              isOpened={isOpenedSection(FILTERS_SECTION.YEAR)}
              onToggleOpened={(): void => toggleSection(FILTERS_SECTION.YEAR)}
              choices={years.map(y => ({
                value: y.year,
                label: String(y.year),
                isChecked: y.isChecked,
              }))}
              onToggle={onCheckYear}
            />
          )}
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
