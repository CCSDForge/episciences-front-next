'use client';

import { FilterIcon } from '@/components/icons';
import { AvailableLanguage } from '@/utils/i18n';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useAppSelector } from '@/hooks/store';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { useFetchArticlesQuery } from '@/store/features/article/article.query';
import { IArticle } from '@/types/article';
import { FetchedArticle, articleTypes } from '@/utils/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import ArticleCard, { IArticleCard } from '@/components/Cards/ArticleCard/ArticleCard';

// Lazy load mobile modal - only loaded when filters button is clicked
const ArticlesMobileModal = dynamic(
  () => import('@/components/Modals/ArticlesMobileModal/ArticlesMobileModal'),
  { ssr: false, loading: () => null }
);

import ArticlesSidebar, {
  IArticleTypeSelection,
  IArticleYearSelection,
} from '@/components/Sidebars/ArticlesSidebar/ArticlesSidebar';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import './Articles.scss';
import PageTitle from '@/components/PageTitle/PageTitle';
import { handleKeyboardClick } from '@/utils/keyboard';

type ArticleTypeFilter = 'type' | 'year';

interface IArticleFilter {
  type: ArticleTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}

type EnhancedArticle = FetchedArticle & {
  openedAbstract: boolean;
};

interface ArticlesClientProps {
  readonly initialArticles: {
    data: IArticle[];
    totalItems: number;
    range?: {
      years?: number[];
      types?: string[];
    };
  };
  readonly lang?: string;
  readonly breadcrumbLabels?: {
    home: string;
    content: string;
    articles: string;
  };
  readonly countLabels?: {
    article: string;
    articles: string;
  };
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

function removeFromSet<T>(source: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(source);
  next.delete(value);
  return next;
}

export default function ArticlesClient({
  initialArticles,
  lang,
  breadcrumbLabels,
  countLabels,
}: ArticlesClientProps): React.JSX.Element {
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

  const ARTICLES_PER_PAGE = 20;

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // The query string is the source of truth for the current page.
  const pageFromUrl = searchParams?.get('page');
  const parsedPage = pageFromUrl ? Math.max(1, Number.parseInt(pageFromUrl, 10)) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : parsedPage;

  // Only the user's own choices live in state; the lists themselves are derived below.
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set());
  const [checkedYears, setCheckedYears] = useState<Set<number>>(new Set());
  const [openedAbstractIds, setOpenedAbstractIds] = useState<Set<number>>(new Set());
  const [showAllAbstracts, setShowAllAbstracts] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const isMounted = useIsHydrated();

  // Sorted so the query cache key stays stable regardless of the order boxes were ticked.
  const selectedTypes = useMemo(
    () => Array.from(checkedTypes).sort((a, b) => a.localeCompare(b)),
    [checkedTypes]
  );
  const selectedYears = useMemo(
    () => Array.from(checkedYears).sort((a, b) => b - a),
    [checkedYears]
  );

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  // Skip fetch on page 1 without filters - use server data (ISR handles freshness)
  // Fetch only when user interacts (pagination, filters)
  const shouldSkipFetch =
    !rvcode ||
    isStaticBuild ||
    (currentPage === 1 && selectedTypes.length === 0 && selectedYears.length === 0);

  const { data: articles, isFetching: isFetchingArticles } = useFetchArticlesQuery(
    {
      rvcode: rvcode!,
      page: currentPage,
      itemsPerPage: ARTICLES_PER_PAGE,
      types: selectedTypes,
      years: selectedYears,
    },
    {
      skip: shouldSkipFetch,
      refetchOnMountOrArgChange: false,
    }
  );

