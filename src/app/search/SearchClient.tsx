'use client';

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter } from "next/navigation";
import PageTitle from '@/components/PageTitle/PageTitle';

// import filter from '/icons/filter.svg';
import filter from '/public/icons/filter.svg';
import { PATHS } from "@/config/paths";
import { useAppSelector } from "@/hooks/store";
import { FetchedArticle, articleTypes } from '@/utils/article';
import { AvailableLanguage } from "@/utils/i18n";
import { SearchRange } from "@/utils/pagination";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import SearchResultCard, { ISearchResultCard } from "@/components/Cards/SearchResultCard/SearchResultCard";
import SearchResultsMobileModal from '@/components/Modals/SearchResultsMobileModal/SearchResultsMobileModal';
import SearchResultsSidebar, { ISearchResultTypeSelection, ISearchResultYearSelection, ISearchResultVolumeSelection, ISearchResultSectionSelection, ISearchResultAuthorSelection } from "@/components/Sidebars/SearchResultsSidebar/SearchResultsSidebar";
import Pagination from "@/components/Pagination/Pagination";
import Tag from "@/components/Tag/Tag";

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
}

interface SearchClientProps {
  initialSearchResults: {
    data: FetchedArticle[];
    totalItems: number;
    range?: SearchRange;
  };
  initialSearch: string;
  initialPage: number;
}

