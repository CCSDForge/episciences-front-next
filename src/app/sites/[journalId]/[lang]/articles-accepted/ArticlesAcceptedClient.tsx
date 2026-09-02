'use client';

import { FilterIcon } from '@/components/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/PageTitle/PageTitle';

// import filter from '/icons/filter.svg';
import { useAppSelector } from '@/hooks/store';
import { useFetchArticlesQuery } from '@/store/features/article/article.query';
import { FetchedArticle, articleTypes } from '@/utils/article';
import { AvailableLanguage } from '@/utils/i18n';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import ArticleAcceptedCard, {
  IArticleAcceptedCard,
} from '@/components/Cards/ArticleAcceptedCard/ArticleAcceptedCard';

// Lazy load mobile modal
const ArticlesAcceptedMobileModal = dynamic(
  () => import('@/components/Modals/ArticlesAcceptedMobileModal/ArticlesAcceptedMobileModal'),
  { ssr: false, loading: () => null }
);

import ArticlesAcceptedSidebar, {
  IArticleTypeSelection,
} from '@/components/Sidebars/ArticlesAcceptedSidebar/ArticlesAcceptedSidebar';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import './ArticlesAccepted.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

interface IArticleAcceptedFilter {
  value: string | number;
  label?: number;
  labelPath?: string;
}

type EnhancedArticleAccepted = FetchedArticle & {
  openedAbstract: boolean;
};

function buildTypeSelections(
  rangeTypes: string[],
  checkedValues: ReadonlySet<string>
): IArticleTypeSelection[] {
  return rangeTypes
    .filter(t => articleTypes.some(at => at.value === t))
    .map(t => {
      const matchingType = articleTypes.find(at => at.value === t)!;
      return {
        labelPath: matchingType.labelPath,
        value: matchingType.value,
        isChecked: checkedValues.has(matchingType.value),
      };
    });
}

interface ArticlesAcceptedClientProps {
  readonly initialArticles: {
    data: any[];
    totalItems: number;
  };
  readonly initialRange: {
    types?: string[];
    years?: number[];
  };
  readonly lang?: string;
  readonly breadcrumbLabels?: {
    home: string;
    content: string;
    articlesAccepted: string;
  };
}

