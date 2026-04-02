'use client';

import { useState, useEffect, useCallback } from 'react';
import { TFunction } from 'i18next';
import { AvailableLanguage } from '@/utils/i18n';
import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import FocusTrap from 'focus-trap-react';
import './SearchResultsMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';
import { useMobileModal } from '@/hooks/useMobileModal';
import { useFilterSections } from '@/hooks/useFilterSections';

enum FILTERS_SECTION {
  TYPE = 'type',
  YEAR = 'year',
  VOLUME = 'volume',
  SECTION = 'section',
  AUTHOR = 'author',
}

type SearchResultsTypeFilter = 'type' | 'year' | 'volume' | 'section' | 'author';

interface ISearchResultsFilter {
  type: SearchResultsTypeFilter;
  value: string | number;
  label?: string | number;
  labelPath?: string;
  translatedLabel?: Record<AvailableLanguage, string>;
}

interface ISearchResultsTypeSelection {
  labelPath: string;
  value: string;
  count: number;
  isChecked: boolean;
}

interface ISearchResultsYearSelection {
  year: number;
  count: number;
  isChecked: boolean;
}

interface ISearchResultsVolumeSelection {
  id: number;
  label: Record<AvailableLanguage, string>;
  isChecked: boolean;
}

interface ISearchResultsSectionSelection {
  id: number;
  label: Record<AvailableLanguage, string>;
  isChecked: boolean;
}

interface ISearchResultsAuthorSelection {
  fullname: string;
  count: number;
  isChecked: boolean;
}

interface ISearchResultsMobileModalProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  initialTypes: ISearchResultsTypeSelection[];
  onUpdateTypesCallback: (types: ISearchResultsTypeSelection[]) => void;
  initialYears: ISearchResultsYearSelection[];
  onUpdateYearsCallback: (years: ISearchResultsYearSelection[]) => void;
  initialVolumes: ISearchResultsVolumeSelection[];
  onUpdateVolumesCallback: (volumes: ISearchResultsVolumeSelection[]) => void;
  initialSections: ISearchResultsSectionSelection[];
  onUpdateSectionsCallback: (sections: ISearchResultsSectionSelection[]) => void;
  initialAuthors: ISearchResultsAuthorSelection[];
  onUpdateAuthorsCallback: (authors: ISearchResultsAuthorSelection[]) => void;
  onCloseCallback: () => void;
}

