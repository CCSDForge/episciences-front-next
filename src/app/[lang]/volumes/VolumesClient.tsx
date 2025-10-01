'use client';

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from 'react-i18next';

import filter from '/public/icons/filter.svg';
import listRed from '/public/icons/list-red.svg';
import listGrey from '/public/icons/list-grey.svg';
import tileRed from '/public/icons/tile-red.svg';
import tileGrey from '/public/icons/tile-grey.svg';
import { useAppSelector } from "@/hooks/store";
import { RENDERING_MODE } from '@/utils/card';
import { volumeTypes } from '@/utils/volume';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import VolumeCard from "@/components/Cards/VolumeCard/VolumeCard";
import VolumesMobileModal from '@/components/Modals/VolumesMobileModal/VolumesMobileModal';
import VolumesSidebar, { IVolumeTypeSelection, IVolumeYearSelection } from "@/components/Sidebars/VolumesSidebar/VolumesSidebar";
import VolumesModal from "@/components/Modals/VolumesModal/VolumesModal";
import Pagination from "@/components/Pagination/Pagination";
import Tag from "@/components/Tag/Tag";
import PageTitle from "@/components/PageTitle/PageTitle";
import './Volumes.scss';
import { IVolume } from '@/types/volume';
import { PATHS } from '@/config/paths';

// Import VolumesResponse mais pas le hook useFetchVolumesQuery
import type { VolumesResponse } from '@/store/features/volume/volume.query';

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
  initialType: string;
}

const VOLUMES_PER_PAGE = 10;

