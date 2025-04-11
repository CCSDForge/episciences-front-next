"use client";

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import filter from '../../../public/icons/filter.svg';
import { useAppSelector } from "@/hooks/store";
import { useFetchArticlesQuery } from '@/store/features/article/article.query';
import { IArticle } from "@/types/article";
import { FetchedArticle, articleTypes } from '@/utils/article';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import ArticleCard, { IArticleCard } from "@/components/Cards/ArticleCard/ArticleCard";
import ArticlesMobileModal from '@/components/Modals/ArticlesMobileModal/ArticlesMobileModal';
import ArticlesSidebar, { IArticleTypeSelection, IArticleYearSelection } from "@/components/Sidebars/ArticlesSidebar/ArticlesSidebar";
import Pagination from "@/components/Pagination/Pagination";
import Tag from "@/components/Tag/Tag";
import './Articles.scss';
import PageTitle from '@/components/PageTitle/PageTitle';

type ArticleTypeFilter = 'type' | 'year';

interface IArticleFilter {
  type: ArticleTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

type EnhancedArticle = FetchedArticle & {
  openedAbstract: boolean;
}

interface ArticlesClientProps {
  initialArticles: {
    data: IArticle[];
    totalItems: number;
  };
}

export default function ArticlesClient({ initialArticles }: ArticlesClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ARTICLES_PER_PAGE = 10;

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  const [currentPage, setCurrentPage] = useState(1);
  const [enhancedArticles, setEnhancedArticles] = useState<EnhancedArticle[]>([])
  const [types, setTypes] = useState<IArticleTypeSelection[]>([])
  const [years, setYears] = useState<IArticleYearSelection[]>([]);
  const [taggedFilters, setTaggedFilters] = useState<IArticleFilter[]>([]);
  const [showAllAbstracts, setShowAllAbstracts] = useState(false)
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [totalArticlesCount, setTotalArticlesCount] = useState<number>(0);

  const getSelectedTypes = (): string[] => types.filter(t => t.isChecked).map(t => t.value);
  const getSelectedYears = (): number[] => years.filter(y => y.isChecked).map(y => y.year);

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  const { data: articles, isFetching: isFetchingArticles } = useFetchArticlesQuery(
    { 
      rvcode: rvcode!, 
      page: currentPage, 
      itemsPerPage: ARTICLES_PER_PAGE, 
      types: getSelectedTypes(), 
      years: getSelectedYears() 
    }, 
    { 
      skip: !rvcode || isStaticBuild, 
      refetchOnMountOrArgChange: !isStaticBuild 
    }
  );
  
  useEffect(() => {
    if (initialArticles?.data) {
      const initialData = Array.isArray(initialArticles.data) ? initialArticles.data : [];
      
      let filteredData = initialData;
      const selectedTypes = getSelectedTypes();
      const selectedYears = getSelectedYears();
      
      if (selectedTypes.length > 0) {
        filteredData = filteredData.filter((article: any) => 
          selectedTypes.includes(article.tag || '')
        );
      }
      
      if (selectedYears.length > 0) {
        filteredData = filteredData.filter((article: any) => {
          const articleYear = new Date(article.publicationDate).getFullYear();
          return selectedYears.includes(articleYear);
        });
      }
      
      if (isStaticBuild) {
        setTotalArticlesCount(filteredData.length);
      } else {
        setTotalArticlesCount(initialArticles.totalItems || 0);
      }
      
      setEnhancedArticles(
        filteredData
          .filter((article: any) => article && article.title)
          .map((article: any) => ({ ...article, openedAbstract: false }))
      );
    }
  }, [initialArticles, types, years, getSelectedTypes, getSelectedYears, isStaticBuild]);

  useEffect(() => {
    if (!isStaticBuild && articles) {
      const displayedArticles = articles?.data
        .filter((article) => article?.title)
        .map((article) => ({ ...article, openedAbstract: false }));

      setTotalArticlesCount(articles.totalItems || 0);
      setEnhancedArticles(displayedArticles as EnhancedArticle[]);
    }
  }, [isStaticBuild, articles, articles?.data]);

  useEffect(() => {
    if (initialArticles?.data && types.length === 0) {
      const availableTypes = Array.from(new Set(
        initialArticles.data
          .map((article: any) => article.tag)
          .filter(Boolean)
      ));
      
      const initTypes = availableTypes
        .filter((t) => articleTypes.find((at) => at.value === t))
        .map((t) => {
          const matchingType = articleTypes.find((at) => at.value === t);
          return {
            labelPath: matchingType!.labelPath,
            value: matchingType!.value,
            isChecked: false
          };
        });
      
      setTypes(initTypes);
    }
  }, [initialArticles, types]);

  useEffect(() => {
    if (initialArticles?.data && years.length === 0) {
      const availableYears = Array.from(new Set(
        initialArticles.data
          .map((article: any) => {
            if (article.publicationDate) {
              return new Date(article.publicationDate).getFullYear();
            }
            return undefined;
          })
          .filter((year): year is number => year !== undefined)
      )).sort((a, b) => b - a);
      
      const initYears = availableYears.map((y) => ({
        year: y,
        isChecked: false
      }));
      
      setYears(initYears);
    }
  }, [initialArticles, years]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
    const newPage = selectedItem.selected + 1;
    router.push(`/articles/${newPage}`);
    setEnhancedArticles([]);
    setCurrentPage(newPage);
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
  }

  const onCheckYear = (year: number): void => {
    setCurrentPage(1);

    const updatedYears = years.map((y) => {
      if (y.year === year) {
        return { ...y, isChecked: !y.isChecked };
      }

      return { ...y };
    });

    setYears(updatedYears);
  }

  const setAllTaggedFilters = (): void => {
    const initFilters: IArticleFilter[] = []

    types.filter((t) => t.isChecked).forEach((t) => {
      initFilters.push({
        type: 'type',
        value: t.value,
        labelPath: t.labelPath
      })
    })

    years.filter((y) => y.isChecked).forEach((y) => {
      initFilters.push({
        type: 'year',
        value: y.year,
        label: y.year
      })
    })

    setTaggedFilters(initFilters)
  }

  const onCloseTaggedFilter = (type: ArticleTypeFilter, value: string | number): void => {
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
    }
  }