interface IFilterSectionProps {
  id: string;
  title: string;
  baseClass: string;
  isOpened: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({
  id,
  title,
  baseClass,
  isOpened,
  onToggle,
  children,
}: IFilterSectionProps): React.JSX.Element {
  return (
    <div className={baseClass}>
      <button
        type="button"
        className={`${baseClass}-title`}
        onClick={onToggle}
        aria-expanded={isOpened}
        aria-controls={id}
      >
        <span className={`${baseClass}-title-text`}>{title}</span>
        {isOpened ? (
          <CaretUpGreyIcon size={16} className={`${baseClass}-title-caret`} />
        ) : (
          <CaretDownGreyIcon size={16} className={`${baseClass}-title-caret`} />
        )}
      </button>
      <div
        id={id}
        className={`${baseClass}-list ${isOpened ? `${baseClass}-list-opened` : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function SearchResultsMobileModal({
  language,
  t,
  initialTypes,
  onUpdateTypesCallback,
  initialYears,
  onUpdateYearsCallback,
  initialVolumes,
  onUpdateVolumesCallback,
  initialSections,
  onUpdateSectionsCallback,
  initialAuthors,
  onUpdateAuthorsCallback,
  onCloseCallback,
}: ISearchResultsMobileModalProps): React.JSX.Element {
  const [types, setTypes] = useState<ISearchResultsTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<ISearchResultsYearSelection[]>(initialYears);
  const [volumes, setVolumes] = useState<ISearchResultsVolumeSelection[]>(initialVolumes);
  const [sections, setSections] = useState<ISearchResultsSectionSelection[]>(initialSections);
  const [authors, setAuthors] = useState<ISearchResultsAuthorSelection[]>(initialAuthors);
  const [taggedFilters, setTaggedFilters] = useState<ISearchResultsFilter[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev => prev.map(t => ({ ...t, isChecked: false })));
    setYears(prev => prev.map(y => ({ ...y, isChecked: false })));
    setVolumes(prev => prev.map(v => ({ ...v, isChecked: false })));
    setSections(prev => prev.map(s => ({ ...s, isChecked: false })));
    setAuthors(prev => prev.map(a => ({ ...a, isChecked: false })));
    setTaggedFilters([]);
  }, []);

  const { modalRef, onClose, closeModal } = useMobileModal(onCloseCallback, {
    onBeforeClose: clearTaggedFilters,
    lockBodyScroll: true,
  });

  const { toggle: toggleSection, isOpened: isOpenedSection } = useFilterSections([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
    { key: FILTERS_SECTION.VOLUME, isOpened: false },
    { key: FILTERS_SECTION.SECTION, isOpened: false },
    { key: FILTERS_SECTION.AUTHOR, isOpened: false },
  ]);

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: ISearchResultsFilter[] = [];
    types.filter(t => t.isChecked).forEach(t => {
      initFilters.push({ type: 'type', value: t.value, labelPath: t.labelPath });
    });
    years.filter(y => y.isChecked).forEach(y => {
      initFilters.push({ type: 'year', value: y.year, label: y.year });
    });
    volumes.filter(v => v.isChecked).forEach(v => {
      initFilters.push({ type: 'volume', value: v.id, translatedLabel: v.label });
    });
    sections.filter(s => s.isChecked).forEach(s => {
      initFilters.push({ type: 'section', value: s.id, translatedLabel: s.label });
    });
    authors.filter(a => a.isChecked).forEach(a => {
      initFilters.push({ type: 'author', value: a.fullname, label: a.fullname });
    });
    setTaggedFilters(initFilters);
  }, [types, years, volumes, sections, authors]);

  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

  const onCheckType = (value: string): void => {
    setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: !t.isChecked } : t)));
  };

  const onCheckYear = (value: number): void => {
    setYears(prev => prev.map(y => (y.year === value ? { ...y, isChecked: !y.isChecked } : y)));
  };

  const onCheckVolume = (id: number): void => {
    setVolumes(prev => prev.map(v => (v.id === id ? { ...v, isChecked: !v.isChecked } : v)));
  };

  const onCheckSection = (id: number): void => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, isChecked: !s.isChecked } : s)));
  };

  const onCheckAuthor = (fullname: string): void => {
    setAuthors(prev =>
      prev.map(a => (a.fullname === fullname ? { ...a, isChecked: !a.isChecked } : a))
    );
  };

  const onCloseTaggedFilter = (type: SearchResultsTypeFilter, value: string | number) => {
    if (type === 'type') setTypes(prev => prev.map(t => (t.value === value ? { ...t, isChecked: false } : t)));
    else if (type === 'year') setYears(prev => prev.map(y => (y.year === value ? { ...y, isChecked: false } : y)));
    else if (type === 'volume') setVolumes(prev => prev.map(v => (v.id === value ? { ...v, isChecked: false } : v)));
    else if (type === 'section') setSections(prev => prev.map(s => (s.id === value ? { ...s, isChecked: false } : s)));
    else if (type === 'author') setAuthors(prev => prev.map(a => (a.fullname === value ? { ...a, isChecked: false } : a)));
  };

  const onApplyFilters = (): void => {
    onUpdateTypesCallback(types);
    onUpdateYearsCallback(years);
    onUpdateVolumesCallback(volumes);
    onUpdateSectionsCallback(sections);
    onUpdateAuthorsCallback(authors);

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
        className="searchResultsMobileModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <LiveRegion message={announcement} />
        <div className="searchResultsMobileModal-title">
          <h2 id="modal-title" className="searchResultsMobileModal-title-text">
            {t('common.filters.filter')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="searchResultsMobileModal-title-close"
            aria-label={t('common.close')}
          >
            <CloseBlackIcon size={24} />
          </button>
        </div>
        {taggedFilters.length > 0 && (
          <div className="searchResultsMobileModal-tags">
            <div className="searchResultsMobileModal-tags-row">
              {taggedFilters.map((filter, index) => (
                <Tag
                  key={index}
                  text={
                    filter.labelPath
                      ? t(filter.labelPath)
                      : filter.translatedLabel
                        ? filter.translatedLabel[language]
                        : filter.label!.toString()
                  }
                  onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
                />
              ))}
            </div>
            <button
              type="button"
              className="searchResultsMobileModal-tags-clear"
              onClick={clearTaggedFilters}
            >
              {t('common.filters.clearAll')}
            </button>
          </div>
        )}
        <div className="searchResultsMobileModal-filters">
          <FilterSection
            id="filter-section-types"
            title={t('common.filters.documentTypes')}
            baseClass="searchResultsMobileModal-filters-types"
            isOpened={isOpenedSection(FILTERS_SECTION.TYPE)}
            onToggle={(): void => toggleSection(FILTERS_SECTION.TYPE)}
          >
            {types.map((type, index) => (
              <div key={index} className="searchResultsMobileModal-filters-types-list-choice">
                <div className="searchResultsMobileModal-filters-types-list-choice-row">
                  <div className="searchResultsMobileModal-filters-types-list-choice-row-checkbox">
                    <Checkbox
                      checked={type.isChecked}
                      onChangeCallback={(): void => onCheckType(type.value)}
                      ariaLabel={t(type.labelPath)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-types-list-choice-row-label ${type.isChecked && 'searchResultsMobileModal-filters-types-list-choice-row-label-checked'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckType(type.value)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckType(type.value))}
                  >
                    {t(type.labelPath)}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-types-list-choice-badge">
                  {type.count}
                </div>
              </div>
            ))}
          </FilterSection>
          <FilterSection
            id="filter-section-years"
            title={t('common.filters.years')}
            baseClass="searchResultsMobileModal-filters-years"
            isOpened={isOpenedSection(FILTERS_SECTION.YEAR)}
            onToggle={(): void => toggleSection(FILTERS_SECTION.YEAR)}
          >
            {years.map((y, index) => (
              <div key={index} className="searchResultsMobileModal-filters-years-list-choice">
                <div className="searchResultsMobileModal-filters-years-list-choice-row">
                  <div className="searchResultsMobileModal-filters-years-list-choice-row-checkbox">
                    <Checkbox
                      checked={y.isChecked}
                      onChangeCallback={(): void => onCheckYear(y.year)}
                      ariaLabel={String(y.year)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-years-list-choice-row-label ${y.isChecked && 'searchResultsMobileModal-filters-years-list-choice-row-label-checked'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckYear(y.year)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckYear(y.year))}
                  >
                    {y.year}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-years-list-choice-badge">
                  {y.count}
                </div>
              </div>
            ))}
          </FilterSection>
          <FilterSection
            id="filter-section-volumes"
            title={t('common.filters.volumes')}
            baseClass="searchResultsMobileModal-filters-volumes"
            isOpened={isOpenedSection(FILTERS_SECTION.VOLUME)}
            onToggle={(): void => toggleSection(FILTERS_SECTION.VOLUME)}
          >
            {volumes.map((volume, index) => (
              <div key={index} className="searchResultsMobileModal-filters-volumes-list-choice">
                <div className="searchResultsMobileModal-filters-volumes-list-choice-row">
                  <div className="searchResultsMobileModal-filters-volumes-list-choice-row-checkbox">
                    <Checkbox
                      checked={volume.isChecked}
                      onChangeCallback={(): void => onCheckVolume(volume.id)}
                      ariaLabel={volume.label[language]}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-volumes-list-choice-row-label ${volume.isChecked && 'searchResultsMobileModal-filters-volumes-list-choice-row-label-checked'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckVolume(volume.id)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckVolume(volume.id))}
                  >
                    {volume.label[language]}
                  </span>
                </div>
              </div>
            ))}
          </FilterSection>
          <FilterSection
            id="filter-section-sections"
            title={t('common.filters.sections')}
            baseClass="searchResultsMobileModal-filters-sections"
            isOpened={isOpenedSection(FILTERS_SECTION.SECTION)}
            onToggle={(): void => toggleSection(FILTERS_SECTION.SECTION)}
          >
            {sections.map((section, index) => (
              <div key={index} className="searchResultsMobileModal-filters-sections-list-choice">
                <div className="searchResultsMobileModal-filters-sections-list-choice-row">
                  <div className="searchResultsMobileModal-filters-sections-list-choice-row-checkbox">
                    <Checkbox
                      checked={section.isChecked}
                      onChangeCallback={(): void => onCheckSection(section.id)}
                      ariaLabel={section.label[language]}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-sections-list-choice-row-label ${section.isChecked && 'searchResultsMobileModal-filters-sections-list-choice-row-label-checked'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckSection(section.id)}
                    onKeyDown={e => handleKeyboardClick(e, (): void => onCheckSection(section.id))}
                  >
                    {section.label[language]}
                  </span>
                </div>
              </div>
            ))}
          </FilterSection>
          <FilterSection
            id="filter-section-authors"
            title={t('common.filters.authors')}
            baseClass="searchResultsMobileModal-filters-authors"
            isOpened={isOpenedSection(FILTERS_SECTION.AUTHOR)}
            onToggle={(): void => toggleSection(FILTERS_SECTION.AUTHOR)}
          >
            {authors.map((author, index) => (
              <div key={index} className="searchResultsMobileModal-filters-authors-list-choice">
                <div className="searchResultsMobileModal-filters-authors-list-choice-row">
                  <div className="searchResultsMobileModal-filters-authors-list-choice-row-checkbox">
                    <Checkbox
                      checked={author.isChecked}
                      onChangeCallback={(): void => onCheckAuthor(author.fullname)}
                      ariaLabel={author.fullname}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-authors-list-choice-row-label ${author.isChecked && 'searchResultsMobileModal-filters-authors-list-choice-row-label-checked'}`}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => onCheckAuthor(author.fullname)}
                    onKeyDown={e =>
                      handleKeyboardClick(e, (): void => onCheckAuthor(author.fullname))
                    }
                  >
                    {author.fullname}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-authors-list-choice-badge">
                  {author.count}
                </div>
              </div>
            ))}
          </FilterSection>
        </div>
        <div className="searchResultsMobileModal-submit">
          <Button
            text={t('common.filters.applyFilters')}
            onClickCallback={(): void => onApplyFilters()}
          />
        </div>
      </div>
    </FocusTrap>
  );
}