export default function VolumesClient({
  initialVolumes,
  initialPage,
  initialType
}: VolumesClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [volumes, setVolumes] = useState(initialVolumes);
  const [volumesData, setVolumesData] = useState(initialVolumes);
  const [mode, setMode] = useState<RENDERING_MODE>(RENDERING_MODE.LIST);
  const [types, setTypes] = useState<IVolumeTypeSelection[]>([]);
  const [years, setYears] = useState<IVolumeYearSelection[]>([]);
  const [taggedFilters, setTaggedFilters] = useState<IVolumeFilter[]>([]);
  const [openedFiltersModal, setOpenedFiltersModal] = useState(false);
  const [initQueryFilters, setInitQueryFilters] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const getSelectedTypes = (): string[] => types.filter(t => t.isChecked).map(t => t.value);
  const getSelectedYears = (): number[] => years.filter(y => y.isSelected).map(y => y.year);

  useEffect(() => {
    if (types.length > 0 && !initQueryFilters) {
      setTypes(currentTypes => {
        const newTypes = currentTypes.map(type => ({
            ...type,
            isChecked: initialType === type.value
        }));
  
        return newTypes;
      });

      setInitQueryFilters(true);
    }
  }, [types, initQueryFilters, initialType]);

  useEffect(() => {
    if (volumes?.range?.types && types.length === 0) {
      const typesArray = Array.isArray(volumes.range.types) ? volumes.range.types : [];
      const initTypes = typesArray
        .filter((t) => volumeTypes.find((vt) => vt.value === t))
        .map((t) => {
          const matchingType = volumeTypes.find((vt) => vt.value === t);
          if (!matchingType) return null;
          
          return {
            labelPath: matchingType.labelPath,
            value: matchingType.value,
            isChecked: initialType === matchingType.value
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      setTypes(initTypes);
    }
  }, [volumes?.range, volumes?.range?.types, types.length, initialType]);

  useEffect(() => {
    if (volumes?.range?.years && years.length === 0) {
      const yearsArray = Array.isArray(volumes.range.years) ? volumes.range.years : [];
      const initYears = yearsArray.map((y) => ({
        year: y,
        isSelected: false
      }));

      setYears(initYears);
    }
  }, [volumes?.range, volumes?.range?.years, years.length]);

  // Simuler le filtrage côté client au lieu de refaire un appel API
  useEffect(() => {
    // Utiliser uniquement les données initiales et appliquer un filtrage côté client
    if (initialVolumes?.data) {
      // Filtrage simpliste pour simuler le comportement API
      // Dans une version plus avancée, on pourrait implémenter une logique de filtrage plus sophistiquée
      const filteredData = {...initialVolumes};
      
      // Appliquer les filtres si nécessaire
      const selectedTypes = types.filter(t => t.isChecked).map(t => t.value);
      const selectedYears = years.filter(y => y.isSelected).map(y => y.year);
      
      if (selectedTypes.length > 0 || selectedYears.length > 0) {
        filteredData.data = initialVolumes.data.filter(vol => {
          // Filtrer par type
          const typeMatch = selectedTypes.length === 0 || 
            (Array.isArray(vol.types) && vol.types.some(t => selectedTypes.includes(t)));
          
          // Filtrer par année
          const yearMatch = selectedYears.length === 0 || 
            (typeof vol.year === 'number' && selectedYears.includes(vol.year));
          
          return typeMatch && yearMatch;
        });
      }
      
      setVolumesData(filteredData);
    }
  }, [initialVolumes, types, years, currentPage]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
    const newPage = selectedItem.selected + 1;
    
    // Construire l'URL avec les paramètres de filtrage actuels
    let url = `/${PATHS.volumes}/`;
    
    // Ajouter les paramètres de filtre si nécessaire
    const params = new URLSearchParams();
    
    // Ajouter le numéro de page s'il est différent de 1
    if (newPage > 1) {
      params.append('page', newPage.toString());
    }
    
    // Ajouter les types sélectionnés
    const selectedTypes = getSelectedTypes();
    if (selectedTypes.length > 0) {
      params.append('type', selectedTypes.join(','));
    }
    
    // Ajouter les années sélectionnées
    const selectedYears = getSelectedYears();
    if (selectedYears.length > 0) {
      params.append('year', selectedYears.join(','));
    }
    
    // Ajouter les paramètres à l'URL si nécessaire
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    // Utiliser la navigation statique au lieu de router.push
    window.location.href = url;
    
    // Mettre à jour l'état local (ne sera pas utilisé à cause de la redirection)
    setCurrentPage(newPage);
  };

  const getVolumesCount = (mode: RENDERING_MODE): JSX.Element | null => {
    if (volumes) {
      if (volumes.totalItems > 1) {
        return <div className={`volumes-title-count-text volumes-title-count-text-volumes ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}>{volumes.totalItems} {t('common.volumes')}</div>;
      }
    
      return <div className={`volumes-title-count-text volumes-title-count-text-volumes ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}>{volumes?.totalItems ?? 0} {t('common.volume')}</div>;
    }

    return null;
  };

  const getArticlesCount = (mode: RENDERING_MODE): JSX.Element | null => {
    if (volumes) {
      if (volumes.articlesCount && volumes.articlesCount > 1) {
        return <div className={`volumes-title-count-text volumes-title-count-text-articles ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}>{volumes.articlesCount} {t('common.articles')}</div>;
      }

      return <div className={`volumes-title-count-text volumes-title-count-text-articles ${mode === RENDERING_MODE.TILE && 'volumes-title-count-text-tiles'}`}>{volumes.articlesCount} {t('common.article')}</div>;  
    }

    return null;
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

  const onSelectYear = (year: number): void => {
    setCurrentPage(1);

    const updatedYears = years.map((y) => {
      if (y.year === year) {
        return { ...y, isSelected: !y.isSelected };
      }

      return { ...y };
    });

    setYears(updatedYears);
  };


  const onCloseTaggedFilter = (type: VolumeTypeFilter, value: string | number) => {
    if (type === 'type') {
      setCurrentPage(1);
      
      const updatedTypes = types.map((t) => {
        if (t.value === value) {
          return { ...t, isChecked: false };
        }

        return t;
      });

      setTypes(updatedTypes);
    } else if (type === 'year') {
      setCurrentPage(1);
      
      const updatedYears = years.map((y) => {
        if (y.year === value) {
          return { ...y, isSelected: false };
        }
  
        return y;
      });
  
      setYears(updatedYears);
    }
  };

  const clearTaggedFilters = (): void => {
    setCurrentPage(1);
    
    const updatedTypes = types.map((t) => {
      return { ...t, isChecked: false };
    });

    const updatedYears = years.map((y) => {
      return { ...y, isSelected: false };
    });

    setTypes(updatedTypes);
    setYears(updatedYears);
    setTaggedFilters([]);
  };

  const toggleFiltersModal = () => {
    if (mode === RENDERING_MODE.LIST) return;

    setOpenedFiltersModal(!openedFiltersModal);
  };

  useEffect(() => {
    const initFilters: IVolumeFilter[] = [];

    types.filter((type) => type.isChecked).forEach((type) => {
      initFilters.push({
        type: 'type',
        value: type.value,
        labelPath: type.labelPath
      });
    });

    years.filter((y) => y.isSelected).forEach((y) => {
      initFilters.push({
        type: 'year',
        value: y.year,
        label: y.year
      });
    });

    setTaggedFilters(initFilters);
  }, [types, years]);

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` }
  ];

  return (
    <main className='volumes'>
      <PageTitle title={t('pages.volumes.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.volumes.title')} />
      <div className='volumes-title'>
        <h1 className='volumes-title-text'>{t('pages.volumes.title')}</h1>
        <div className='volumes-title-count'>
          {mode === RENDERING_MODE.LIST ? (
            <div className='volumes-title-count-wrapper'>
              {getVolumesCount(RENDERING_MODE.LIST)}
              {getArticlesCount(RENDERING_MODE.LIST)}
            </div>
          ) : <div className='volumes-title-count-text'></div>}
          <div className='volumes-title-count-icons'>
            <div className='volumes-title-count-icons-icon' onClick={(): void => setMode(RENDERING_MODE.TILE)}>
              <div className={`${mode === RENDERING_MODE.TILE ? 'volumes-title-count-icons-icon-row-red' : 'volumes-title-count-icons-icon-row'}`}>
                <img src={mode === RENDERING_MODE.TILE ? tileRed : tileGrey} alt='Tile icon' />
                <span>{t('common.renderingMode.tile')}</span>
              </div>
            </div>
            <div className='volumes-title-count-icons-icon' onClick={(): void => setMode(RENDERING_MODE.LIST)}>
              <div className={`${mode === RENDERING_MODE.LIST ? 'volumes-title-count-icons-icon-row-red' : 'volumes-title-count-icons-icon-row'}`}>
                <img src={mode === RENDERING_MODE.LIST ? listRed : listGrey} alt='List icon' />
                <span>{t('common.renderingMode.list')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {mode === RENDERING_MODE.TILE && (
        <div className='volumes-title-count-wrapper'>
          {getVolumesCount(RENDERING_MODE.TILE)}
          {getArticlesCount(RENDERING_MODE.TILE)}
        </div>
      )}
      {mode === RENDERING_MODE.LIST ? (
        <div className='volumes-filters'>
          <div className="volumes-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
            ))}
            {taggedFilters.length > 0 ? (
              <div className="volumes-filters-tags-clear" onClick={clearTaggedFilters}>{t('common.filters.clearAll')}</div>
            ) : (
              <div className="volumes-filters-tags-clear"></div>
            )}
          </div>
        </div>
      ) : (
        <div className='volumes-filters volumes-filters-tiles'>
          <div className="volumes-filters-tags">
            <div className="volumes-filters-tags-filterTile" onClick={(): void => toggleFiltersModal()}>
              <img className="volumes-filters-tags-filterTile-icon" src={filter} alt='List icon' />
              <div className="volumes-filters-tags-filterTile-text">{taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}</div>
            </div>
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
            ))}
          </div>
          <div className="volumes-filters-modal">
            {openedFiltersModal && <VolumesModal t={t} types={types} onCheckTypeCallback={onCheckType} years={years} onSelectYearCallback={onSelectYear} onCloseCallback={(): void => setOpenedFiltersModal(false)}/>}
          </div>
        </div>
      )}
      <div className="volumes-filtersMobile">
        <div className="volumes-filtersMobile-count">
          {getVolumesCount(mode)}
          {getArticlesCount(mode)}
        </div>
        <div className="volumes-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
          <img className="volumes-filtersMobile-tile-icon" src={filter} alt='List icon' />
          <div className="volumes-filtersMobile-tile-text">{taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}</div>
        </div>
        {openedFiltersMobileModal && <VolumesMobileModal t={t} initialTypes={types} onUpdateTypesCallback={setTypes} initialYears={years} onUpdateYearsCallback={setYears} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
      </div>
      <div className='volumes-filtersMobile-tags'>
        {taggedFilters.map((filter, index) => (
          <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}/>
        ))}
      </div>
      <div className='volumes-content'>
        <div className='volumes-content-results'>
          {mode === RENDERING_MODE.LIST && (
            <VolumesSidebar t={t} types={types} onCheckTypeCallback={onCheckType} years={years} onSelectYearCallback={onSelectYear} />
          )}
          {isLoadingData ? (
            <Loader />
          ) : (
            <div className={`volumes-content-results-cards ${mode === RENDERING_MODE.TILE && 'volumes-content-results-cards-tiles'}`}>
              {volumesData?.data.map((volume: IVolume, index: number) => (
                <VolumeCard
                  key={index}
                  language={language}
                  t={t}
                  mode={mode}
                  volume={volume}
                  currentJournal={currentJournal}
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