  // Available facets: the API range wins, otherwise they are extracted from the current page.
  const types = useMemo<IArticleTypeSelection[]>(() => {
    const fromRange = initialArticles?.range?.types ?? [];
    const fromData = Array.from(
      new Set((initialArticles?.data ?? []).map((article: any) => article.tag).filter(Boolean))
    );
    const source = fromRange.length > 0 ? fromRange : fromData;

    return source
      .filter(t => articleTypes.some(at => at.value === t))
      .map(t => {
        const matchingType = articleTypes.find(at => at.value === t)!;
        return {
          labelPath: matchingType.labelPath,
          value: matchingType.value,
          isChecked: checkedTypes.has(matchingType.value),
        };
      });
  }, [initialArticles, checkedTypes]);

  const years = useMemo<IArticleYearSelection[]>(() => {
    const fromRange = initialArticles?.range?.years ?? [];
    const fromData = Array.from(
      new Set(
        (initialArticles?.data ?? [])
          .map((article: any) =>
            article.publicationDate ? new Date(article.publicationDate).getFullYear() : undefined
          )
          .filter((year): year is number => year !== undefined)
      )
    );
    const source = fromRange.length > 0 ? fromRange : fromData;

    return [...source]
      .sort((a, b) => b - a)
      .map(y => ({ year: y, isChecked: checkedYears.has(y) }));
  }, [initialArticles, checkedYears]);

  /** The list to display plus its total, with a signature used to detect real changes. */
  interface ArticlesView {
    items: EnhancedArticle[];
    total: number;
    signature: string;
  }

  const buildView = (data: any[], total: number): ArticlesView => {
    const items = data
      .filter((article: any) => article?.title)
      .map((article: any) => ({ ...article, openedAbstract: false })) as EnhancedArticle[];

    return { items, total, signature: `${items.map(a => a.id).join(',')}|${total}` };
  };

  const initialView = useMemo(
    () => buildView(initialArticles?.data ?? [], initialArticles?.totalItems || 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialArticles]
  );

