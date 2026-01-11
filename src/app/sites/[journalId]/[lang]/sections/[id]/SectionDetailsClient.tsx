'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { ISection } from '@/types/section';
import { IArticle } from '@/types/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import VolumeArticleCard from '@/components/Cards/VolumeArticleCard/VolumeArticleCard';
import PageTitle from '@/components/PageTitle/PageTitle';
import SectionDetailsSidebar from '@/components/Sidebars/SectionDetailsSidebar/SectionDetailsSidebar';
import './SectionDetails.scss';

interface SectionDetailsClientProps {
  section: ISection;
  articles: IArticle[];
  sectionId: string;
  lang?: string;
  sectionTitle: string;
  sectionDescription: string;
  breadcrumbLabels?: {
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

  const [displayedArticles, setDisplayedArticles] = useState<IArticle[]>(articles);

  useEffect(() => {
    if (articles) {
      setDisplayedArticles(articles);
    }
  }, [articles]);

  const renderSectionCommittee = (isMobile: boolean): React.JSX.Element | null => {
    const className = isMobile
      ? 'sectionDetails-content-results-content-committee sectionDetails-content-results-content-committee-mobile'
      : 'sectionDetails-content-results-content-committee';

    if (section?.committee && section.committee.length > 0) {
      return (
        <div className={className}>
          <span className="sectionDetails-content-results-content-committee-note">
            {t('common.editors')} :
          </span>{' '}
          {section?.committee.map(member => member.screenName).join(', ')}
        </div>
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
          <h1 className="sectionDetails-id-text">
            {t('pages.sectionDetails.title')} {sectionId}
          </h1>
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
            />
            <div className="sectionDetails-content-results-content">
              <div className="sectionDetails-content-results-content-title">{sectionTitle}</div>

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
              </div>

              {displayedArticles.length > 0 ? (
                <div className="sectionDetails-content-results-content-cards">
                  {displayedArticles.map(article => (
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
