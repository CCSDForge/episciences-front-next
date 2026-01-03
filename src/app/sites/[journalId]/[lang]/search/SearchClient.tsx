'use client';

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from "next/navigation";
import PageTitle from '@/components/PageTitle/PageTitle';
import { fetchSearchResults } from '@/services/search';

// import filter from '/icons/filter.svg';
import filter from '/public/icons/filter.svg';
import { PATHS } from "@/config/paths";
import { useAppSelector } from "@/hooks/store";
import { FetchedArticle, articleTypes } from '@/utils/article';
import { AvailableLanguage } from "@/utils/i18n";
import { SearchRange } from "@/utils/pagination";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import ArticleCard, { IArticleCard } from "@/components/Cards/ArticleCard/ArticleCard";
import SearchResultsMobileModal from '@/components/Modals/SearchResultsMobileModal/SearchResultsMobileModal';
import SearchResultsSidebar, { ISearchResultTypeSelection, ISearchResultYearSelection, ISearchResultVolumeSelection, ISearchResultSectionSelection, ISearchResultAuthorSelection } from "@/components/Sidebars/SearchResultsSidebar/SearchResultsSidebar";
import Pagination from "@/components/Pagination/Pagination";
import Tag from "@/components/Tag/Tag";
import '../articles/Articles.scss';

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
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    content: string;
    search: string;
  };
  countLabels?: {
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
  countLabels
}: SearchClientProps): JSX.Element {
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

  const language = useAppSelector(state => state.i18nReducer.language);
  const reduxRvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);
  
  // Use rvcode from Redux or fallback to environment variable
  const rvcode = reduxRvcode || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  
  // Check if we're in static build mode
  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
  

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

  const getSelectedTypes = useCallback(() => types.filter(t => t.isChecked).map(t => t.value), [types]);
  const getSelectedYears = useCallback(() => years.filter(y => y.isChecked).map(y => y.year), [years]);
  const getSelectedVolumes = useCallback(() => volumes.filter(v => v.isChecked).map(v => v.id), [volumes]);
  const getSelectedSections = useCallback(() => sections.filter(s => s.isChecked).map(s => s.id), [sections]);
  const getSelectedAuthors = useCallback(() => authors.filter(a => a.isChecked).map(a => a.fullname), [authors]);

  const performFilteredSearch = useCallback(async () => {
    if (!search || !rvcode) return;
    
    setIsLoading(true);
    try {
      const selectedTypes = getSelectedTypes();
      const selectedYears = getSelectedYears();
      const selectedVolumes = getSelectedVolumes();
      const selectedSections = getSelectedSections();
      const selectedAuthors = getSelectedAuthors();
      
      const results = await fetchSearchResults({
        terms: search,
        rvcode,
        page: currentPage,
        itemsPerPage: SEARCH_RESULTS_PER_PAGE,
        types: selectedTypes,
        years: selectedYears,
        volumes: selectedVolumes,
        sections: selectedSections,
        authors: selectedAuthors
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, rvcode, currentPage, getSelectedTypes, getSelectedYears, getSelectedVolumes, getSelectedSections, getSelectedAuthors]);

  // Read search query from URL parameters
  useEffect(() => {
    const urlSearch = searchParams?.get('terms') || searchParams?.get('q') || '';
    if (urlSearch && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams, search]);
  
  // Perform search when search terms or basic params change (pagination)
  useEffect(() => {
    performFilteredSearch();
  }, [performFilteredSearch]);

  // Trigger search when filters change
  useEffect(() => {
    if (search && rvcode) {
      // Only trigger if we have basic search params and filters have changed
      const hasActiveFilters = types.some(t => t.isChecked) || 
                             years.some(y => y.isChecked) ||
                             volumes.some(v => v.isChecked) ||
                             sections.some(s => s.isChecked) ||
                             authors.some(a => a.isChecked);
      
      if (hasActiveFilters) {
        // Reset to page 1 when filters change. 
        // NOTE: changing currentPage will trigger the useEffect above [performFilteredSearch] which depends on currentPage
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          // If already on page 1, we need to trigger search manually because currentPage didn't change
          // BUT, performFilteredSearch depends on getSelectedTypes which depends on types.
          // So if types changed, performFilteredSearch changed, so the effect above runs!
          // So we might not need this effect at all?
          // Let's verify.
        }
      }
    }
  }, [types, years, volumes, sections, authors, search, rvcode, currentPage]);

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
  }, [searchResults, language, authors, sections, types, volumes, years]);

  const updateUrlAndSearch = useCallback(() => {
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
  }, [search, currentPage, getSelectedTypes, getSelectedYears, getSelectedVolumes, getSelectedSections, getSelectedAuthors, router]);

  // Mettre à jour les résultats de recherche quand les filtres changent
  useEffect(() => {
    // Ne mettre à jour l'URL que si on a des filtres actifs ou si on change de page
    if (taggedFilters.length > 0 || currentPage !== initialPage) {
      updateUrlAndSearch();
    }
  }, [taggedFilters, currentPage, initialPage, updateUrlAndSearch]);

  // Mettre à jour les résultats améliorés lorsque les résultats de recherche changent
  useEffect(() => {
    if (searchResults) {
      const displayedSearchResults = searchResults?.data.filter((searchResult) => searchResult?.title).map((searchResult) => {
        return { ...searchResult, openedAbstract: false };
      });

      setEnhancedSearchResults(displayedSearchResults as EnhancedSearchResult[]);
    }
  }, [searchResults]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
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

  const setAllTaggedFilters = useCallback((): void => {
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
  }, [types, years, volumes, sections, authors]);

  // Mettre à jour les filtres tagués lorsque les filtres changent
  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

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
    <main className='articles'>
      <PageTitle title={breadcrumbLabels?.search || t('pages.search.title')} />

      <Breadcrumb parents={[
        { 
          path: '/', 
          label: breadcrumbLabels 
            ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >` 
            : `${t('pages.home.title')} > ${t('common.content')} >` 
        }
      ]} crumbLabel={breadcrumbLabels?.search || t('pages.search.title')} />
      <div className='articles-title'>
        <h1 className='articles-title-text'>{breadcrumbLabels?.search || t('pages.search.title')}</h1>
        <div className='articles-title-count'>
          {searchResults && searchResults.totalItems > 1 ? (
            <div className='articles-title-count-text'>{searchResults.totalItems} {countLabels?.resultsFor || t('common.resultsFor')} &ldquo;{search}&rdquo;</div>
          ) : (
            <div className='articles-title-count-text'>{searchResults?.totalItems ?? 0} {countLabels?.resultFor || t('common.resultFor')} &ldquo;{search}&rdquo;</div>
          )}
          <div className="articles-title-count-filtersMobile">
            <div className="articles-title-count-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
              <img className="articles-title-count-filtersMobile-tile-icon" src={filter} alt='List icon' />
              <div className="articles-title-count-filtersMobile-tile-text">{taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}</div>
            </div>
            {openedFiltersMobileModal && <SearchResultsMobileModal language={language} t={t} initialTypes={types} onUpdateTypesCallback={setTypes} initialYears={years} onUpdateYearsCallback={setYears} initialVolumes={volumes} onUpdateVolumesCallback={setVolumes} initialSections={sections} onUpdateSectionsCallback={setSections} initialAuthors={authors} onUpdateAuthorsCallback={setAuthors} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
          </div>
        </div>
      </div>
      <div className="articles-filters">
        {taggedFilters.length > 0 && (
          <div className="articles-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.translatedLabel ? filter.translatedLabel[language] : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
            ))}
            <div className="articles-filters-tags-clear" onClick={clearTaggedFilters}>{t('common.filters.clearAll')}</div>
          </div>
        )}
        <div className="articles-filters-abstracts" onClick={toggleAllAbstracts}>
          {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
        </div>
      </div>
      <div className="articles-filters-abstracts articles-filters-abstracts-mobile" onClick={toggleAllAbstracts}>
        {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
      </div>
      <div className='articles-content'>
        <div className='articles-content-results'>
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
            <div className='articles-content-results-cards'>
              {enhancedSearchResults.map((searchResult, index) => (
                <ArticleCard
                  key={index}
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