'use client';

import { useState } from "react";
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
}

const SECTIONS_PER_PAGE = 10;

export default function SectionsClient({
  initialSections,
  initialPage
}: SectionsClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const language = useAppSelector(state => state.i18nReducer.language);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sections, setSections] = useState(initialSections);
  const [isLoading, setIsLoading] = useState(false);

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    return params.toString();
  };
  
  const handlePageClick = (selectedItem: { selected: number }): void => {
    const newPage = selectedItem.selected + 1;
    const newParams = createQueryString('page', newPage.toString());
    router.push(`${pathname}?${newParams}`);
    setCurrentPage(newPage);
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
              {sections?.data.map((section, index) => (
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
          totalItems={sections?.totalItems}
          onPageChange={handlePageClick}
        />
      </div>
    </main>
  );
} 