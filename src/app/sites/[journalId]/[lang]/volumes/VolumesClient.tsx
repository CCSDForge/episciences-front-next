'use client';

import {
  FilterIcon,
  ListBlackIcon,
  ListGreyIcon,
  TileBlackIcon,
  TileGreyIcon,
} from '@/components/icons';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@/hooks/store';
import { AvailableLanguage } from '@/utils/i18n';
import { RENDERING_MODE } from '@/utils/card';
import { volumeTypes } from '@/utils/volume';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import VolumeCard from '@/components/Cards/VolumeCard/VolumeCard';
import VolumesMobileModal from '@/components/Modals/VolumesMobileModal/VolumesMobileModal';
import VolumesSidebar, {
  IVolumeTypeSelection,
  IVolumeYearSelection,
} from '@/components/Sidebars/VolumesSidebar/VolumesSidebar';
import VolumesModal from '@/components/Modals/VolumesModal/VolumesModal';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import PageTitle from '@/components/PageTitle/PageTitle';
import './Volumes.scss';
import { IVolume } from '@/types/volume';

// Import VolumesResponse mais pas le hook useFetchVolumesQuery
import type { VolumesResponse } from '@/store/features/volume/volume.query';
import { handleKeyboardClick } from '@/utils/keyboard';

type VolumeTypeFilter = 'type' | 'year';

