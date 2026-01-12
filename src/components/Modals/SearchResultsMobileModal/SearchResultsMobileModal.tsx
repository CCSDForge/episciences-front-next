'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import { AvailableLanguage } from '@/utils/i18n';
import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import FocusTrap from 'focus-trap-react';
import './SearchResultsMobileModal.scss';

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
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([
    { key: FILTERS_SECTION.TYPE, isOpened: false },
    { key: FILTERS_SECTION.YEAR, isOpened: false },
    { key: FILTERS_SECTION.VOLUME, isOpened: false },
    { key: FILTERS_SECTION.SECTION, isOpened: false },
    { key: FILTERS_SECTION.AUTHOR, isOpened: false },
  ]);

  const [types, setTypes] = useState<ISearchResultsTypeSelection[]>(initialTypes);
  const [years, setYears] = useState<ISearchResultsYearSelection[]>(initialYears);
  const [volumes, setVolumes] = useState<ISearchResultsVolumeSelection[]>(initialVolumes);
  const [sections, setSections] = useState<ISearchResultsSectionSelection[]>(initialSections);
  const [authors, setAuthors] = useState<ISearchResultsAuthorSelection[]>(initialAuthors);
  const [taggedFilters, setTaggedFilters] = useState<ISearchResultsFilter[]>([]);
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

  const onCheckVolume = (id: number): void => {
    const updatedVolumes = volumes.map(v => {
      if (v.id === id) {
        return { ...v, isChecked: !v.isChecked };
      }
      return { ...v };
    });

    setVolumes(updatedVolumes);
  };

  const onCheckSection = (id: number): void => {
    const updatedSections = sections.map(s => {
      if (s.id === id) {
        return { ...s, isChecked: !s.isChecked };
      }
      return { ...s };
    });

    setSections(updatedSections);
  };

  const onCheckAuthor = (fullname: string): void => {
    const updatedAuthors = authors.map(a => {
      if (a.fullname === fullname) {
        return { ...a, isChecked: !a.isChecked };
      }
      return { ...a };
    });

    setAuthors(updatedAuthors);
  };

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: ISearchResultsFilter[] = [];

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

    volumes
      .filter(v => v.isChecked)
      .forEach(v => {
        initFilters.push({
          type: 'volume',
          value: v.id,
          translatedLabel: v.label,
        });
      });

    sections
      .filter(s => s.isChecked)
      .forEach(s => {
        initFilters.push({
          type: 'section',
          value: s.id,
          translatedLabel: s.label,
        });
      });

    authors
      .filter(a => a.isChecked)
      .forEach(a => {
        initFilters.push({
          type: 'author',
          value: a.fullname,
          label: a.fullname,
        });
      });

    setTaggedFilters(initFilters);
  }, [types, years, volumes, sections, authors]);

  const onCloseTaggedFilter = (type: SearchResultsTypeFilter, value: string | number) => {
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
    } else if (type === 'volume') {
      const updatedVolumes = volumes.map(v => {
        if (v.id === value) {
          return { ...v, isChecked: false };
        }
        return v;
      });

      setVolumes(updatedVolumes);
    } else if (type === 'section') {
      const updatedSections = sections.map(s => {
        if (s.id === value) {
          return { ...s, isChecked: false };
        }
        return s;
      });

      setSections(updatedSections);
    } else if (type === 'author') {
      const updatedAuthors = authors.map(a => {
        if (a.fullname === value) {
          return { ...a, isChecked: false };
        }
        return a;
      });

      setAuthors(updatedAuthors);
    }
  };

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev => prev.map(t => ({ ...t, isChecked: false })));
    setYears(prev => prev.map(y => ({ ...y, isChecked: false })));
    setVolumes(prev => prev.map(v => ({ ...v, isChecked: false })));
    setSections(prev => prev.map(s => ({ ...s, isChecked: false })));
    setAuthors(prev => prev.map(a => ({ ...a, isChecked: false })));
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
    onUpdateVolumesCallback(volumes);
    onUpdateSectionsCallback(sections);
    onUpdateAuthorsCallback(authors);

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
        <div className="searchResultsMobileModal-filters-types">
          <button
            type="button"
            className="searchResultsMobileModal-filters-types-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.TYPE)}
            aria-controls="filter-section-types"
          >
            <span className="searchResultsMobileModal-filters-types-title-text">
              {t('common.filters.documentTypes')}
            </span>
            {isOpenedSection(FILTERS_SECTION.TYPE) ? (
              <CaretUpGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-types-title-caret"
                             />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-types-title-caret"
                             />
            )}
          </button>
          <div
            id="filter-section-types"
            className={`searchResultsMobileModal-filters-types-list ${isOpenedSection(FILTERS_SECTION.TYPE) && 'searchResultsMobileModal-filters-types-list-opened'}`}
          >
            {types.map((type, index) => (
              <div key={index} className="searchResultsMobileModal-filters-types-list-choice">
                <div className="searchResultsMobileModal-filters-types-list-choice-row">
                  <div className="searchResultsMobileModal-filters-types-list-choice-row-checkbox">
                    <Checkbox
                      checked={type.isChecked}
                      onChangeCallback={(): void => onCheckType(type.value)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-types-list-choice-row-label ${type.isChecked && 'searchResultsMobileModal-filters-types-list-choice-row-label-checked'}`}
                    onClick={(): void => onCheckType(type.value)}
                  >
                    {t(type.labelPath)}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-types-list-choice-badge">
                  {type.count}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="searchResultsMobileModal-filters-years">
          <button
            type="button"
            className="searchResultsMobileModal-filters-years-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.YEAR)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.YEAR)}
            aria-controls="filter-section-years"
          >
            <span className="searchResultsMobileModal-filters-years-title-text">
              {t('common.filters.years')}
            </span>
            {isOpenedSection(FILTERS_SECTION.YEAR) ? (
              <CaretUpGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-years-title-caret"
                             />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-years-title-caret"
                             />
            )}
          </button>
          <div
            id="filter-section-years"
            className={`searchResultsMobileModal-filters-years-list ${isOpenedSection(FILTERS_SECTION.YEAR) && 'searchResultsMobileModal-filters-years-list-opened'}`}
          >
            {years.map((y, index) => (
              <div key={index} className="searchResultsMobileModal-filters-years-list-choice">
                <div className="searchResultsMobileModal-filters-years-list-choice-row">
                  <div className="searchResultsMobileModal-filters-years-list-choice-row-checkbox">
                    <Checkbox
                      checked={y.isChecked}
                      onChangeCallback={(): void => onCheckYear(y.year)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-years-list-choice-row-label ${y.isChecked && 'searchResultsMobileModal-filters-years-list-choice-row-label-checked'}`}
                    onClick={(): void => onCheckYear(y.year)}
                  >
                    {y.year}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-years-list-choice-badge">
                  {y.count}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="searchResultsMobileModal-filters-volumes">
          <button
            type="button"
            className="searchResultsMobileModal-filters-volumes-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.VOLUME)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.VOLUME)}
            aria-controls="filter-section-volumes"
          >
            <span className="searchResultsMobileModal-filters-volumes-title-text">
              {t('common.filters.volumes')}
            </span>
            {isOpenedSection(FILTERS_SECTION.VOLUME) ? (
              <CaretUpGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-volumes-title-caret"
                             />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-volumes-title-caret"
                             />
            )}
          </button>
          <div
            id="filter-section-volumes"
            className={`searchResultsMobileModal-filters-volumes-list ${isOpenedSection(FILTERS_SECTION.VOLUME) && 'searchResultsMobileModal-filters-volumes-list-opened'}`}
          >
            {volumes.map((volume, index) => (
              <div key={index} className="searchResultsMobileModal-filters-volumes-list-choice">
                <div className="searchResultsMobileModal-filters-volumes-list-choice-row">
                  <div className="searchResultsMobileModal-filters-volumes-list-choice-row-checkbox">
                    <Checkbox
                      checked={volume.isChecked}
                      onChangeCallback={(): void => onCheckVolume(volume.id)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-volumes-list-choice-row-label ${volume.isChecked && 'searchResultsMobileModal-filters-volumes-list-choice-row-label-checked'}`}
                    onClick={(): void => onCheckVolume(volume.id)}
                  >
                    {volume.label[language]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="searchResultsMobileModal-filters-sections">
          <button
            type="button"
            className="searchResultsMobileModal-filters-sections-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.SECTION)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.SECTION)}
            aria-controls="filter-section-sections"
          >
            <span className="searchResultsMobileModal-filters-sections-title-text">
              {t('common.filters.sections')}
            </span>
            {isOpenedSection(FILTERS_SECTION.SECTION) ? (
              <CaretUpGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-sections-title-caret"
                             />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-sections-title-caret"
                             />
            )}
          </button>
          <div
            id="filter-section-sections"
            className={`searchResultsMobileModal-filters-sections-list ${isOpenedSection(FILTERS_SECTION.SECTION) && 'searchResultsMobileModal-filters-sections-list-opened'}`}
          >
            {sections.map((section, index) => (
              <div key={index} className="searchResultsMobileModal-filters-sections-list-choice">
                <div className="searchResultsMobileModal-filters-sections-list-choice-row">
                  <div className="searchResultsMobileModal-filters-sections-list-choice-row-checkbox">
                    <Checkbox
                      checked={section.isChecked}
                      onChangeCallback={(): void => onCheckSection(section.id)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-sections-list-choice-row-label ${section.isChecked && 'searchResultsMobileModal-filters-sections-list-choice-row-label-checked'}`}
                    onClick={(): void => onCheckSection(section.id)}
                  >
                    {section.label[language]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="searchResultsMobileModal-filters-authors">
          <button
            type="button"
            className="searchResultsMobileModal-filters-authors-title"
            onClick={(): void => toggleSection(FILTERS_SECTION.AUTHOR)}
            aria-expanded={isOpenedSection(FILTERS_SECTION.AUTHOR)}
            aria-controls="filter-section-authors"
          >
            <span className="searchResultsMobileModal-filters-authors-title-text">
              {t('common.filters.authors')}
            </span>
            {isOpenedSection(FILTERS_SECTION.AUTHOR) ? (
              <CaretUpGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-authors-title-caret"
                             />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="searchResultsMobileModal-filters-authors-title-caret"
                             />
            )}
          </button>
          <div
            id="filter-section-authors"
            className={`searchResultsMobileModal-filters-authors-list ${isOpenedSection(FILTERS_SECTION.AUTHOR) && 'searchResultsMobileModal-filters-authors-list-opened'}`}
          >
            {authors.map((author, index) => (
              <div key={index} className="searchResultsMobileModal-filters-authors-list-choice">
                <div className="searchResultsMobileModal-filters-authors-list-choice-row">
                  <div className="searchResultsMobileModal-filters-authors-list-choice-row-checkbox">
                    <Checkbox
                      checked={author.isChecked}
                      onChangeCallback={(): void => onCheckAuthor(author.fullname)}
                    />
                  </div>
                  <span
                    className={`searchResultsMobileModal-filters-authors-list-choice-row-label ${author.isChecked && 'searchResultsMobileModal-filters-authors-list-choice-row-label-checked'}`}
                    onClick={(): void => onCheckAuthor(author.fullname)}
                  >
                    {author.fullname}
                  </span>
                </div>
                <div className="searchResultsMobileModal-filters-authors-list-choice-badge">
                  {author.count}
                </div>
              </div>
            ))}
          </div>
        </div>
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
