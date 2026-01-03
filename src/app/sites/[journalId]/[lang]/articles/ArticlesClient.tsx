"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import filter from '/public/icons/filter.svg';
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
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    content: string;
    articles: string;
  };
  countLabels?: {
    article: string;
    articles: string;
  };
}

export default function ArticlesClient({ initialArticles, lang, breadcrumbLabels, countLabels }: ArticlesClientProps): JSX.Element {
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

  const ARTICLES_PER_PAGE = 10;

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  // Initialiser la page depuis les query params ou 1 par défaut
  const pageFromUrl = searchParams?.get('page');
  const initialPage = pageFromUrl ? Math.max(1, parseInt(pageFromUrl, 10)) : 1;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [enhancedArticles, setEnhancedArticles] = useState<EnhancedArticle[]>([])
  const [types, setTypes] = useState<IArticleTypeSelection[]>([])
  const [years, setYears] = useState<IArticleYearSelection[]>([]);
  const [taggedFilters, setTaggedFilters] = useState<IArticleFilter[]>([]);
  const [showAllAbstracts, setShowAllAbstracts] = useState(false)
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [totalArticlesCount, setTotalArticlesCount] = useState<number>(0);

  // Memoize filters to prevent re-renders
  const selectedTypes = useMemo(() => types.filter(t => t.isChecked).map(t => t.value), [types]);
  const selectedYears = useMemo(() => years.filter(y => y.isChecked).map(y => y.year), [years]);

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  const { data: articles, isFetching: isFetchingArticles } = useFetchArticlesQuery(
    { 
      rvcode: rvcode!, 
      page: currentPage, 
      itemsPerPage: ARTICLES_PER_PAGE, 
      types: selectedTypes, 
      years: selectedYears 
    }, 
    { 
      skip: !rvcode || isStaticBuild, 
      refetchOnMountOrArgChange: !isStaticBuild 
    }
  );
  
  // Synchroniser currentPage avec les query params
  useEffect(() => {
    const pageParam = searchParams?.get('page');
    const pageNumber = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    if (!isNaN(pageNumber) && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    }
  }, [searchParams, currentPage]);

  useEffect(() => {
    // En mode statique uniquement : filtrage et pagination côté client
    if (isStaticBuild && initialArticles?.data) {
      const initialData = Array.isArray(initialArticles.data) ? initialArticles.data : [];

      let filteredData = initialData;
      // Use memoized values inside effect? No, we need types and years to be reactive
      const currentSelectedTypes = types.filter(t => t.isChecked).map(t => t.value);
      const currentSelectedYears = years.filter(y => y.isChecked).map(y => y.year);

      if (currentSelectedTypes.length > 0) {
        filteredData = filteredData.filter((article: any) =>
          currentSelectedTypes.includes(article.tag || '')
        );
      }

      if (currentSelectedYears.length > 0) {
        filteredData = filteredData.filter((article: any) => {
          const articleYear = new Date(article.publicationDate).getFullYear();
          return currentSelectedYears.includes(articleYear);
        });
      }

      // En mode statique, on filtre et pagine côté client
      const totalFiltered = filteredData.length;
      setTotalArticlesCount(totalFiltered);

      // Appliquer la pagination côté client
      const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
      const endIndex = startIndex + ARTICLES_PER_PAGE;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setEnhancedArticles(
        paginatedData
          .filter((article: any) => article && article.title)
          .map((article: any) => ({ ...article, openedAbstract: false }))
      );
    }
  }, [initialArticles, types, years, isStaticBuild, currentPage]);

  useEffect(() => {
    if (!isStaticBuild && articles) {
      const displayedArticles = articles?.data
        .filter((article) => article?.title)
        .map((article) => ({ ...article, openedAbstract: false }));

      setTotalArticlesCount(articles.totalItems || 0);
      setEnhancedArticles(displayedArticles as EnhancedArticle[]);
    }
  }, [isStaticBuild, articles]);

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

  const handlePageClick = useCallback((selectedItem: { selected: number }): void => {
    const newPage = selectedItem.selected + 1;
    if (pathname) {
      router.push(`${pathname}?page=${newPage}`);
    }
    setCurrentPage(newPage);
    // Scroll vers le haut de la page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, router]);

  const onCheckType = (value: string): void => {
    const updatedTypes = types.map((t) => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }

      return { ...t };
    });

    setTypes(updatedTypes);
    setCurrentPage(1);
    if (pathname) {
      router.push(pathname); // Retour à la page 1
    }
  }

  const onCheckYear = (year: number): void => {
    const updatedYears = years.map((y) => {
      if (y.year === year) {
        return { ...y, isChecked: !y.isChecked };
      }

      return { ...y };
    });

    setYears(updatedYears);
    setCurrentPage(1);
    if (pathname) {
      router.push(pathname); // Retour à la page 1
    }
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
    { 
      path: '/', 
      label: breadcrumbLabels 
        ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >` 
        : `${t('pages.home.title')} > ${t('common.content')} >` 
    }
  ];

  return (
    <main className='articles'>
      <PageTitle title={breadcrumbLabels?.articles || t('pages.articles.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={breadcrumbLabels?.articles || t('pages.articles.title')} />

      <div className='articles-title'>
        <h1 className='articles-title-text'>{breadcrumbLabels?.articles || t('pages.articles.title')}</h1>
        <div className='articles-title-count'>
          {totalArticlesCount > 1 ? (
            <div className='articles-title-count-text'>{totalArticlesCount} {countLabels?.articles || t('common.articles')}</div>
          ) : (
            <div className='articles-title-count-text'>{totalArticlesCount} {countLabels?.article || t('common.article')}</div>
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