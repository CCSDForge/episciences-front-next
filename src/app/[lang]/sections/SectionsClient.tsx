'use client';

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from 'react-i18next';
import PageTitle from '@/components/PageTitle/PageTitle';

import { useAppSelector } from "@/hooks/store";
import { ISection } from '@/types/section';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import SectionCard from "@/components/Cards/SectionCard/SectionCard";
import SectionsSidebar from '@/components/Sidebars/SectionsSidebar/SectionsSidebar';
import Pagination from "@/components/Pagination/Pagination";
import './Sections.scss';

interface SectionsData {
  data: ISection[];
  totalItems: number;
  articlesCount: number;
}

interface SectionsClientProps {
  initialSections: SectionsData | null;
  initialPage: number;
  lang?: string;
}

const SECTIONS_PER_PAGE = 10;

export default function SectionsClient({
  initialSections,
  initialPage,
  lang
}: SectionsClientProps): JSX.Element {
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
  
  const language = useAppSelector(state => state.i18nReducer.language);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  // Initialiser la page depuis les query params ou initialPage
  const pageFromUrl = searchParams.get('page');
  const pageNumber = pageFromUrl ? Math.max(1, parseInt(pageFromUrl, 10)) : initialPage;

  const [currentPage, setCurrentPage] = useState(pageNumber);
  const [sections, setSections] = useState(initialSections);
  const [sectionsData, setSectionsData] = useState(initialSections);
  const [isLoading, setIsLoading] = useState(false);

  // Synchroniser currentPage avec les query params
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const pageNum = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    if (!isNaN(pageNum) && pageNum !== currentPage) {
      setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // Pagination côté client
  useEffect(() => {
    if (initialSections?.data) {
      const startIndex = (currentPage - 1) * SECTIONS_PER_PAGE;
      const endIndex = startIndex + SECTIONS_PER_PAGE;
      const paginatedData = initialSections.data.slice(startIndex, endIndex);

      setSectionsData({
        ...initialSections,
        data: paginatedData,
        totalItems: initialSections.totalItems
      });
    }
  }, [initialSections, currentPage]);

  const handlePageClick = (selectedItem: { selected: number }): void => {
    const newPage = selectedItem.selected + 1;
    router.push(`${pathname}?page=${newPage}`);
    setCurrentPage(newPage);
    // Scroll vers le haut de la page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSectionsCount = (): JSX.Element | null => {
    if (sections) {
      if (sections.totalItems > 1) {
        return <div className='sections-title-count-text sections-title-count-text-sections'>{sections.totalItems} {t('common.sections')}</div>;
      }

      return <div className='sections-title-count-text sections-title-count-text-sections'>{sections.totalItems} {t('common.section')}</div>;  
    }

    return null;
  };

  const getArticlesCount = (): JSX.Element | null => {
    if (sections && sections.articlesCount) {
      if (sections.articlesCount > 1) {
        return <div className='sections-title-count-text sections-title-count-text-articles'>{sections.articlesCount} {t('common.articles')}</div>;
      }

      return <div className='sections-title-count-text sections-title-count-text-articles'>{sections.articlesCount} {t('common.article')}</div>;  
    }

    return null;
  };

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` }
  ];

  return (
    <main className='sections'>
      <PageTitle title={t('pages.sections.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.sections.title')} />
      <div className='sections-title'>
        <h1 className='sections-title-text'>{t('pages.sections.title')}</h1>
        <div className='sections-title-count'>
          {getSectionsCount()}
          {getArticlesCount()}
        </div>
      </div>
      <div className="sections-filters"></div>
      <div className='sections-content'>
        <div className='sections-content-results'>
          <SectionsSidebar />
          {isLoading ? (
            <Loader />
          ) : (
            <div className='sections-content-results-cards'>
              {sectionsData?.data.map((section, index) => (
                <SectionCard
                  key={index}
                  language={language}
                  t={t}
                  section={section}
                />
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemsPerPage={SECTIONS_PER_PAGE}
          totalItems={sectionsData?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
} 