'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { AvailableLanguage } from '@/utils/i18n';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useArticleFilters } from '@/hooks/useArticleFilters';
import { ISection } from '@/types/section';
import { IArticle } from '@/types/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import PaginatedArticleList from '@/components/PaginatedArticleList/PaginatedArticleList';
import PageTitle from '@/components/PageTitle/PageTitle';
import Tag from '@/components/Tag/Tag';
import ArticlesSidebar, {
  ArticlesSidebarTypes,
  ArticlesSidebarYears,
} from '@/components/Sidebars/ArticlesSidebar/ArticlesSidebar';
import { FilterIcon } from '@/components/icons';
import CommitteeMembers from '@/components/CommitteeMembers/CommitteeMembers';
import SectionDetailsSidebar from '@/components/Sidebars/SectionDetailsSidebar/SectionDetailsSidebar';
import './SectionDetails.scss';

// Lazy load mobile modal - only loaded when the filters button is clicked
const ArticlesMobileModal = dynamic(
  () => import('@/components/Modals/ArticlesMobileModal/ArticlesMobileModal'),
  { ssr: false, loading: () => null }
);

interface SectionDetailsClientProps {
  readonly section: ISection;
  readonly articles: IArticle[];
  readonly sectionId: string;
  readonly lang?: string;
  readonly sectionTitle: string;
  readonly sectionDescription: string;
  readonly breadcrumbLabels?: {
    home: string;
    content: string;
    sections: string;
  };
}

export default function SectionDetailsClient({
  section,
  articles,
  sectionId,
  lang,
  sectionTitle,
  sectionDescription,
  breadcrumbLabels,
}: SectionDetailsClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);

  // The server component is the single source of truth for the article list, so it is used
  // directly rather than mirrored into local state. Shown newest first; ISO-like date
  // strings compare lexicographically, which stays deterministic across server and client.
  const displayedArticles = useMemo(
    () =>
      [...(articles ?? [])].sort((a, b) =>
        (b.publicationDate ?? '').localeCompare(a.publicationDate ?? '')
      ),
    [articles]
  );

  const router = useRouter();
  const pathname = usePathname();
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const {
    types,
    years,
    filteredArticles,
    taggedFilters,
    toggleType,
    toggleYear,
    applySelection,
    removeFilter,
    clearFilters,
  } = useArticleFilters(displayedArticles);

  // The hook returns a facet empty when it offers a single choice.
  const hasFilters = types.length > 0 || years.length > 0;

  /** Any filter change goes back to page 1 (drops `?page=`). */
  const withFirstPage =
    <A extends unknown[]>(action: (...args: A) => void) =>
    (...args: A): void => {
      action(...args);
      if (pathname) {
        router.push(pathname, { scroll: false });
      }
    };

  const onCheckType = withFirstPage(toggleType);
  const onCheckYear = withFirstPage(toggleYear);
  const onRemoveFilter = withFirstPage(removeFilter);
  const onClearFilters = withFirstPage(clearFilters);
  const onApplyMobileFilters = withFirstPage(applySelection);

  const renderSectionCommittee = (isMobile: boolean): React.JSX.Element | null => {
    const className = isMobile
      ? 'sectionDetails-content-results-content-committee sectionDetails-content-results-content-committee-mobile'
      : 'sectionDetails-content-results-content-committee';

    if (section?.committee && section.committee.length > 0) {
      return (
        <p className={className}>
          <span className="sectionDetails-content-results-content-committee-note">
            {t('common.editorsLabel')}
          </span>{' '}
          <CommitteeMembers members={section.committee} t={t} />
        </p>
      );
    }
    return null;
  };

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels
        ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >`
        : `${t('pages.home.title')} > ${t('common.content')} >`,
    },
    {
      path: '/sections',
      label: breadcrumbLabels ? `${breadcrumbLabels.sections} >` : `${t('pages.sections.title')} >`,
    },
  ];

  return (
    <main className="sections">
      <PageTitle title={sectionTitle} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={sectionTitle} lang={lang} />

      <div className="sectionDetails-section">
        <div className="sectionDetails-id">
          <h1 className="sectionDetails-id-text">{sectionTitle}</h1>
        </div>
        <div className="sectionDetails-content">
          <div className="sectionDetails-content-results">
            <SectionDetailsSidebar
              language={language}
              t={t}
              section={section}
              articles={displayedArticles}
              currentJournal={currentJournal}
              sectionId={sectionId}
            >
              {hasFilters && (
                <ArticlesSidebar>
                  {types.length > 0 && (
                    <ArticlesSidebarTypes t={t} types={types} onCheckTypeCallback={onCheckType} />
                  )}
                  {years.length > 0 && (
                    <ArticlesSidebarYears t={t} years={years} onCheckYearCallback={onCheckYear} />
                  )}
                </ArticlesSidebar>
              )}
            </SectionDetailsSidebar>
            <div className="sectionDetails-content-results-content">
              {sectionDescription && (
                <div className="sectionDetails-content-results-content-description">
                  <p>{sectionDescription}</p>
                </div>
              )}

              {renderSectionCommittee(false)}

              <div className="sectionDetails-content-results-content-mobileCount">
                {renderSectionCommittee(true)}
                {displayedArticles.length > 1
                  ? `${displayedArticles.length} ${t('common.articles')}`
                  : `${displayedArticles.length} ${t('common.article')}`}
                {hasFilters && (
                  <button
                    type="button"
                    className="sectionDetails-content-results-content-mobileCount-filters"
                    onClick={(): void => setOpenedFiltersMobileModal(true)}
                  >
                    <FilterIcon size={16} />
                    {taggedFilters.length > 0
                      ? `${t('common.filters.editFilters')} (${taggedFilters.length})`
                      : t('common.filters.filter')}
                  </button>
                )}
                {openedFiltersMobileModal && (
                  <ArticlesMobileModal
                    t={t}
                    initialTypes={types}
                    initialYears={years}
                    onApplyFiltersCallback={onApplyMobileFilters}
                    onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}
                  />
                )}
              </div>

              {taggedFilters.length > 0 && (
                <div className="sectionDetails-content-results-content-filters">
                  {taggedFilters.map(filter => (
                    <Tag
                      key={`${filter.type}-${filter.value}`}
                      text={filter.labelPath ? t(filter.labelPath) : String(filter.label)}
                      onCloseCallback={(): void => onRemoveFilter(filter.type, filter.value)}
                    />
                  ))}
                  <button
                    type="button"
                    className="sectionDetails-content-results-content-filters-clear"
                    onClick={onClearFilters}
                  >
                    {t('common.filters.clearAll')}
                  </button>
                </div>
              )}

              {displayedArticles.length > 0 && filteredArticles.length === 0 && (
                <p className="sectionDetails-content-results-content-noMatch">
                  {t('common.filters.noMatchingArticles')}
                </p>
              )}

              {displayedArticles.length > 0 ? (
                <PaginatedArticleList
                  articles={filteredArticles}
                  language={language}
                  t={t}
                  className="sectionDetails-content-results-content-cards"
                />
              ) : (
                <div className="sectionDetails-empty">
                  <div className="sectionDetails-empty-content">
                    <h3>{t('pages.sections.noArticlesTitle')}</h3>
                    <p>{t('pages.sections.noArticlesMessage')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