export default function ArticlesAcceptedClient({
  initialArticles,
  initialRange,
  lang,
  breadcrumbLabels,
}: ArticlesAcceptedClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const ARTICLES_ACCEPTED_PER_PAGE = 10;

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const isHydrated = useIsHydrated();
  const [currentPage, setCurrentPage] = useState(1);
  // Only the user's own choices live in state; the lists themselves are derived below.
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set());
  const [openedAbstractIds, setOpenedAbstractIds] = useState<Set<number>>(new Set());
  const [showAllAbstracts, setShowAllAbstracts] = useState(false);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  // Sorted so the query cache key stays stable regardless of the order boxes were ticked.
  const selectedTypes = useMemo(
    () => Array.from(checkedTypes).sort((a, b) => a.localeCompare(b)),
    [checkedTypes]
  );

  const { data: articlesAccepted, isFetching: isFetchingArticlesAccepted } = useFetchArticlesQuery(
    {
      rvcode: rvcode!,
      page: currentPage,
      itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE,
      onlyAccepted: true,
      types: selectedTypes,
    },
    {
      skip: !rvcode || isStaticBuild,
      refetchOnMountOrArgChange: !isStaticBuild,
    }
  );

  // The server range wins when it has entries; otherwise fall back to the API facets.
  const types = useMemo(() => {
    const initial = Array.isArray(initialRange?.types) ? initialRange.types : [];
    const fetched = articlesAccepted?.range?.types;
    const rangeTypes = initial.length > 0 ? initial : Array.isArray(fetched) ? fetched : [];

    return buildTypeSelections(rangeTypes, checkedTypes);
  }, [initialRange, articlesAccepted, checkedTypes]);

  // Memoize handlePageClick to prevent Pagination re-renders
  const handlePageClick = useCallback((selectedItem: { selected: number }): void => {
    setCurrentPage(selectedItem.selected + 1);
  }, []);

  const onCheckType = (value: string): void => {
    setCurrentPage(1);
    setCheckedTypes(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  /** Replaces the whole selection, e.g. when the mobile modal applies its filters. */
  const updateTypes = (updated: IArticleTypeSelection[]): void => {
    setCheckedTypes(new Set(updated.filter(t => t.isChecked).map(t => t.value)));
  };

  const onCloseTaggedFilter = (value: string | number) => {
    setCheckedTypes(prev => {
      const next = new Set(prev);
      next.delete(String(value));
      return next;
    });
  };

  const clearTaggedFilters = (): void => setCheckedTypes(new Set());

  // Pure projection of the current selection: derived during render, not in an effect.
  const taggedFilters = useMemo<IArticleAcceptedFilter[]>(
    () => types.filter(t => t.isChecked).map(t => ({ value: t.value, labelPath: t.labelPath })),
    [types]
  );

  const toggleAbstract = (articleId?: number): void => {
    if (!articleId) return;

    setOpenedAbstractIds(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  // Utiliser les données initiales si elles sont disponibles
  const displayArticlesAccepted = articlesAccepted || initialArticles;

  // The article list is a projection of whichever payload is current, with the abstract
  // toggles applied on top — no mirroring into state.
  const articlesToRender = useMemo<EnhancedArticleAccepted[]>(() => {
    const source = isStaticBuild ? initialArticles : displayArticlesAccepted;
    const data = Array.isArray(source?.data) ? source.data : [];

    return data
      .filter((article: any) => article?.title)
      .map((article: any) => ({
        ...article,
        openedAbstract: openedAbstractIds.has(article.id),
      }));
  }, [isStaticBuild, initialArticles, displayArticlesAccepted, openedAbstractIds]);

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts;

    setShowAllAbstracts(isShown);
    setOpenedAbstractIds(
      isShown
        ? new Set(articlesToRender.map(article => article.id).filter(Boolean) as number[])
        : new Set()
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
    <main className="articlesAccepted">
      <PageTitle title={breadcrumbLabels?.articlesAccepted || t('pages.articlesAccepted.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.articlesAccepted || t('pages.articlesAccepted.title')}
        lang={lang}
      />
      <div className="articlesAccepted-title">
        <h1 className="articlesAccepted-title-text">
          {breadcrumbLabels?.articlesAccepted || t('pages.articlesAccepted.title')}
        </h1>
        <div className="articlesAccepted-title-count">
          {displayArticlesAccepted && displayArticlesAccepted.totalItems > 1 ? (
            <div className="articlesAccepted-title-count-text">
              {displayArticlesAccepted.totalItems} {t('common.documents')}
            </div>
          ) : (
            <div className="articlesAccepted-title-count-text">
              {displayArticlesAccepted?.totalItems ?? 0} {t('common.document')}
            </div>
          )}
          <div className="articlesAccepted-title-count-filtersMobile">
            <div
              className="articlesAccepted-title-count-filtersMobile-tile"
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
                className="articlesAccepted-title-count-filtersMobile-tile-icon"
                ariaLabel="Filters"
              />
              <div className="articlesAccepted-title-count-filtersMobile-tile-text">
                {taggedFilters.length > 0
                  ? `${t('common.filters.editFilters')} (${taggedFilters.length})`
                  : `${t('common.filters.filter')}`}
              </div>
            </div>
            {openedFiltersMobileModal && (
              <ArticlesAcceptedMobileModal
                t={t}
                initialTypes={types}
                onUpdateTypesCallback={updateTypes}
                onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="articlesAccepted-filters">
        {taggedFilters.length > 0 && (
          <div className="articlesAccepted-filters-tags">
            {taggedFilters.map(filter => (
              <Tag
                key={filter.value}
                text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.value)}
              />
            ))}
            <div
              className="articlesAccepted-filters-tags-clear"
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
          className="articlesAccepted-filters-abstracts"
          role="button"
          tabIndex={0}
          onClick={toggleAllAbstracts}
          onKeyDown={e => handleKeyboardClick(e, toggleAllAbstracts)}
        >
          {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
        </div>
      </div>
      <div
        className="articlesAccepted-filters-abstracts articlesAccepted-filters-abstracts-mobile"
        role="button"
        tabIndex={0}
        onClick={toggleAllAbstracts}
        onKeyDown={e => handleKeyboardClick(e, toggleAllAbstracts)}
      >
        {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
      </div>
      <div className="articlesAccepted-content">
        <div className="articlesAccepted-content-results">
          <ArticlesAcceptedSidebar t={t} types={types} onCheckTypeCallback={onCheckType} />
          {isFetchingArticlesAccepted && isHydrated ? (
            <Loader />
          ) : (
            <div className="articlesAccepted-content-results-cards">
              {articlesToRender.length > 0 ? (
                articlesToRender.map(article => (
                  <ArticleAcceptedCard
                    key={article?.id}
                    language={language}
                    t={t}
                    article={article as IArticleAcceptedCard}
                    toggleAbstractCallback={(): void => toggleAbstract(article?.id)}
                  />
                ))
              ) : (
                <div className="articlesAccepted-content-results-empty">
                  {t('pages.articlesAccepted.noResults')}
                </div>
              )}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={ARTICLES_ACCEPTED_PER_PAGE}
          totalItems={displayArticlesAccepted?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
}
