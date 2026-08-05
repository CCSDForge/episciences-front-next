'use client';

import { FilterIcon } from '@/components/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTitle from '@/components/PageTitle/PageTitle';
import { fetchSearchResults } from '@/services/search';

// import filter from '/icons/filter.svg';
import { PATHS } from '@/config/paths';
import { useAppSelector } from '@/hooks/store';
import { FetchedArticle, articleTypes } from '@/utils/article';
import { AvailableLanguage } from '@/utils/i18n';
import { SearchRange } from '@/utils/pagination';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import ArticleCard, { IArticleCard } from '@/components/Cards/ArticleCard/ArticleCard';
import SearchResultsSidebar, {
  ISearchResultTypeSelection,
  ISearchResultYearSelection,
  ISearchResultVolumeSelection,
  ISearchResultSectionSelection,
  ISearchResultAuthorSelection,
} from '@/components/Sidebars/SearchResultsSidebar/SearchResultsSidebar';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import '../articles/Articles.scss';
import { handleKeyboardClick } from '@/utils/keyboard';
import { logger } from '@/lib/logger';

// Lazy load mobile modal
const SearchResultsMobileModal = dynamic(
  () => import('@/components/Modals/SearchResultsMobileModal/SearchResultsMobileModal'),
  { ssr: false, loading: () => null }
);

type SearchResultTypeFilter = 'type' | 'year' | 'volume' | 'section' | 'author';

interface ISearchResultFilter {
  type: SearchResultTypeFilter;
  value: string | number;
  label?: string | number;
  labelPath?: string;
  translatedLabel?: Record<AvailableLanguage, string>;
}

type EnhancedSearchResult = FetchedArticle & {
  openedAbstract: boolean;
};

function buildInitTypes(
  rangeTypes: NonNullable<SearchRange['types']>,
  checkedValues: ReadonlySet<string>
): ISearchResultTypeSelection[] {
  return rangeTypes
    .filter(t => articleTypes.some(at => at.value === t.value))
    .map(t => {
      const matchingType = articleTypes.find(at => at.value === t.value)!;
      return {
        labelPath: matchingType.labelPath,
        value: matchingType.value,
        count: t.count,
        isChecked: checkedValues.has(matchingType.value),
      };
    });
}

function buildInitYears(
  rangeYears: NonNullable<SearchRange['years']>,
  checkedValues: ReadonlySet<number>
): ISearchResultYearSelection[] {
  return rangeYears.map(y => ({
    year: y.value,
    count: y.count,
    isChecked: checkedValues.has(y.value),
  }));
}

function buildInitVolumes(
  rangeVolumes: NonNullable<SearchRange['volumes']>,
  language: AvailableLanguage,
  checkedValues: ReadonlySet<number>
): ISearchResultVolumeSelection[] {
  return (
    rangeVolumes[language]?.map(v => {
      const id = Number.parseInt(Object.keys(v)[0]);
      return {
        id,
        label: {
          en: rangeVolumes.en?.find(vol => Number.parseInt(Object.keys(vol)[0]) === id)?.[id] ?? '',
          fr: rangeVolumes.fr?.find(vol => Number.parseInt(Object.keys(vol)[0]) === id)?.[id] ?? '',
        },
        isChecked: checkedValues.has(id),
      };
    }) ?? []
  );
}

function buildInitSections(
  rangeSections: NonNullable<SearchRange['sections']>,
  language: AvailableLanguage,
  checkedValues: ReadonlySet<number>
): ISearchResultSectionSelection[] {
  return (
    rangeSections[language]?.map(s => {
      const id = Number.parseInt(Object.keys(s)[0]);
      return {
        id,
        label: {
          en:
            rangeSections.en?.find(sec => Number.parseInt(Object.keys(sec)[0]) === id)?.[id] ?? '',
          fr:
            rangeSections.fr?.find(sec => Number.parseInt(Object.keys(sec)[0]) === id)?.[id] ?? '',
        },
        isChecked: checkedValues.has(id),
      };
    }) ?? []
  );
}

