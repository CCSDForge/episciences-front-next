'use client';

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useAppSelector } from "@/hooks/store";
import { ISection } from "@/types/section";
import { IArticle } from "@/types/article";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import VolumeArticleCard from "@/components/Cards/VolumeArticleCard/VolumeArticleCard";
import PageTitle from "@/components/PageTitle/PageTitle";
import SectionDetailsSidebar from "@/components/Sidebars/SectionDetailsSidebar/SectionDetailsSidebar";
import './SectionDetails.scss';

interface SectionDetailsClientProps {
  section: ISection;
  articles: IArticle[];
  sectionId: string;
  lang?: string;
}

function SectionDetailsClientInner({
  section,
  articles,
  sectionId,
  lang
}: SectionDetailsClientProps): JSX.Element {
  const { t } = useTranslation();
  const language = useAppSelector(state => state.i18nReducer.language);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  
  const [displayedArticles] = useState<IArticle[]>(articles);

  // Get section title and description based on language
  const sectionTitle = section.title?.[language] || section.title?.en || section.title?.fr || `Section ${sectionId}`;
  const sectionDescription = section.description?.[language] || section.description?.en || section.description?.fr;

  // Breadcrumb configuration
  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` },
    { path: '/sections', label: `${t('pages.sections.title')} >` }
  ];

  return (
    <main className='sectionDetails'>
      <PageTitle title={sectionTitle} />
      
      <Breadcrumb parents={breadcrumbItems} crumbLabel={sectionTitle} lang={lang} />

      <div className="sectionDetails-section">
        <div className="sectionDetails-id">
          <h1 className='sectionDetails-id-text'>{t('pages.sectionDetails.title')} {sectionId}</h1>
        </div>
        <div className="sectionDetails-content">
          <div className='sectionDetails-content-results'>
            <SectionDetailsSidebar 
              language={language}
              t={t}
              section={section}
              articles={displayedArticles}
              currentJournal={currentJournal}
              sectionId={sectionId}
            />
            <div className="sectionDetails-content-results-content">
              <div className='sectionDetails-content-results-content-title'>{sectionTitle}</div>
              
              {sectionDescription && (
                <div className='sectionDetails-content-results-content-description'>
                  <p>{sectionDescription}</p>
                </div>
              )}
              
              <div className='sectionDetails-content-results-content-mobileCount'>
                {displayedArticles.length > 1 ? `${displayedArticles.length} ${t('common.articles')}` : `${displayedArticles.length} ${t('common.article')}`}
              </div>
              
              {displayedArticles.length > 0 ? (
                <div className='sectionDetails-content-results-content-cards'>
                  {displayedArticles.map((article) => (
                    <VolumeArticleCard
                      key={article.id}
                      language={language}
                      t={t}
                      article={article}
                    />
                  ))}
                </div>
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

export default function SectionDetailsClient(props: SectionDetailsClientProps) {
  return (
    <SectionDetailsClientInner {...props} />
  );
}