  /**
   * The view the current inputs ask for, or null while RTK Query is still enriching a
   * freshly fetched page (its first payload has no titles yet).
   */
  const requestedView = useMemo<ArticlesView | null>(() => {
    // En mode statique : filtrage et pagination côté client
    if (isStaticBuild) {
      let filtered = Array.isArray(initialArticles?.data) ? initialArticles.data : [];

      if (selectedTypes.length > 0) {
        filtered = filtered.filter((article: any) => selectedTypes.includes(article.tag || ''));
      }

      if (selectedYears.length > 0) {
        filtered = filtered.filter((article: any) =>
          selectedYears.includes(new Date(article.publicationDate).getFullYear())
        );
      }

      const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
      return buildView(filtered.slice(startIndex, startIndex + ARTICLES_PER_PAGE), filtered.length);
    }

    // Page 1 without filters: the fetch is skipped, the server payload is authoritative
    if (shouldSkipFetch) {
      return initialView;
    }

    if (!articles) return null;

    // Wait for onQueryStarted to enrich the partial payload with full article details
    if (!articles.data.some(article => article?.title)) return null;

    return buildView(articles.data, articles.totalItems || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isStaticBuild,
    initialArticles,
    initialView,
    selectedTypes,
    selectedYears,
    currentPage,
    shouldSkipFetch,
    articles,
  ]);

  // Keep the last complete view on screen while a new page is being enriched, adjusting
  // state during render rather than in an effect.
  const [displayedView, setDisplayedView] = useState<ArticlesView>(initialView);
  if (requestedView && requestedView.signature !== displayedView.signature) {
    setDisplayedView(requestedView);
  }

  const totalArticlesCount = displayedView.total;
  const enhancedArticles = useMemo<EnhancedArticle[]>(
    () =>
      displayedView.items.map(article => ({
        ...article,
        openedAbstract: openedAbstractIds.has(article.id as number),
      })),
    [displayedView, openedAbstractIds]
  );

  const handlePageClick = useCallback(
    (selectedItem: { selected: number }): void => {
      const newPage = selectedItem.selected + 1;
      if (pathname) {
        router.push(`${pathname}?page=${newPage}`);
      }
      // Announce page change to screen readers
      setAnnouncement(t('common.pagination.pageLoaded', { page: newPage }));
      // Scroll vers le haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pathname, router, t]
  );

  /** Returns to page 1: the router push is what actually resets `currentPage`. */
  const resetToFirstPage = (): void => {
    if (pathname) {
      router.push(pathname);
    }
  };

  const onCheckType = (value: string): void => {
    setCheckedTypes(prev => toggleInSet(prev, value));
    resetToFirstPage();
  };

  const onCheckYear = (year: number): void => {
    setCheckedYears(prev => toggleInSet(prev, year));
    resetToFirstPage();
  };

  /** Replaces a whole selection, e.g. when the mobile modal applies its filters. */
  const updateTypes = (updated: IArticleTypeSelection[]): void =>
    setCheckedTypes(new Set(updated.filter(t => t.isChecked).map(t => t.value)));

  const updateYears = (updated: IArticleYearSelection[]): void =>
    setCheckedYears(new Set(updated.filter(y => y.isChecked).map(y => y.year)));

  const onCloseTaggedFilter = (type: ArticleTypeFilter, value: string | number): void => {
    if (type === 'type') {
      setCheckedTypes(prev => removeFromSet(prev, String(value)));
    } else if (type === 'year') {
      setCheckedYears(prev => removeFromSet(prev, Number(value)));
    }
  };

  const clearTaggedFilters = (): void => {
    setCheckedTypes(new Set());
    setCheckedYears(new Set());
  };

  // Pure projection of the current selections: derived during render, not in an effect.
  const taggedFilters = useMemo<IArticleFilter[]>(
    () => [
      ...types
        .filter(t => t.isChecked)
        .map(t => ({ type: 'type' as const, value: t.value, labelPath: t.labelPath })),
      ...years
        .filter(y => y.isChecked)
        .map(y => ({ type: 'year' as const, value: y.year, label: y.year })),
    ],
    [types, years]
  );

  const toggleAbstract = (articleId?: number): void => {
    if (!articleId) return;
    setOpenedAbstractIds(prev => toggleInSet(prev, articleId));
  };

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts;

    setOpenedAbstractIds(
      isShown
        ? new Set(enhancedArticles.map(article => article.id as number).filter(Boolean))
        : new Set()
    );
    setShowAllAbstracts(isShown);

    // Announce state change to screen readers
    setAnnouncement(
      isShown ? t('common.toggleAbstracts.allExpanded') : t('common.toggleAbstracts.allCollapsed')
    );
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
      <LiveRegion message={announcement} />
      <PageTitle title={breadcrumbLabels?.articles || t('pages.articles.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.articles || t('pages.articles.title')}
        lang={lang}
      />

      <div className="articles-title">
        <h1 className="articles-title-text">
          {breadcrumbLabels?.articles || t('pages.articles.title')}
        </h1>
        <div className="articles-title-count">
          {totalArticlesCount > 1 ? (
            <div className="articles-title-count-text">
              {totalArticlesCount} {countLabels?.articles || t('common.articles')}
            </div>
          ) : (
            <div className="articles-title-count-text">
              {totalArticlesCount} {countLabels?.article || t('common.article')}
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
              <ArticlesMobileModal
                t={t}
                initialTypes={types}
                onUpdateTypesCallback={updateTypes}
                initialYears={years}
                onUpdateYearsCallback={updateYears}
                onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="articles-filters">
        {taggedFilters.length > 0 && (
          <div className="articles-filters-tags">
            {taggedFilters.map(filter => (
              <Tag
                key={`${filter.type}-${filter.value}`}
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.type, filter.value)}
              />
            ))}
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
          <ArticlesSidebar
            t={t}
            types={types}
            onCheckTypeCallback={onCheckType}
            years={years}
            onCheckYearCallback={onCheckYear}
          />
          {isMounted && isFetchingArticles && enhancedArticles.length === 0 ? (
            <Loader />
          ) : (
            <div className="articles-content-results-cards">
              {enhancedArticles.map(article => (
                <ArticleCard
                  key={article?.id}
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