interface IVolumeFilter {
  type: VolumeTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

interface VolumesClientProps {
  initialVolumes: VolumesResponse | null;
  initialPage: number;
  initialTypes: string[];
  initialYears: number[];
  lang?: string;
  journalId?: string;
  breadcrumbLabels?: {
    home: string;
    content: string;
    volumes: string;
  };
}

const VOLUMES_PER_PAGE = 20;

export default function VolumesClient({
  initialVolumes,
  initialPage,
  initialTypes,
  initialYears,
  lang,
  journalId,
  breadcrumbLabels,
}: VolumesClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const reduxRvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  const rvcode = reduxRvcode || journalId;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [volumes, setVolumes] = useState(initialVolumes);
  const [volumesData, setVolumesData] = useState(initialVolumes);
  const [mode, setMode] = useState<RENDERING_MODE>(RENDERING_MODE.LIST);
  const [types, setTypes] = useState<IVolumeTypeSelection[]>([]);

  const [years, setYears] = useState<IVolumeYearSelection[]>([]);
  const [taggedFilters, setTaggedFilters] = useState<IVolumeFilter[]>([]);
  const [openedFiltersModal, setOpenedFiltersModal] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Update local state when props change (Server Component re-render)
  useEffect(() => {
    if (initialVolumes) {
      setVolumes(initialVolumes);
      setVolumesData(initialVolumes); // Directly update data
      setIsLoadingData(false); // Hide loader
    }
  }, [initialVolumes]);

  const getSelectedTypes = (): string[] => types.filter(t => t.isChecked).map(t => t.value);
  const getSelectedYears = (): number[] => years.filter(y => y.isSelected).map(y => y.year);

  const updateParams = (newTypes: IVolumeTypeSelection[], newYears: IVolumeYearSelection[]) => {
    const params = new URLSearchParams();

    // Add types
    newTypes.filter(t => t.isChecked).forEach(t => {
      params.append('type', t.value);
    });

    // Add years
    newYears.filter(y => y.isSelected).forEach(y => {
      params.append('years', y.year.toString());
    });

    // Reset to page 1
    params.set('page', '1');

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname || '';
    
    setIsLoadingData(true);
    router.push(url);
  };

  // Synchroniser currentPage avec les query params
  useEffect(() => {
    const pageParam = searchParams?.get('page');
    const pageNumber = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    if (!isNaN(pageNumber) && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    }
  }, [searchParams, currentPage]);

  useEffect(() => {
    if (types.length > 0) {
      setTypes(currentTypes => {
        const needsUpdate = currentTypes.some(
          t => t.isChecked !== initialTypes.includes(t.value)
        );

        if (!needsUpdate) return currentTypes;

        return currentTypes.map(type => ({
          ...type,
          isChecked: initialTypes.includes(type.value),
        }));
      });
    }
  }, [initialTypes, types.length]);

  // Initialize years selection from props
  useEffect(() => {
    if (years.length > 0) {
      setYears(currentYears => {
        const needsUpdate = currentYears.some(y => {
          const shouldBeSelected = initialYears.includes(y.year);
          return y.isSelected !== shouldBeSelected;
        });
        
        if (!needsUpdate) return currentYears;

        return currentYears.map(y => ({
          ...y,
          isSelected: initialYears.includes(y.year),
        }));
      });
    }
  }, [initialYears, years.length]);

  useEffect(() => {
    // If we have volumes data (even empty) and types are not yet initialized
    if (volumes && types.length === 0) {
      // Use types from range if available, otherwise fallback to all known types
      // This ensures the sidebar is visible even if the API doesn't return range data
      const rangeTypes = Array.isArray(volumes.range?.types) ? volumes.range.types : [];
      const typesSource = rangeTypes.length > 0
        ? rangeTypes
        : volumeTypes.map(vt => vt.value);

      console.log('Initializing types from source:', typesSource, 'initialTypes:', initialTypes);

      const initTypes = typesSource
        .filter(t => volumeTypes.find(vt => vt.value === t))
        .map(t => {
          const matchingType = volumeTypes.find(vt => vt.value === t);
          if (!matchingType) return null;

          return {
            labelPath: matchingType.labelPath,
            value: matchingType.value,
            isChecked: initialTypes.includes(matchingType.value),
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      if (initTypes.length > 0) {
        setTypes(initTypes);
      }
    }
  }, [volumes, types.length, initialTypes]);

  useEffect(() => {
    if (volumes && years.length === 0) {
      let yearsToUse: number[] = [];

      if (Array.isArray(volumes.range?.years) && volumes.range.years.length > 0) {
        // Ensure years are numbers
        yearsToUse = volumes.range.years.map(y => Number(y)).filter(n => !isNaN(n));
      } else if (Array.isArray(volumes.data)) {
        // Fallback: extract years from current data if range is missing
        const extractedYears = volumes.data
          .map(v => Number(v.year))
          .filter((y): y is number => !isNaN(y));
        yearsToUse = Array.from(new Set(extractedYears));
      }

      if (yearsToUse.length > 0) {
        // Sort descending
        yearsToUse.sort((a, b) => b - a);
        
        console.log('Initializing years from:', yearsToUse);
        const initYears = yearsToUse.map(y => ({
          year: y,
          isSelected: initialYears.includes(y),
        }));
        setYears(initYears);
      }
    }
  }, [volumes, years.length, initialYears]);

  // Client-side filtering removed in favor of server-side filtering via URL params

  // Memoize handlePageClick to prevent Pagination re-renders
  const handlePageClick = useCallback(
    (selectedItem: { selected: number }): void => {
      const newPage = selectedItem.selected + 1;
      if (pathname) {
        // Preserve current params, only change page
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
      }
      setCurrentPage(newPage);
      // Scroll vers le haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pathname, router, searchParams]
  );

  const getVolumesCount = (mode: RENDERING_MODE): React.JSX.Element | null => {
    if (volumes) {
      if (volumes.totalItems > 1) {
        return (
          <div
            className={`volumes-title-count-text volumes-title-count-text-volumes ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}
          >
            {volumes.totalItems} {t('common.volumes')}
          </div>
        );
      }

      return (
        <div
          className={`volumes-title-count-text volumes-title-count-text-volumes ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}
        >
          {volumes?.totalItems ?? 0} {t('common.volume')}
        </div>
      );
    }

    return null;
  };

  const getArticlesCount = (mode: RENDERING_MODE): React.JSX.Element | null => {
    if (volumes) {
      if (volumes.articlesCount && volumes.articlesCount > 1) {
        return (
          <div
            className={`volumes-title-count-text volumes-title-count-text-articles ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}
          >
            {volumes.articlesCount} {t('common.articles')}
          </div>
        );
      }

      return (
        <div
          className={`volumes-title-count-text volumes-title-count-text-articles ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}
        >
          {volumes.articlesCount} {t('common.article')}
        </div>
      );
    }

    return null;
  };

  const onCheckType = (value: string): void => {
    const updatedTypes = types.map(t => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }

      return { ...t };
    });

    setTypes(updatedTypes);
    updateParams(updatedTypes, years);
  };

  const onSelectYear = (year: number): void => {
    const updatedYears = years.map(y => {
      if (y.year === year) {
        return { ...y, isSelected: !y.isSelected };
      }

      return { ...y };
    });

    setYears(updatedYears);
    updateParams(types, updatedYears);
  };

  const onCloseTaggedFilter = (type: VolumeTypeFilter, value: string | number) => {
    if (type === 'type') {
      const updatedTypes = types.map(t => {
        if (t.value === value) {
          return { ...t, isChecked: false };
        }

        return t;
      });

      setTypes(updatedTypes);
      updateParams(updatedTypes, years);
    } else if (type === 'year') {
      const updatedYears = years.map(y => {
        if (y.year === value) {
          return { ...y, isSelected: false };
        }

        return y;
      });

      setYears(updatedYears);
      updateParams(types, updatedYears);
    }
  };

  const clearTaggedFilters = (): void => {
    const updatedTypes = types.map(t => {
      return { ...t, isChecked: false };
    });

    const updatedYears = years.map(y => {
      return { ...y, isSelected: false };
    });

    setTypes(updatedTypes);
    setYears(updatedYears);
    setTaggedFilters([]);
    
    updateParams(updatedTypes, updatedYears);
  };

  const toggleFiltersModal = () => {
    if (mode === RENDERING_MODE.LIST) return;

    setOpenedFiltersModal(!openedFiltersModal);
  };

  useEffect(() => {
    const initFilters: IVolumeFilter[] = [];

    types
      .filter(type => type.isChecked)
      .forEach(type => {
        initFilters.push({
          type: 'type',
          value: type.value,
          labelPath: type.labelPath,
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

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels
        ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >`
        : `${t('pages.home.title')} > ${t('common.content')} >`,
    },
  ];

  return (
    <main className="volumes">
      <PageTitle title={breadcrumbLabels?.volumes || t('pages.volumes.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.volumes || t('pages.volumes.title')}
        lang={lang}
      />
      <div className="volumes-title">
        <h1 className="volumes-title-text">
          {breadcrumbLabels?.volumes || t('pages.volumes.title')}
        </h1>
        <div className="volumes-title-count">
          {mode === RENDERING_MODE.LIST ? (
            <div className="volumes-title-count-wrapper">
              {getVolumesCount(RENDERING_MODE.LIST)}
              {getArticlesCount(RENDERING_MODE.LIST)}
            </div>
          ) : (
            <div className="volumes-title-count-text"></div>
          )}
          <div className="volumes-title-count-icons">
            <div
              className="volumes-title-count-icons-icon"
              role="button"
              tabIndex={0}
              onClick={(): void => setMode(RENDERING_MODE.TILE)}
              onKeyDown={(e) => handleKeyboardClick(e, (): void => setMode(RENDERING_MODE.TILE))}
            >
              <div
                className={`${mode === RENDERING_MODE.TILE ? 'volumes-title-count-icons-icon-row-black' : 'volumes-title-count-icons-icon-row'}`}
              >
                {mode === RENDERING_MODE.TILE ? (
                  <TileBlackIcon size={16} ariaLabel="Tile view" />
                ) : (
                  <TileGreyIcon size={16} ariaLabel="Tile view" />
                )}
                <span>{t('common.renderingMode.tile')}</span>
              </div>
            </div>
            <div
              className="volumes-title-count-icons-icon"
              role="button"
              tabIndex={0}
              onClick={(): void => setMode(RENDERING_MODE.LIST)}
              onKeyDown={(e) => handleKeyboardClick(e, (): void => setMode(RENDERING_MODE.LIST))}
            >
              <div
                className={`${mode === RENDERING_MODE.LIST ? 'volumes-title-count-icons-icon-row-black' : 'volumes-title-count-icons-icon-row'}`}
              >
                {mode === RENDERING_MODE.LIST ? (
                  <ListBlackIcon size={16} ariaLabel="List view" />
                ) : (
                  <ListGreyIcon size={16} ariaLabel="List view" />
                )}
                <span>{t('common.renderingMode.list')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {mode === RENDERING_MODE.TILE && (
        <div className="volumes-title-count-wrapper">
          {getVolumesCount(RENDERING_MODE.TILE)}
          {getArticlesCount(RENDERING_MODE.TILE)}
        </div>
      )}
      {mode === RENDERING_MODE.LIST ? (
        <div className="volumes-filters">
          <div className="volumes-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag
                key={index}
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
              />
            ))}
            {taggedFilters.length > 0 ? (
              <div className="volumes-filters-tags-clear" 
        role="button"
        tabIndex={0}
        
        onClick={clearTaggedFilters}
        onKeyDown={(e) => handleKeyboardClick(e, clearTaggedFilters)}>
                {t('common.filters.clearAll')}
              </div>
            ) : (
              <div className="volumes-filters-tags-clear"></div>
            )}
          </div>
        </div>
      ) : (
        <div className="volumes-filters volumes-filters-tiles">
          <div className="volumes-filters-tags">
            <div
              className="volumes-filters-tags-filterTile"
              role="button"
              tabIndex={0}
              onClick={(): void => toggleFiltersModal()}
              onKeyDown={(e) => handleKeyboardClick(e, toggleFiltersModal)}
            >
              <FilterIcon
                size={16}
                className="volumes-filters-tags-filterTile-icon"
                ariaLabel="Filters"
              />
              <div className="volumes-filters-tags-filterTile-text">
                {taggedFilters.length > 0
                  ? `${t('common.filters.editFilters')} (${taggedFilters.length})`
                  : `${t('common.filters.filter')}`}
              </div>
            </div>
            {taggedFilters.map((filter, index) => (
              <Tag
                key={index}
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
              />
            ))}
          </div>
          <div className="volumes-filters-modal">
            {openedFiltersModal && (
              <VolumesModal
                t={t}
                types={types}
                onCheckTypeCallback={onCheckType}
                years={years}
                onSelectYearCallback={onSelectYear}
                onCloseCallback={(): void => setOpenedFiltersModal(false)}
              />
            )}
          </div>
        </div>
      )}
      <div className="volumes-filtersMobile">
        <div className="volumes-filtersMobile-count">
          {getVolumesCount(mode)}
          {getArticlesCount(mode)}
        </div>
        <div
          className="volumes-filtersMobile-tile"
          role="button"
          tabIndex={0}
          onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}
          onKeyDown={(e) => handleKeyboardClick(e, (): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal))}
        >
          <FilterIcon size={16} className="volumes-filtersMobile-tile-icon" ariaLabel="Filters" />
          <div className="volumes-filtersMobile-tile-text">
            {taggedFilters.length > 0
              ? `${t('common.filters.editFilters')} (${taggedFilters.length})`
              : `${t('common.filters.filter')}`}
          </div>
        </div>
        {openedFiltersMobileModal && (
          <VolumesMobileModal
            t={t}
            initialTypes={types}
            onUpdateTypesCallback={setTypes}
            initialYears={years}
            onUpdateYearsCallback={setYears}
            onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
          />
        )}
      </div>
      <div className="volumes-filtersMobile-tags">
        {taggedFilters.map((filter, index) => (
          <Tag
            key={index}
            text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
            onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
          />
        ))}
      </div>
      <div className="volumes-content">
        <div className="volumes-content-results">
          {mode === RENDERING_MODE.LIST && (
            <VolumesSidebar
              t={t}
              types={types}
              onCheckTypeCallback={onCheckType}
              years={years}
              onSelectYearCallback={onSelectYear}
            />
          )}
          {isLoadingData ? (
            <Loader />
          ) : (
            <div
              className={`volumes-content-results-cards ${mode === RENDERING_MODE.TILE && 'volumes-content-results-cards-tiles'}`}
            >
              {volumesData?.data.map((volume: IVolume, index: number) => (
                <VolumeCard
                  key={index}
                  language={language}
                  t={t}
                  mode={mode}
                  volume={volume}
                  currentJournal={currentJournal}
                  journalCode={journalId}
                />
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={VOLUMES_PER_PAGE}
          totalItems={volumesData?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
}
