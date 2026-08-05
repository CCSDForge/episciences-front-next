'use client';

import {
  FilterIcon,
  ListBlackIcon,
  ListGreyIcon,
  TileBlackIcon,
  TileGreyIcon,
} from '@/components/icons';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useOptimistic,
  useRef,
  useTransition,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@/hooks/store';
import { AvailableLanguage } from '@/utils/i18n';
import { RENDERING_MODE } from '@/utils/card';
import { volumeTypes } from '@/utils/volume';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import VolumeTileCard from '@/components/Cards/VolumeCard/VolumeTileCard';
import VolumeListCard from '@/components/Cards/VolumeCard/VolumeListCard';
import VolumesSidebar, {
  IVolumeTypeSelection,
  IVolumeYearSelection,
} from '@/components/Sidebars/VolumesSidebar/VolumesSidebar';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import PageTitle from '@/components/PageTitle/PageTitle';
import './Volumes.scss';
import { IVolume } from '@/types/volume';

// Import VolumesResponse mais pas le hook useFetchVolumesQuery
import type { VolumesResponse } from '@/store/features/volume/volume.query';
import { handleKeyboardClick } from '@/utils/keyboard';
import { logger } from '@/lib/logger';

// Lazy load mobile modal
const VolumesMobileModal = dynamic(
  () => import('@/components/Modals/VolumesMobileModal/VolumesMobileModal'),
  { ssr: false, loading: () => null }
);

// Lazy load desktop modal
const VolumesModal = dynamic(() => import('@/components/Modals/VolumesModal/VolumesModal'), {
  ssr: false,
  loading: () => null,
});

type VolumeTypeFilter = 'type' | 'year';

interface IVolumeFilter {
  type: VolumeTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

interface VolumesClientProps {
  readonly initialVolumes: VolumesResponse | null;
  readonly initialPage: number;
  readonly initialTypes: string[];
  readonly initialYears: number[];
  readonly lang?: string;
  readonly journalId?: string;
  readonly breadcrumbLabels?: {
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
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);

  const [mode, setMode] = useState<RENDERING_MODE>(RENDERING_MODE.LIST);
  const [openedFiltersModal, setOpenedFiltersModal] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);

  // Filtering and pagination are entirely URL-driven: the server component re-renders with
  // fresh props on every navigation, so nothing here is mirrored into state.
  const volumes = initialVolumes;

  const pageParam = searchParams?.get('page');
  const parsedPage = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : initialPage;
  const currentPage = Number.isNaN(parsedPage) ? initialPage : parsedPage;

  const [isLoadingData, startNavigation] = useTransition();

  // Shows the click immediately, then falls back to the props once the navigation lands.
  const [selection, applySelection] = useOptimistic(
    { types: initialTypes, years: initialYears },
    (_current, next: { types: string[]; years: number[] }) => next
  );

  const navigateWithFilters = (nextTypes: string[], nextYears: number[]): void => {
    const params = new URLSearchParams();
    nextTypes.forEach(type => params.append('type', type));
    nextYears.forEach(year => params.append('years', year.toString()));
    params.set('page', '1');

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname || '';

    startNavigation(() => {
      applySelection({ types: nextTypes, years: nextYears });
      router.push(url);
    });
  };

  // Available facets: the API range wins, otherwise fall back to the known types / the
  // years present in the current payload.
  const types = useMemo<IVolumeTypeSelection[]>(() => {
    const rangeTypes = Array.isArray(volumes?.range?.types) ? volumes.range.types : [];
    const typesSource = rangeTypes.length > 0 ? rangeTypes : volumeTypes.map(vt => vt.value);

    logger.debug('Deriving types from source', { typesSource, selected: selection.types });

    return typesSource
      .map(t => volumeTypes.find(vt => vt.value === t))
      .filter((vt): vt is NonNullable<typeof vt> => vt !== undefined)
      .map(vt => ({
        labelPath: vt.labelPath,
        value: vt.value,
        isChecked: selection.types.includes(vt.value),
      }));
  }, [volumes, selection.types]);

  const years = useMemo<IVolumeYearSelection[]>(() => {
    const rangeYears = Array.isArray(volumes?.range?.years) ? volumes.range.years : [];

    let yearsToUse = rangeYears.map(y => Number(y)).filter(n => !Number.isNaN(n) && n > 0);

    if (yearsToUse.length === 0 && Array.isArray(volumes?.data)) {
      yearsToUse = Array.from(
        new Set(volumes.data.map(v => Number(v.year)).filter(y => !Number.isNaN(y) && y > 0))
      );
    }

    return yearsToUse
      .sort((a, b) => b - a)
      .map(y => ({ year: y, isSelected: selection.years.includes(y) }));
  }, [volumes, selection.years]);

