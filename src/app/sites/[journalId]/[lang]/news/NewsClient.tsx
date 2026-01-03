'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageTitle from '@/components/PageTitle/PageTitle';

// Use direct paths for static build compatibility
const filter = '/icons/filter.svg';
const listRed = '/icons/list-red.svg';
const listGrey = '/icons/list-grey.svg';
const tileRed = '/icons/tile-red.svg';
const tileGrey = '/icons/tile-grey.svg';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { RENDERING_MODE } from '@/utils/card';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import NewsCard from '@/components/Cards/NewsCard/NewsCard';
import NewsMobileModal from '@/components/Modals/NewsMobileModal/NewsMobileModal';
import NewsSidebar, { INewsYearSelection } from '@/components/Sidebars/NewsSidebar/NewsSidebar';
import Pagination from '@/components/Pagination/Pagination';
import { INews, Range, fetchNews } from '@/services/news';
import '@/styles/transitions.scss';

interface NewsClientProps {
  initialNews: {
    data: INews[];
    totalItems: number;
    range?: Range;
  } | null;
  lang?: string;
}

export default function NewsClient({ initialNews, lang }: NewsClientProps): JSX.Element {
  const { t } = useTranslation();

  const NEWS_PER_PAGE = 10;

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  // Architecture hybride : fetch automatique des données fraîches
  const { data: newsData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return initialNews;

      const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
      const itemsPerPage = isStaticBuild ? 9999 : 10;

      return await fetchNews({
        rvcode,
        page: 1,
        itemsPerPage
      });
    },
    initialData: initialNews,
    enabled: !!rvcode,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState(RENDERING_MODE.LIST);
  const [years, setYears] = useState<INewsYearSelection[]>([]);
  const [fullNewsIndex, setFullNewsIndex] = useState(-1);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [news, setNews] = useState(newsData || initialNews);
  const [isLoading, setIsLoading] = useState(false);

  const getSelectedYears = (): number[] => years.filter(y => y.isSelected).map(y => y.year);

  useEffect(() => {
    // Initialiser les années disponibles lorsque les données sont chargées
    if (newsData?.range?.years && years.length === 0) {
      const initYears = newsData.range.years.map((y) => ({
        year: y,
        isSelected: false
      }));

      setYears(initYears);
    }
  }, [newsData, years.length]);

  useEffect(() => {
    // Mettre à jour l'état news lorsque les données changent
    if (newsData) {
      setNews(newsData);
    }
  }, [newsData]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
    setCurrentPage(selectedItem.selected + 1);
    // Pour un comportement Full Static, la navigation entre les pages 
    // serait gérée par le rechargement de la page avec des paramètres d'URL
    window.location.href = `/news?page=${selectedItem.selected + 1}${getSelectedYears().length > 0 ? `&years=${getSelectedYears().join(',')}` : ''}`;
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
    
    // Pour un comportement Full Static, la sélection des années 
    // serait gérée par le rechargement de la page avec des paramètres d'URL
    const selectedYears = updatedYears.filter(y => y.isSelected).map(y => y.year);
    window.location.href = `/news?page=1${selectedYears.length > 0 ? `&years=${selectedYears.join(',')}` : ''}`;
  };

  const renderMobileSelectedYears = (): string => getSelectedYears().reverse().join(', ');

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.about')} >` }
  ];

  return (
    <main className='news'>
      <PageTitle title={t('pages.news.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.news.title')} lang={lang} />
      <div className='news-title'>
        <h1>{t('pages.news.title')}</h1>
        <div className='news-title-icons'>
          <div className='news-title-icons-icon' onClick={(): void => setMode(RENDERING_MODE.TILE)}>
            <div className={`${mode === RENDERING_MODE.TILE ? 'news-title-icons-icon-row-red' : 'news-title-icons-icon-row'}`}>
              <img src={mode === RENDERING_MODE.TILE ? tileRed : tileGrey} alt='Tile icon' />
              <span>{t('common.renderingMode.tile')}</span>
            </div>
          </div>
          <div className='news-title-icons-icon' onClick={(): void => setMode(RENDERING_MODE.LIST)}>
            <div className={`${mode === RENDERING_MODE.LIST ? 'news-title-icons-icon-row-red' : 'news-title-icons-icon-row'}`}>
              <img src={mode === RENDERING_MODE.LIST ? listRed : listGrey} alt='List icon' />
              <span>{t('common.renderingMode.list')}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="news-filtersMobile">
        <span>{renderMobileSelectedYears()}</span>
        <div className="news-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
          <img className="news-filtersMobile-tile-icon" src={filter} alt='List icon' />
          <div className="news-filtersMobile-tile-text">{getSelectedYears().length > 0 ? `${t('common.filters.editFilters')} (${getSelectedYears().length})` : `${t('common.filters.filter')}`}</div>
        </div>
        {openedFiltersMobileModal && <NewsMobileModal t={t} years={years} onUpdateYearsCallback={setYears} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
      </div>
      <div className={`news-content content-transition ${isUpdating ? 'updating' : ''}`}>
        <div className='news-content-results'>
          <NewsSidebar t={t} years={years} onSelectYearCallback={onSelectYear} />
          {isLoading ? (
            <Loader />
          ) : (
            <div className={`news-content-results-cards ${mode === RENDERING_MODE.TILE && 'news-content-results-cards-grid'}`}>
              {news?.data?.map((singleNews, index) => (
                <NewsCard
                  key={index}
                  language={language}
                  t={t}
                  mode={mode}
                  fullCard={mode === RENDERING_MODE.TILE && fullNewsIndex === index}
                  blurCard={mode === RENDERING_MODE.TILE && fullNewsIndex !== -1 && fullNewsIndex !== index}
                  setFullNewsIndexCallback={(): void => mode === RENDERING_MODE.TILE ? fullNewsIndex !== index ? setFullNewsIndex(index) : setFullNewsIndex(-1) : void(null)}
                  news={singleNews}
                />
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={NEWS_PER_PAGE}
          totalItems={news?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
} 