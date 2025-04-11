'use client';

import { useState, useEffect } from "react";
import { useTranslation } from 'next-i18next';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

import { useAppSelector } from "@/hooks/store";
import { ISection } from "@/types/section";
import { IArticle } from "@/types/article";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from "@/components/Loader/Loader";
import SectionArticleCard from "@/components/Cards/SectionArticleCard/SectionArticleCard";
import SectionDetailsSidebar from "@/components/Sidebars/SectionDetailsSidebar/SectionDetailsSidebar";
import './SectionDetails.scss';

interface SectionDetailsClientProps {
  section: ISection | null;
  initialArticles: IArticle[];
}

export default function SectionDetailsClient({ section, initialArticles }: SectionDetailsClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const SECTION_TITLE_BREADCRUMB_LENGTH = 20;

  const language = useAppSelector(state => state.i18nReducer.language);
  const [articles, setArticles] = useState<IArticle[]>(initialArticles);
  const [isLoading, setIsLoading] = useState(false);

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` },
    { path: '/sections', label: `${t('pages.sections.title')} >` }
  ];

  // Si aucune section n'est fournie, afficher un loader
  if (!section) {
    return <Loader />;
  }

  return (
    <main className="sectionDetails">
      <Breadcrumb parents={breadcrumbItems} crumbLabel={section?.title && section.title[language] ? `${section.title[language].substring(0, SECTION_TITLE_BREADCRUMB_LENGTH)}...` : ''} />
      <h1 className="sectionDetails-id">{t('pages.sectionDetails.title')}</h1>
      {isLoading ? (
        <Loader />
      ) : (
        <div className="sectionDetails-content">
          <div className="sectionDetails-content-results">
            <SectionDetailsSidebar t={t} articlesCount={articles.length} />
            <div className="sectionDetails-content-results-content">
              <div className="sectionDetails-content-results-content-title">{section?.title ? section?.title[language] : ''}</div>
              {section?.committee && section.committee.length > 0 && (
                <div className="sectionDetails-content-results-content-committee">{t('common.volumeCommittee')} : {section?.committee.map((member) => member.screenName).join(', ')}</div>
              )}
              <div className="sectionDetails-content-results-content-description">{section?.description ? (
                <ReactMarkdown>{section?.description[language]}</ReactMarkdown>
              ) : ''}</div>
              <div className="sectionDetails-content-results-content-cards">
                {articles.map((article, index) => (
                  <SectionArticleCard
                    key={index}
                    language={language}
                    t={t}
                    article={article}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 