  const selectedTypeValues = types.filter(t => t.isChecked).map(t => t.value);
  const selectedYearValues = years.filter(y => y.isSelected).map(y => y.year);

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
    const nextTypes = selectedTypeValues.includes(value)
      ? selectedTypeValues.filter(t => t !== value)
      : [...selectedTypeValues, value];

    navigateWithFilters(nextTypes, selectedYearValues);
  };

  const onSelectYear = (year: number): void => {
    const nextYears = selectedYearValues.includes(year)
      ? selectedYearValues.filter(y => y !== year)
      : [...selectedYearValues, year];

    navigateWithFilters(selectedTypeValues, nextYears);
  };

  const onCloseTaggedFilter = (type: VolumeTypeFilter, value: string | number) => {
    if (type === 'type') {
      navigateWithFilters(
        selectedTypeValues.filter(t => t !== value),
        selectedYearValues
      );
    } else if (type === 'year') {
      navigateWithFilters(
        selectedTypeValues,
        selectedYearValues.filter(y => y !== value)
      );
    }
  };

  const clearTaggedFilters = (): void => navigateWithFilters([], []);

  /**
   * VolumesMobileModal applies its filters by calling the types callback and then the years
   * callback in the same tick. Staging the types lets both land in a single navigation
   * instead of two competing ones.
   */
  const stagedModalTypes = useRef<string[] | null>(null);

  const onModalUpdateTypes = (updated: IVolumeTypeSelection[]): void => {
    stagedModalTypes.current = updated.filter(t => t.isChecked).map(t => t.value);
  };

  const onModalUpdateYears = (updated: IVolumeYearSelection[]): void => {
    const nextTypes = stagedModalTypes.current ?? selectedTypeValues;
    stagedModalTypes.current = null;

    navigateWithFilters(
      nextTypes,
      updated.filter(y => y.isSelected).map(y => y.year)
    );
  };

  const toggleFiltersModal = () => {
    if (mode === RENDERING_MODE.LIST) return;

    setOpenedFiltersModal(!openedFiltersModal);
  };

  // Pure projection of the current selections: derived during render, not in an effect.
  const taggedFilters = useMemo<IVolumeFilter[]>(
    () => [
      ...types
        .filter(type => type.isChecked)
        .map(type => ({ type: 'type' as const, value: type.value, labelPath: type.labelPath })),
      ...years
        .filter(y => y.isSelected)
        .map(y => ({ type: 'year' as const, value: y.year, label: y.year })),
    ],
    [types, years]
  );

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
              onKeyDown={e => handleKeyboardClick(e, (): void => setMode(RENDERING_MODE.TILE))}
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
              onKeyDown={e => handleKeyboardClick(e, (): void => setMode(RENDERING_MODE.LIST))}
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
            {taggedFilters.map(filter => (
              <Tag
                key={`${filter.type}-${filter.value}`}
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
              />
            ))}
            {taggedFilters.length > 0 ? (
              <div
                className="volumes-filters-tags-clear"
                role="button"
                tabIndex={0}
                onClick={clearTaggedFilters}
                onKeyDown={e => handleKeyboardClick(e, clearTaggedFilters)}
              >
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
              onKeyDown={e => handleKeyboardClick(e, toggleFiltersModal)}
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
            {taggedFilters.map(filter => (
              <Tag
                key={`${filter.type}-${filter.value}`}
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
          onKeyDown={e =>
            handleKeyboardClick(e, (): void =>
              setOpenedFiltersMobileModal(!openedFiltersMobileModal)
            )
          }
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
            onUpdateTypesCallback={onModalUpdateTypes}
            initialYears={years}
            onUpdateYearsCallback={onModalUpdateYears}
            onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
          />
        )}
      </div>
      <div className="volumes-filtersMobile-tags">
        {taggedFilters.map(filter => (
          <Tag
            key={`${filter.type}-${filter.value}`}
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
              {volumes?.data.map((volume: IVolume) =>
                mode === RENDERING_MODE.TILE ? (
                  <VolumeTileCard
                    key={volume.id}
                    language={language}
                    t={t}
                    volume={volume}
                    currentJournal={currentJournal}
                    journalCode={journalId}
                  />
                ) : (
                  <VolumeListCard key={volume.id} language={language} t={t} volume={volume} />
                )
              )}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={VOLUMES_PER_PAGE}
          totalItems={volumes?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
}