export default function SearchClient({ 
  initialSearchResults,
  initialSearch,
  initialPage
}: SearchClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const SEARCH_RESULTS_PER_PAGE = 10;

  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [searchResults, setSearchResults] = useState(initialSearchResults);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedSearchResults, setEnhancedSearchResults] = useState<EnhancedSearchResult[]>([]);
  const [types, setTypes] = useState<ISearchResultTypeSelection[]>([]);
  const [years, setYears] = useState<ISearchResultYearSelection[]>([]);
  const [volumes, setVolumes] = useState<ISearchResultVolumeSelection[]>([]);
  const [sections, setSections] = useState<ISearchResultSectionSelection[]>([]);
  const [authors, setAuthors] = useState<ISearchResultAuthorSelection[]>([]);
  const [taggedFilters, setTaggedFilters] = useState<ISearchResultFilter[]>([]);
  const [showAllAbstracts, setShowAllAbstracts] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);

  const getSelectedTypes = (): string[] => types.filter(t => t.isChecked).map(t => t.value);
  const getSelectedYears = (): number[] => years.filter(y => y.isChecked).map(y => y.year);
  const getSelectedVolumes = (): number[] => volumes.filter(v => v.isChecked).map(v => v.id);
  const getSelectedSections = (): number[] => sections.filter(s => s.isChecked).map(s => s.id);
  const getSelectedAuthors = (): string[] => authors.filter(a => a.isChecked).map(a => a.fullname);

  // Initialiser les données quand les résultats de recherche changent
  useEffect(() => {
    if (initialSearchResults) {
      setSearchResults(initialSearchResults);
    }
  }, [initialSearchResults]);
  
  // Filtrer les résultats de recherche
  useEffect(() => {
    if (searchResults?.range) {
      if (searchResults?.range.types) {
        const initTypes = searchResults.range.types
          .filter((t) => articleTypes.find((at) => at.value === t.value))
          .map((t) => {
            const matchingType = articleTypes.find((at) => at.value === t.value);
            return {
              labelPath: matchingType!.labelPath,
              value: matchingType!.value,
              count: t.count,
              isChecked: types.find((type) => type.value === matchingType!.value)?.isChecked || false,
            };
          });
        setTypes(initTypes);
      }

      if (searchResults?.range.years) {
        const initYears = searchResults.range.years.map((y) => ({
          year: y.value,
          count: y.count,
          isChecked: years.find((year) => year.year === y.value)?.isChecked || false,
        }));
        setYears(initYears);
      }
  
      if (searchResults?.range.volumes) {
        const initVolumes = searchResults.range.volumes[language]?.map((v) => {
          const id = parseInt(Object.keys(v)[0]);
          return {
            id,
            label: {
              en: searchResults.range?.volumes?.en?.find(vol => parseInt(Object.keys(vol)[0]) === id)?.[id] || '',
              fr: searchResults.range?.volumes?.fr?.find(vol => parseInt(Object.keys(vol)[0]) === id)?.[id] || '',
            },
            isChecked: volumes.find((volume) => volume.id === id)?.isChecked || false,
          };
        }) ?? [];
        setVolumes(initVolumes);
      }

      if (searchResults?.range.sections) {
        const initSections = searchResults.range.sections[language]?.map((s) => {
          const id = parseInt(Object.keys(s)[0]);
          return {
            id,
            label: {
              en: searchResults.range?.sections?.en?.find(sec => parseInt(Object.keys(sec)[0]) === id)?.[id] || '',
              fr: searchResults.range?.sections?.fr?.find(sec => parseInt(Object.keys(sec)[0]) === id)?.[id] || '',
            },
            isChecked: sections.find((section) => section.id === id)?.isChecked || false,
          };
        }) ?? [];
        setSections(initSections);
      }

      if (searchResults?.range.authors) {
        const initAuthors = searchResults.range.authors.map((a) => ({
          fullname: a.value,
          count: a.count,
          isChecked: authors.find((author) => author.fullname === a.value)?.isChecked || false,
        }));
        setAuthors(initAuthors);
      }
    }
  }, [searchResults, language]);

  // Mettre à jour les résultats de recherche quand les filtres changent
  useEffect(() => {
    // Construire l'URL avec les paramètres de recherche
    const updateUrlAndSearch = () => {
      const params = new URLSearchParams();
      
      params.append('terms', search);
      params.append('page', currentPage.toString());
      
      const selectedTypes = getSelectedTypes();
      const selectedYears = getSelectedYears();
      const selectedVolumes = getSelectedVolumes();
      const selectedSections = getSelectedSections();
      const selectedAuthors = getSelectedAuthors();
      
      selectedTypes.forEach(type => params.append('types', type));
      selectedYears.forEach(year => params.append('years', year.toString()));
      selectedVolumes.forEach(volume => params.append('volumes', volume.toString()));
      selectedSections.forEach(section => params.append('sections', section.toString()));
      selectedAuthors.forEach(author => params.append('authors', author));
      
      // Mettre à jour l'URL
      router.push(`${PATHS.search}?${params.toString()}`);
    };
    
    // Ne mettre à jour l'URL que si on a des filtres actifs ou si on change de page
    if (taggedFilters.length > 0 || currentPage !== initialPage) {
      updateUrlAndSearch();
    }
  }, [taggedFilters, currentPage]);

  // Mettre à jour les résultats améliorés lorsque les résultats de recherche changent
  useEffect(() => {
    if (searchResults) {
      const displayedSearchResults = searchResults?.data.filter((searchResult) => searchResult?.title).map((searchResult) => {
        return { ...searchResult, openedAbstract: false };
      });

      setEnhancedSearchResults(displayedSearchResults as EnhancedSearchResult[]);
    }
  }, [searchResults, searchResults?.data]);

  // Mettre à jour les filtres tagués lorsque les filtres changent
  useEffect(() => {
    setAllTaggedFilters();
  }, [types, years, volumes, sections, authors, search]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
    setEnhancedSearchResults([]);
    setCurrentPage(selectedItem.selected + 1);
  };

  const onCheckType = (value: string): void => {
    setCurrentPage(1);

    const updatedTypes = types.map((t) => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }

      return { ...t };
    });

    setTypes(updatedTypes);
  };

  const onCheckYear = (year: number): void => {
    setCurrentPage(1);

    const updatedYears = years.map((y) => {
      if (y.year === year) {
        return { ...y, isChecked: !y.isChecked };
      }

      return { ...y };
    });

    setYears(updatedYears);
  };

  const onCheckVolume = (id: number): void => {
    setCurrentPage(1);

    const updatedVolumes = volumes.map((v) => {
      if (v.id === id) {
        return { ...v, isChecked: !v.isChecked };
      }

      return { ...v };
    });

    setVolumes(updatedVolumes);
  };

  const onCheckSection = (id: number): void => {
    setCurrentPage(1);

    const updatedSections = sections.map((s) => {
      if (s.id === id) {
        return { ...s, isChecked: !s.isChecked };
      }

      return { ...s };
    });

    setSections(updatedSections);
  };

  const onCheckAuthor = (fullname: string): void => {
    setCurrentPage(1);

    const updatedAuthors = authors.map((a) => {
      if (a.fullname === fullname) {
        return { ...a, isChecked: !a.isChecked };
      }

      return { ...a };
    });

    setAuthors(updatedAuthors);
  };

  const setAllTaggedFilters = (): void => {
    const initFilters: ISearchResultFilter[] = [];

    types.filter((t) => t.isChecked).forEach((t) => {
      initFilters.push({
        type: 'type',
        value: t.value,
        labelPath: t.labelPath
      });
    });

    years.filter((y) => y.isChecked).forEach((y) => {
      initFilters.push({
        type: 'year',
        value: y.year,
        label: y.year
      });
    });

    volumes.filter((v) => v.isChecked).forEach((v) => {
      initFilters.push({
        type: 'volume',
        value: v.id,
        translatedLabel: v.label
      });
    });

    sections.filter((s) => s.isChecked).forEach((s) => {
      initFilters.push({
        type: 'section',
        value: s.id,
        translatedLabel: s.label
      });
    });

    authors.filter((a) => a.isChecked).forEach((a) => {
      initFilters.push({
        type: 'author',
        value: a.fullname,
        label: a.fullname
      });
    });

    setTaggedFilters(initFilters);
  };

  const onCloseTaggedFilter = (type: SearchResultTypeFilter, value: string | number) => {
    if (type === 'type') {
      const updatedTypes = types.map((t) => {
        if (t.value === value) {
          return { ...t, isChecked: false };
        }

        return t;
      });

      setTypes(updatedTypes);
    } else if (type === 'year') {
      const updatedYears = years.map((y) => {
        if (y.year === value) {
          return { ...y, isChecked: false };
        }
  
        return y;
      });
  
      setYears(updatedYears);
    } else if (type === 'volume') {
      const updatedVolumes = volumes.map((v) => {
        if (v.id === value) {
          return { ...v, isChecked: false };
        }

        return v;
      });

      setVolumes(updatedVolumes);
    } else if (type === 'section') {
      const updatedSections = sections.map((s) => {
        if (s.id === value) {
          return { ...s, isChecked: false };
        }

        return s;
      });

      setSections(updatedSections);
    } else if (type === 'author') {
      const updatedAuthors = authors.map((a) => {
        if (a.fullname === value) {
          return { ...a, isChecked: false };
        }
  
        return a;
      });
  
      setAuthors(updatedAuthors);
    }
  };

  const clearTaggedFilters = (): void => {
    const updatedTypes = types.map((t) => {
      return { ...t, isChecked: false };
    });

    const updatedYears = years.map((y) => {
      return { ...y, isChecked: false };
    });

    const updatedVolumes = volumes.map((v) => {
      return { ...v, isChecked: false };
    });

    const updatedSections = sections.map((s) => {
      return { ...s, isChecked: false };
    });

    const updatedAuthors = authors.map((a) => {
      return { ...a, isChecked: false };
    });

    setTypes(updatedTypes);
    setYears(updatedYears);
    setVolumes(updatedVolumes);
    setSections(updatedSections);
    setAuthors(updatedAuthors);
    setTaggedFilters([]);
  };

  const toggleAbstract = (searchResultId?: number): void => {
    if (!searchResultId) return;

    const updatedSearchResults = enhancedSearchResults.map((searchResult) => {
      if (searchResult?.id === searchResultId) {
        return {
          ...searchResult,
          openedAbstract: !searchResult.openedAbstract
        };
      }

      return { ...searchResult };
    });

    setEnhancedSearchResults(updatedSearchResults);
  };

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts;

    const updatedSearchResults = enhancedSearchResults.map((searchResult) => ({
      ...searchResult,
      openedAbstract: isShown
    }));

    setEnhancedSearchResults(updatedSearchResults);
    setShowAllAbstracts(isShown);
  };

  return (
    <main className='search'>
      <PageTitle title={t('pages.search.title')} />

      <Breadcrumb parents={[
        { path: 'home', label: `${t('pages.home.title')} > ${t('common.content')} >` }
      ]} crumbLabel={t('pages.search.title')} />
      <div className='search-title'>
        <h1 className='search-title-text'>{t('pages.search.title')}</h1>
        <div className='search-title-count'>
          {searchResults && searchResults.totalItems > 1 ? (
            <div className='search-title-count'>{searchResults.totalItems} {t('common.resultsFor')} "{search}"</div>
          ) : (
            <div className='search-title-count'>{searchResults?.totalItems ?? 0} {t('common.resultFor')} "{search}"</div>
          )}
          <div className="search-title-count-filtersMobile">
            <div className="search-title-count-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
              <img className="search-title-count-filtersMobile-tile-icon" src={filter} alt='List icon' />
              <div className="search-title-count-filtersMobile-tile-text">{taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}</div>
            </div>
            {openedFiltersMobileModal && <SearchResultsMobileModal language={language} t={t} initialTypes={types} onUpdateTypesCallback={setTypes} initialYears={years} onUpdateYearsCallback={setYears} initialVolumes={volumes} onUpdateVolumesCallback={setVolumes} initialSections={sections} onUpdateSectionsCallback={setSections} initialAuthors={authors} onUpdateAuthorsCallback={setAuthors} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
          </div>
        </div>
      </div>
      <div className="search-filters">
        {taggedFilters.length > 0 && (
          <div className="search-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.translatedLabel ? filter.translatedLabel[language] : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
            ))}
            <div className="search-filters-tags-clear" onClick={clearTaggedFilters}>{t('common.filters.clearAll')}</div>
          </div>
        )}
        <div className="search-filters-abstracts" onClick={toggleAllAbstracts}>
          {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
        </div>
      </div>
      <div className="search-filters-abstracts search-filters-abstracts-mobile" onClick={toggleAllAbstracts}>
        {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
      </div>
      <div className='search-content'>
        <div className='search-content-results'>
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
            <div className='search-content-results-cards'>
              {enhancedSearchResults.map((searchResult, index) => (
                <SearchResultCard
                  key={index}
                  language={language}
                  rvcode={rvcode}
                  t={t}
                  searchResult={searchResult as ISearchResultCard}
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