function buildInitAuthors(
  rangeAuthors: NonNullable<SearchRange['authors']>,
  checkedValues: ReadonlySet<string>
): ISearchResultAuthorSelection[] {
  return rangeAuthors.map(a => ({
    fullname: a.value,
    count: a.count,
    isChecked: checkedValues.has(a.value),
  }));
}

/** Adds `value` when absent, removes it otherwise, always returning a new Set. */
function toggleInSet<T>(source: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(source);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function checkedValuesOf<T, K>(items: T[], isChecked: (item: T) => boolean, key: (item: T) => K) {
  return new Set(items.filter(isChecked).map(key));
}

interface SearchClientProps {
  readonly initialSearchResults: {
    data: FetchedArticle[];
    totalItems: number;
    range?: SearchRange;
  };
  readonly initialSearch: string;
  readonly initialPage: number;
  readonly lang?: string;
  readonly breadcrumbLabels?: {
    home: string;
    content: string;
    search: string;
  };
  readonly countLabels?: {
    resultFor: string;
    resultsFor: string;
  };
}

export default function SearchClient({
  initialSearchResults,
  initialSearch,
  initialPage,
  lang,
  breadcrumbLabels,
  countLabels,
}: SearchClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const SEARCH_RESULTS_PER_PAGE = 10;

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const reduxRvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // Use rvcode from Redux or fallback to environment variable
  const rvcode = reduxRvcode || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

  const [currentPage, setCurrentPage] = useState(initialPage);

  // Only the user's own choices live in state; every list below is derived from the results.
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set());
  const [checkedYears, setCheckedYears] = useState<Set<number>>(new Set());
  const [checkedVolumes, setCheckedVolumes] = useState<Set<number>>(new Set());
  const [checkedSections, setCheckedSections] = useState<Set<number>>(new Set());
  const [checkedAuthors, setCheckedAuthors] = useState<Set<string>>(new Set());
  const [openedAbstractIds, setOpenedAbstractIds] = useState<Set<number>>(new Set());
  const [showAllAbstracts, setShowAllAbstracts] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);

  // The query string owns the search terms; the prop is only the first-render fallback.
  const search = searchParams?.get('terms') || searchParams?.get('q') || initialSearch;

  // Sorted so the request key stays stable regardless of the order boxes were ticked.
  const selectedTypeValues = useMemo(
    () => Array.from(checkedTypes).sort((a, b) => a.localeCompare(b)),
    [checkedTypes]
  );
  const selectedYearValues = useMemo(
    () => Array.from(checkedYears).sort((a, b) => a - b),
    [checkedYears]
  );
  const selectedVolumeValues = useMemo(
    () => Array.from(checkedVolumes).sort((a, b) => a - b),
    [checkedVolumes]
  );
  const selectedSectionValues = useMemo(
    () => Array.from(checkedSections).sort((a, b) => a - b),
    [checkedSections]
  );
  const selectedAuthorValues = useMemo(
    () => Array.from(checkedAuthors).sort((a, b) => a.localeCompare(b)),
    [checkedAuthors]
  );

  // Stable string key representing the search state: it only changes when the *content* of
  // the params changes, not when array references do.
  const searchParamsKey = JSON.stringify({
    search,
    rvcode,
    currentPage,
    selectedTypeValues,
    selectedYearValues,
    selectedVolumeValues,
    selectedSectionValues,
    selectedAuthorValues,
  });

  /**
   * Results are tagged with the request key that produced them. Comparing that key with the
   * one the current inputs ask for derives the loading flag during render, so the fetch
   * effect below never calls setState synchronously.
   */
  const [fetched, setFetched] = useState<{
    key: string;
    results: typeof initialSearchResults;
  } | null>(null);

  const isFetchable = !!search && !!rvcode;
  const isLoading = isFetchable && fetched?.key !== searchParamsKey;
  const searchResults = fetched?.key === searchParamsKey ? fetched.results : initialSearchResults;

  useEffect(() => {
    if (!isFetchable) return;

    let cancelled = false;

    fetchSearchResults({
      terms: search,
      rvcode,
      page: currentPage,
      itemsPerPage: SEARCH_RESULTS_PER_PAGE,
      types: selectedTypeValues,
      years: selectedYearValues,
      volumes: selectedVolumeValues,
      sections: selectedSectionValues,
      authors: selectedAuthorValues,
    })
      .then(results => {
        if (!cancelled) setFetched({ key: searchParamsKey, results });
      })
      .catch(error => {
        logger.error('Search failed:', error);
        if (!cancelled) setFetched({ key: searchParamsKey, results: initialSearchResults });
      });

    return () => {
      cancelled = true;
    };
    // Only refetch when the *content* of the params changes, not their references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  // Facets are a projection of the current results crossed with the user's selections.
  const types = useMemo(
    () => buildInitTypes(searchResults?.range?.types ?? [], checkedTypes),
    [searchResults, checkedTypes]
  );
  const years = useMemo(
    () => buildInitYears(searchResults?.range?.years ?? [], checkedYears),
    [searchResults, checkedYears]
  );
  const volumes = useMemo(
    () => buildInitVolumes(searchResults?.range?.volumes ?? {}, language, checkedVolumes),
    [searchResults, language, checkedVolumes]
  );
  const sections = useMemo(
    () => buildInitSections(searchResults?.range?.sections ?? {}, language, checkedSections),
    [searchResults, language, checkedSections]
  );
  const authors = useMemo(
    () => buildInitAuthors(searchResults?.range?.authors ?? [], checkedAuthors),
    [searchResults, checkedAuthors]
  );

  const enhancedSearchResults = useMemo<EnhancedSearchResult[]>(
    () =>
      (searchResults?.data ?? [])
        .filter(searchResult => searchResult?.title)
        .map(searchResult => ({
          ...searchResult,
          openedAbstract: openedAbstractIds.has(searchResult!.id as number),
        })) as EnhancedSearchResult[],
    [searchResults, openedAbstractIds]
  );

  const updateUrlAndSearch = useCallback(() => {
    const params = new URLSearchParams();

    params.append('terms', search);
    params.append('page', currentPage.toString());

    selectedTypeValues.forEach(type => params.append('types', type));
    selectedYearValues.forEach(year => params.append('years', year.toString()));
    selectedVolumeValues.forEach(volume => params.append('volumes', volume.toString()));
    selectedSectionValues.forEach(section => params.append('sections', section.toString()));
    selectedAuthorValues.forEach(author => params.append('authors', author));

    router.push(`${PATHS.search}?${params.toString()}`);
  }, [
    search,
    currentPage,
    selectedTypeValues,
    selectedYearValues,
    selectedVolumeValues,
    selectedSectionValues,
    selectedAuthorValues,
    router,
  ]);

  const hasActiveFilters =
    selectedTypeValues.length > 0 ||
    selectedYearValues.length > 0 ||
    selectedVolumeValues.length > 0 ||
    selectedSectionValues.length > 0 ||
    selectedAuthorValues.length > 0;

  // Mirror the active filters and the page into the URL. Keyed on the request key so the
  // effect cannot re-fire on mere reference changes.
  useEffect(() => {
    if (hasActiveFilters || currentPage !== initialPage) {
      updateUrlAndSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  // Memoize handlePageClick to prevent Pagination re-renders
  const handlePageClick = useCallback((selectedItem: { selected: number }): void => {
    setCurrentPage(selectedItem.selected + 1);
  }, []);

  const onCheckType = (value: string): void => {
    setCurrentPage(1);
    setCheckedTypes(prev => toggleInSet(prev, value));
  };

  const onCheckYear = (year: number): void => {
    setCurrentPage(1);
    setCheckedYears(prev => toggleInSet(prev, year));
  };

  const onCheckVolume = (id: number): void => {
    setCurrentPage(1);
    setCheckedVolumes(prev => toggleInSet(prev, id));
  };

  const onCheckSection = (id: number): void => {
    setCurrentPage(1);
    setCheckedSections(prev => toggleInSet(prev, id));
  };

  const onCheckAuthor = (fullname: string): void => {
    setCurrentPage(1);
    setCheckedAuthors(prev => toggleInSet(prev, fullname));
  };

  // Replace a whole selection, e.g. when the mobile modal applies its filters.
  const updateTypes = (updated: ISearchResultTypeSelection[]): void =>
    setCheckedTypes(
      checkedValuesOf(
        updated,
        t => t.isChecked,
        t => t.value
      )
    );
  const updateYears = (updated: ISearchResultYearSelection[]): void =>
    setCheckedYears(
      checkedValuesOf(
        updated,
        y => y.isChecked,
        y => y.year
      )
    );
  const updateVolumes = (updated: ISearchResultVolumeSelection[]): void =>
    setCheckedVolumes(
      checkedValuesOf(
        updated,
        v => v.isChecked,
        v => v.id
      )
    );
  const updateSections = (updated: ISearchResultSectionSelection[]): void =>
    setCheckedSections(
      checkedValuesOf(
        updated,
        sec => sec.isChecked,
        sec => sec.id
      )
    );
  const updateAuthors = (updated: ISearchResultAuthorSelection[]): void =>
    setCheckedAuthors(
      checkedValuesOf(
        updated,
        a => a.isChecked,
        a => a.fullname
      )
    );

  // Pure projection of the current selections: derived during render, not in an effect.
  const taggedFilters = useMemo<ISearchResultFilter[]>(
    () => [
      ...types
        .filter(t => t.isChecked)
        .map(t => ({ type: 'type' as const, value: t.value, labelPath: t.labelPath })),
      ...years
        .filter(y => y.isChecked)
        .map(y => ({ type: 'year' as const, value: y.year, label: y.year })),
      ...volumes
        .filter(v => v.isChecked)
        .map(v => ({ type: 'volume' as const, value: v.id, translatedLabel: v.label })),
      ...sections
        .filter(sec => sec.isChecked)
        .map(sec => ({ type: 'section' as const, value: sec.id, translatedLabel: sec.label })),
      ...authors
        .filter(a => a.isChecked)
        .map(a => ({ type: 'author' as const, value: a.fullname, label: a.fullname })),
    ],
    [types, years, volumes, sections, authors]
  );

  const onCloseTaggedFilter = (type: SearchResultTypeFilter, value: string | number) => {
    setCurrentPage(1);

    if (type === 'type') {
      setCheckedTypes(prev => toggleInSet(prev, String(value)));
    } else if (type === 'year') {
      setCheckedYears(prev => toggleInSet(prev, Number(value)));
    } else if (type === 'volume') {
      setCheckedVolumes(prev => toggleInSet(prev, Number(value)));
    } else if (type === 'section') {
      setCheckedSections(prev => toggleInSet(prev, Number(value)));
    } else if (type === 'author') {
      setCheckedAuthors(prev => toggleInSet(prev, String(value)));
    }
  };

  const clearTaggedFilters = (): void => {
    setCurrentPage(1);
    setCheckedTypes(new Set());
    setCheckedYears(new Set());
    setCheckedVolumes(new Set());
    setCheckedSections(new Set());
    setCheckedAuthors(new Set());
  };

  const toggleAbstract = (searchResultId?: number): void => {
    if (!searchResultId) return;
    setOpenedAbstractIds(prev => toggleInSet(prev, searchResultId));
  };

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts;

    setOpenedAbstractIds(
      isShown ? new Set(enhancedSearchResults.map(r => r.id as number).filter(Boolean)) : new Set()
    );
    setShowAllAbstracts(isShown);
  };

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels
        ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >`
        : `${t('pages.home.title')} > ${t('common.content')} >`,
    },
  ];

  return (
    <main className="articles">
      <PageTitle title={breadcrumbLabels?.search || t('pages.search.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.search || t('pages.search.title')}
        lang={lang}
      />
      <div className="articles-title">
        <h1 className="articles-title-text">
          {breadcrumbLabels?.search || t('pages.search.title')}
        </h1>
        <div className="articles-title-count">
          {searchResults && searchResults.totalItems > 1 ? (
            <div className="articles-title-count-text">
              {searchResults.totalItems} {countLabels?.resultsFor || t('common.resultsFor')} &ldquo;
              {search}&rdquo;
            </div>
          ) : (
            <div className="articles-title-count-text">
              {searchResults?.totalItems ?? 0} {countLabels?.resultFor || t('common.resultFor')}{' '}
              &ldquo;{search}&rdquo;
            </div>
          )}
          <div className="articles-title-count-filtersMobile">
            <div
              className="articles-title-count-filtersMobile-tile"
              role="button"
              tabIndex={0}
              onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}
              onKeyDown={e =>
                handleKeyboardClick(e, (): void =>
                  setOpenedFiltersMobileModal(!openedFiltersMobileModal)
                )
              }
            >
              <FilterIcon
                size={16}
                className="articles-title-count-filtersMobile-tile-icon"
                ariaLabel="Filters"
              />
              <div className="articles-title-count-filtersMobile-tile-text">
                {taggedFilters.length > 0
                  ? `${t('common.filters.editFilters')} (${taggedFilters.length})`
                  : `${t('common.filters.filter')}`}
              </div>
            </div>
            {openedFiltersMobileModal && (
              <SearchResultsMobileModal
                language={language}
                t={t}
                initialTypes={types}
                onUpdateTypesCallback={updateTypes}
                initialYears={years}
                onUpdateYearsCallback={updateYears}
                initialVolumes={volumes}
                onUpdateVolumesCallback={updateVolumes}
                initialSections={sections}
                onUpdateSectionsCallback={updateSections}
                initialAuthors={authors}
                onUpdateAuthorsCallback={updateAuthors}
                onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="articles-filters">
        {taggedFilters.length > 0 && (
          <div className="articles-filters-tags">
            {taggedFilters.map(filter => {
              let tagText: string;
              if (filter.labelPath) {
                tagText = t(filter.labelPath);
              } else if (filter.translatedLabel) {
                tagText = filter.translatedLabel[language];
              } else {
                tagText = filter.label!.toString();
              }

              return (
                <Tag
                  key={`${filter.type}-${filter.value}`}
                  text={tagText}
                  onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
                />
              );
            })}
            <div
              className="articles-filters-tags-clear"
              role="button"
              tabIndex={0}
              onClick={clearTaggedFilters}
              onKeyDown={e => handleKeyboardClick(e, clearTaggedFilters)}
            >
              {t('common.filters.clearAll')}
            </div>
          </div>
        )}
        <div
          className="articles-filters-abstracts"
          role="button"
          tabIndex={0}
          onClick={toggleAllAbstracts}
          onKeyDown={e => handleKeyboardClick(e, toggleAllAbstracts)}
        >
          {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
        </div>
      </div>
      <div
        className="articles-filters-abstracts articles-filters-abstracts-mobile"
        role="button"
        tabIndex={0}
        onClick={toggleAllAbstracts}
        onKeyDown={e => handleKeyboardClick(e, toggleAllAbstracts)}
      >
        {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
      </div>
      <div className="articles-content">
        <div className="articles-content-results">
          <SearchResultsSidebar
            language={language}
            t={t}
            types={types}
            onCheckTypeCallback={onCheckType}
            years={years}
            onCheckYearCallback={onCheckYear}
            volumes={volumes}
            onCheckVolumeCallback={onCheckVolume}
            sections={sections}
            onCheckSectionCallback={onCheckSection}
            authors={authors}
            onCheckAuthorCallback={onCheckAuthor}
          />
          {isLoading ? (
            <Loader />
          ) : (
            <div className="articles-content-results-cards">
              {enhancedSearchResults.map(searchResult => (
                <ArticleCard
                  key={searchResult.id}
                  language={language}
                  rvcode={rvcode}
                  t={t}
                  article={searchResult as IArticleCard}
                  toggleAbstractCallback={(): void => toggleAbstract(searchResult?.id)}
                />
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={SEARCH_RESULTS_PER_PAGE}
          totalItems={searchResults?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
}
