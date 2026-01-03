'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageTitle from '@/components/PageTitle/PageTitle';

// import filter from '/icons/filter.svg';
import filter from '/public/icons/filter.svg';
import { useAppSelector } from '@/hooks/store';
import { useFetchArticlesQuery } from '@/store/features/article/article.query';
import { FetchedArticle, articleTypes } from '@/utils/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import ArticleAcceptedCard, { IArticleAcceptedCard } from '@/components/Cards/ArticleAcceptedCard/ArticleAcceptedCard';
import ArticlesAcceptedMobileModal from '@/components/Modals/ArticlesAcceptedMobileModal/ArticlesAcceptedMobileModal';
import ArticlesAcceptedSidebar, { IArticleTypeSelection } from '@/components/Sidebars/ArticlesAcceptedSidebar/ArticlesAcceptedSidebar';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import './ArticlesAccepted.scss';

interface IArticleAcceptedFilter {
  value: string | number;
  label?: number;
  labelPath?: string;
}

type EnhancedArticleAccepted = FetchedArticle & {
  openedAbstract: boolean;
}

export default function ArticlesAcceptedClient({ initialArticles, initialRange, lang }: { initialArticles: any, initialRange: any, lang?: string }): JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const ARTICLES_ACCEPTED_PER_PAGE = 10;

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  const [currentPage, setCurrentPage] = useState(1);
  const [enhancedArticlesAccepted, setEnhancedArticlesAccepted] = useState<EnhancedArticleAccepted[]>([])
  const [types, setTypes] = useState<IArticleTypeSelection[]>([])
  const [taggedFilters, setTaggedFilters] = useState<IArticleAcceptedFilter[]>([]);
  const [showAllAbstracts, setShowAllAbstracts] = useState(false)
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false)

  const getSelectedTypes = (): string[] => types.filter(t => t.isChecked).map(t => t.value);

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  const { data: articlesAccepted, isFetching: isFetchingArticlesAccepted } = useFetchArticlesQuery({ 
    rvcode: rvcode!, 
    page: currentPage, 
    itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE, 
    onlyAccepted: true, 
    types: getSelectedTypes() 
  }, { 
    skip: !rvcode || isStaticBuild, 
    refetchOnMountOrArgChange: !isStaticBuild 
  });

  // En mode statique uniquement : utiliser les données initiales
  useEffect(() => {
    if (isStaticBuild && initialArticles?.data) {
      const initialData = Array.isArray(initialArticles.data) ? initialArticles.data : [];
      setEnhancedArticlesAccepted(
        initialData
          .filter((article: any) => article && article.title)
          .map((article: any) => ({ ...article, openedAbstract: false }))
      );
    }
  }, [initialArticles, isStaticBuild]);

  useEffect(() => {
    if (initialRange?.types && types.length === 0) {
      const typesArray = Array.isArray(initialRange.types) ? initialRange.types : [];
      const initTypes = typesArray
        .filter((t: string) => articleTypes.find((at) => at.value === t))
        .map((t: string) => {
          const matchingType = articleTypes.find((at) => at.value === t);
          return {
            labelPath: matchingType!.labelPath,
            value: matchingType!.value,
            isChecked: false
          };
        });
      setTypes(initTypes);
    }
  }, [initialRange, types.length]);

  // En mode non-statique : utiliser les données de l'API query
  useEffect(() => {
    if (!isStaticBuild && articlesAccepted?.data) {
      const articlesData = Array.isArray(articlesAccepted.data) ? articlesAccepted.data : [];
      const displayedArticlesAccepted = articlesData
        .filter((article) => article && article.title)
        .map((article) => ({ ...article, openedAbstract: false }));

      setEnhancedArticlesAccepted(displayedArticlesAccepted as EnhancedArticleAccepted[]);
    }
  }, [isStaticBuild, articlesAccepted?.data]);

  useEffect(() => {
    if (articlesAccepted?.range && articlesAccepted.range.types && types.length === 0) {
      const initTypes = articlesAccepted.range.types
        .filter((t) => articleTypes.find((at) => at.value === t))
        .map((t) => {
        const matchingType = articleTypes.find((at) => at.value === t)

        return {
          labelPath: matchingType!.labelPath,
          value: matchingType!.value,
          isChecked: false
        }
      })

      setTypes(initTypes)
    }
  }, [articlesAccepted?.range, articlesAccepted?.range?.types, types])

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
  }

  const setAllTaggedFilters = (): void => {
    const initFilters: IArticleAcceptedFilter[] = []

    types.filter((t) => t.isChecked).forEach((t) => {
      initFilters.push({
        value: t.value,
        labelPath: t.labelPath
      })
    })

    setTaggedFilters(initFilters)
  }

  const onCloseTaggedFilter = (value: string | number) => {
    const updatedTypes = types.map((t) => {
      if (t.value === value) {
        return { ...t, isChecked: false };
      }

      return t;
    });

    setTypes(updatedTypes);
  }

  const clearTaggedFilters = (): void => {
    const updatedTypes = types.map((t) => {
      return { ...t, isChecked: false };
    });

    setTypes(updatedTypes);
    setTaggedFilters([]);
  }

  useEffect(() => {
    setAllTaggedFilters()
  }, [types])

  const toggleAbstract = (articleId?: number): void => {
    if (!articleId) return

    const updatedArticlesAccepted = enhancedArticlesAccepted.map((article) => {
      if (article?.id === articleId) {
        return {
          ...article,
          openedAbstract: !article.openedAbstract
        }
      }

      return { ...article };
    });

    setEnhancedArticlesAccepted(updatedArticlesAccepted)
  }

  const toggleAllAbstracts = (): void => {
    const isShown = !showAllAbstracts

    const updatedArticlesAccepted = enhancedArticlesAccepted.map((article) => ({
      ...article,
      openedAbstract: isShown
    }));

    setEnhancedArticlesAccepted(updatedArticlesAccepted)
    setShowAllAbstracts(isShown)
  }

  // Utiliser les données initiales si elles sont disponibles
  const displayArticlesAccepted = articlesAccepted || initialArticles;

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` }
  ];

  return (
    <main className='articlesAccepted'>
      <PageTitle title={t('pages.articlesAccepted.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.articlesAccepted.title')} />
      <div className='articlesAccepted-title'>
        <h1 className='articlesAccepted-title-text'>{t('pages.articlesAccepted.title')}</h1>
        <div className='articlesAccepted-title-count'>
          {displayArticlesAccepted && displayArticlesAccepted.totalItems > 1 ? (
            <div className='articlesAccepted-title-count-text'>{displayArticlesAccepted.totalItems} {t('common.documents')}</div>
          ) : (
            <div className='articlesAccepted-title-count-text'>{displayArticlesAccepted?.totalItems ?? 0} {t('common.document')}</div>
          )}
          <div className="articlesAccepted-title-count-filtersMobile">
            <div className="articlesAccepted-title-count-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
              <img className="articlesAccepted-title-count-filtersMobile-tile-icon" src={filter} alt='List icon' />
              <div className="articlesAccepted-title-count-filtersMobile-tile-text">{taggedFilters.length > 0 ? `${t('common.filters.editFilters')} (${taggedFilters.length})` : `${t('common.filters.filter')}`}</div>
            </div>
            {openedFiltersMobileModal && <ArticlesAcceptedMobileModal t={t} initialTypes={types} onUpdateTypesCallback={setTypes} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
          </div>
        </div>
      </div>
      <div className="articlesAccepted-filters">
        {taggedFilters.length > 0 && (
          <div className="articlesAccepted-filters-tags">
            {taggedFilters.map((filter, index) => (
              <Tag key={index} text={filter.labelPath ? t(filter.labelPath) : filter.label!.toString()} onCloseCallback={(): void => onCloseTaggedFilter(filter.value)}/>
            ))}
            <div className="articlesAccepted-filters-tags-clear" onClick={clearTaggedFilters}>{t('common.filters.clearAll')}</div>
          </div>
        )}
        <div className="articlesAccepted-filters-abstracts" onClick={toggleAllAbstracts}>
          {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
        </div>
      </div>
      <div className="articlesAccepted-filters-abstracts articlesAccepted-filters-abstracts-mobile" onClick={toggleAllAbstracts}>
        {`${showAllAbstracts ? t('common.toggleAbstracts.hideAll') : t('common.toggleAbstracts.showAll')}`}
      </div>
      <div className='articlesAccepted-content'>
        <div className='articlesAccepted-content-results'>
          <ArticlesAcceptedSidebar t={t} types={types} onCheckTypeCallback={onCheckType} />
          {isFetchingArticlesAccepted ? (
            <Loader />
          ) : (
            <div className='articlesAccepted-content-results-cards'>
              {enhancedArticlesAccepted.length > 0 ? (
                enhancedArticlesAccepted.map((article, index) => (
                  <ArticleAcceptedCard
                    key={index}
                    language={language}
                    t={t}
                    article={article as IArticleAcceptedCard}
                    toggleAbstractCallback={(): void => toggleAbstract(article?.id)}
                  />
                ))
              ) : displayArticlesAccepted?.data && Array.isArray(displayArticlesAccepted.data) && displayArticlesAccepted.data.length > 0 ? (
                displayArticlesAccepted.data.map((article: any, index: number) => (
                  <ArticleAcceptedCard
                    key={index}
                    language={language}
                    t={t}
                    article={{...article, openedAbstract: false} as IArticleAcceptedCard}
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
  )
} 