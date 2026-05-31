'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import PageTitle from '@/components/PageTitle/PageTitle';
import {
  FilterIcon,
  ListBlackIcon,
  ListGreyIcon,
  TileBlackIcon,
  TileGreyIcon,
} from '@/components/icons';
import { useAppSelector } from '@/hooks/store';
import { AvailableLanguage } from '@/utils/i18n';
import { RENDERING_MODE } from '@/utils/card';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import NewsListCard from '@/components/Cards/NewsCard/NewsListCard';
import NewsTileCard from '@/components/Cards/NewsCard/NewsTileCard';
import NewsSidebar, { INewsYearSelection } from '@/components/Sidebars/NewsSidebar/NewsSidebar';
import Pagination from '@/components/Pagination/Pagination';
import { INews, Range, fetchNews } from '@/services/news';
import { handleKeyboardClick } from '@/utils/keyboard';
import '@/styles/transitions.scss';

// Lazy load mobile modal
const NewsMobileModal = dynamic(
  () => import('@/components/Modals/NewsMobileModal/NewsMobileModal'),
  { ssr: false, loading: () => null }
);

interface NewsClientProps {
  initialNews: {
    data: INews[];
    totalItems: number;
    range?: Range;
  } | null;
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    news: string;
  };
}

const NEWS_PER_PAGE = 10;

export default function NewsClient({
  initialNews,
  lang,
  breadcrumbLabels,
}: NewsClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const router = useRouter();
  const searchParams = useSearchParams();

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const selectedYearsFromUrl = useMemo(
    () => searchParams.get('years')?.split(',').map(Number).filter(Boolean) ?? [],
    [searchParams]
  );

  const [mode, setMode] = useState(RENDERING_MODE.LIST);
  const [availableYears, setAvailableYears] = useState<number[]>(
    initialNews?.range?.years ?? []
  );
  const [fullNewsIndex, setFullNewsIndex] = useState(-1);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [news, setNews] = useState(initialNews);
  const [isLoading, setIsLoading] = useState(false);

  const years: INewsYearSelection[] = availableYears.map(y => ({
    year: y,
    isSelected: selectedYearsFromUrl.includes(y),
  }));

  useEffect(() => {
    if (!rvcode) return;

    setIsLoading(true);
    fetchNews({ rvcode, page: currentPage, itemsPerPage: NEWS_PER_PAGE, years: selectedYearsFromUrl })
      .then(data => {
        setNews(data);
        if (data?.range?.years) {
          setAvailableYears(prev => (prev.length === 0 ? data.range!.years! : prev));
        }
      })
      .finally(() => setIsLoading(false));
  }, [rvcode, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageClick = useCallback(
    (selectedItem: { selected: number }): void => {
      const newPage = selectedItem.selected + 1;
      router.push(
        `/news?page=${newPage}${selectedYearsFromUrl.length > 0 ? `&years=${selectedYearsFromUrl.join(',')}` : ''}`
      );
    },
    [router, selectedYearsFromUrl]
  );

  const onSelectYear = (year: number): void => {
    const newSelected = selectedYearsFromUrl.includes(year)
      ? selectedYearsFromUrl.filter(y => y !== year)
      : [...selectedYearsFromUrl, year];
    router.push(`/news?page=1${newSelected.length > 0 ? `&years=${newSelected.join(',')}` : ''}`);
  };

  const onApplyYearsFromModal = useCallback(
    (updatedYears: INewsYearSelection[]): void => {
      const selected = updatedYears.filter(y => y.isSelected).map(y => y.year);
      router.push(`/news?page=1${selected.length > 0 ? `&years=${selected.join(',')}` : ''}`);
    },
    [router]
  );

  const getSelectedYears = (): number[] => years.filter(y => y.isSelected).map(y => y.year);

  const renderMobileSelectedYears = (): string => getSelectedYears().reverse().join(', ');

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels
        ? `${breadcrumbLabels.home} > ${t('common.about')} >`
        : `${t('pages.home.title')} > ${t('common.about')} >`,
    },
  ];

  return (
    <main className="news">
      <PageTitle title={breadcrumbLabels?.news || t('pages.news.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.news || t('pages.news.title')}
        lang={lang}
      />
      <div className="news-title">
        <h1>{breadcrumbLabels?.news || t('pages.news.title')}</h1>
        <div className="news-title-icons">
          <div
            className="news-title-icons-icon"
            role="button"
            tabIndex={0}
            aria-pressed={mode === RENDERING_MODE.TILE}
            onClick={(): void => setMode(RENDERING_MODE.TILE)}
            onKeyDown={e => handleKeyboardClick(e, () => setMode(RENDERING_MODE.TILE))}
          >
            <div
              className={`${mode === RENDERING_MODE.TILE ? 'news-title-icons-icon-row-black' : 'news-title-icons-icon-row'}`}
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
            className="news-title-icons-icon"
            role="button"
            tabIndex={0}
            aria-pressed={mode === RENDERING_MODE.LIST}
            onClick={(): void => setMode(RENDERING_MODE.LIST)}
            onKeyDown={e => handleKeyboardClick(e, () => setMode(RENDERING_MODE.LIST))}
          >
            <div
              className={`${mode === RENDERING_MODE.LIST ? 'news-title-icons-icon-row-black' : 'news-title-icons-icon-row'}`}
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
      <div className="news-filtersMobile">
        <span>{renderMobileSelectedYears()}</span>
        <div
          className="news-filtersMobile-tile"
          role="button"
          tabIndex={0}
          onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}
          onKeyDown={e =>
            handleKeyboardClick(e, (): void =>
              setOpenedFiltersMobileModal(!openedFiltersMobileModal)
            )
          }
        >
          <FilterIcon size={16} className="news-filtersMobile-tile-icon" ariaLabel="Filter" />
          <div className="news-filtersMobile-tile-text">
            {getSelectedYears().length > 0
              ? `${t('common.filters.editFilters')} (${getSelectedYears().length})`
              : `${t('common.filters.filter')}`}
          </div>
        </div>
        {openedFiltersMobileModal && (
          <NewsMobileModal
            t={t}
            years={years}
            onUpdateYearsCallback={onApplyYearsFromModal}
            onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
          />
        )}
      </div>
      <div className={`news-content content-transition ${isLoading ? 'updating' : ''}`}>
        <div className="news-content-results">
          <NewsSidebar t={t} years={years} onSelectYearCallback={onSelectYear} />
          {isLoading ? (
            <Loader />
          ) : (
            <div
              className={`news-content-results-cards ${mode === RENDERING_MODE.TILE && 'news-content-results-cards-grid'}`}
            >
              {news?.data?.map((singleNews, index) =>
                mode === RENDERING_MODE.TILE ? (
                  <NewsTileCard
                    key={index}
                    language={language}
                    t={t}
                    news={singleNews}
                    state={
                      fullNewsIndex === index
                        ? 'expanded'
                        : fullNewsIndex !== -1
                          ? 'blurred'
                          : 'default'
                    }
                    onToggle={(): void =>
                      fullNewsIndex !== index ? setFullNewsIndex(index) : setFullNewsIndex(-1)
                    }
                  />
                ) : (
                  <NewsListCard key={index} language={language} t={t} news={singleNews} />
                )
              )}
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