  const clearTaggedFilters = (): void => {
    const updatedTypes = types.map((t) => {
      return { ...t, isChecked: false };
    });

    const updatedYears = years.map((y) => {
      return { ...y, isChecked: false };
    });

    setTypes(updatedTypes);
    setYears(updatedYears);
    setTaggedFilters([]);
  }

  useEffect(() => {
    setAllTaggedFilters()
  }, [types, years])

  const toggleAbstract = (articleId?: number): void => {
    if (!articleId) return

    const updatedArticles = enhancedArticles.map((article) => {
      if (article?.id === articleId) {
        return {
          ...article,
          openedAbstract: !article.openedAbstract
        }
      }

      return { ...article };
    });

    setEnhancedArticles(updatedArticles)
  }

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts

    const updatedArticles = enhancedArticles.map((article) => ({
      ...article,
      openedAbstract: isShown
    }));

    setEnhancedArticles(updatedArticles)
    setShowAllAbstracts(isShown)
  }

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` }
  ];

  return (
    <main className='articles'>
      <PageTitle title={t('pages.articles.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.articles.title')} />

      <div className='articles-title'>
        <h1 className='articles-title-text'>{t('pages.articles.title')}</h1>
        <div className='articles-title-count'>
          {totalArticlesCount > 1 ? (
            <div className='articles-title-count-text'>{totalArticlesCount} {t('common.articles')}</div>
          ) : (
            <div className='articles-title-count-text'>{totalArticlesCount} {t('common.article')}</div>
          )}
          <div className="articles-title-count-filtersMobile">
            <div className="articles-title-count-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
              <img className="articles-title-count-filtersMobile-tile-icon" src={filter} alt='List icon' />
              <div className="articles-title-count-filtersMobile-tile-text">
                {taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}
              </div>
            </div>
            {openedFiltersMobileModal && (
              <ArticlesMobileModal 
                t={t} 
                initialTypes={types} 
                onUpdateTypesCallback={setTypes} 
                initialYears={years} 
                onUpdateYearsCallback={setYears} 
                onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="articles-filters">
        {taggedFilters.length > 0 && (
          <div className="articles-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag 
                key={index} 
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} 
                onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
              />
            ))}
            <div className="articles-filters-tags-clear" onClick={clearTaggedFilters}>
              {t('common.filters.clearAll')}
            </div>
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
          <ArticlesSidebar 
            t={t} 
            types={types} 
            onCheckTypeCallback={onCheckType} 
            years={years} 
            onCheckYearCallback={onCheckYear} 
          />
          {isFetchingArticles ? (
            <Loader />
          ) : (
            <div className='articles-content-results-cards'>
              {enhancedArticles.map((article, index) => (
                <ArticleCard
                  key={index}
                  language={language}
                  rvcode={rvcode}
                  t={t}
                  article={article as IArticleCard}
                  toggleAbstractCallback={(): void => toggleAbstract(article?.id)}
                />
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={ARTICLES_PER_PAGE}
          totalItems={totalArticlesCount}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
} 