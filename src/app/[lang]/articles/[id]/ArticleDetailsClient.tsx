"use client";

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { MathJax } from 'better-react-mathjax';
import { useRouter } from 'next/navigation';
import { Link } from '@/components/Link/Link';
import { isMobileOnly } from "react-device-detect";

import caretUpGrey from '/public/icons/caret-up-grey.svg';
import caretDownGrey from '/public/icons/caret-down-grey.svg';
import caretUpRed from '/public/icons/caret-up-red.svg';
import caretDownRed from '/public/icons/caret-down-red.svg';
import orcid from '/public/icons/orcid.svg';
import { PATHS, BREADCRUMB_PATHS } from '@/config/paths';
import { useAppSelector } from "@/hooks/store";
import { IArticle, IArticleAuthor, IArticleRelatedItem } from "@/types/article";
import { IVolume } from "@/types/volume";
import { articleTypes, CITATION_TEMPLATE, getCitations, ICitation, METADATA_TYPE, INTER_WORK_RELATIONSHIP } from '@/utils/article';
import { AvailableLanguage } from '@/utils/i18n';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from "@/components/Loader/Loader";
import ArticleDetailsSidebar from "@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar";
import CollapsibleSection from './components/CollapsibleSection';
import CollapsibleInstitutions from './components/CollapsibleInstitutions';
import AbstractSection from './components/AbstractSection';
import KeywordsSection from './components/KeywordsSection';
import LinkedPublicationsSection from './components/LinkedPublicationsSection';
import CitedBySection from './components/CitedBySection';
import ReferencesSection from './components/ReferencesSection';
import PreviewSection from './components/PreviewSection';
import { fetchVolume } from '@/services/volume';
import { fetchArticleMetadata } from '@/services/article';
import './ArticleDetails.scss';

interface ArticleDetailsClientProps {
  article: IArticle | null;
  id: string;
  initialRelatedVolume?: IVolume | null;
  initialMetadataCSL?: string | null;
  initialMetadataBibTeX?: string | null;
}

interface EnhancedArticleAuthor extends IArticleAuthor {
  institutionsKeys: number[];
}

enum ARTICLE_SECTION {
  GRAPHICAL_ABSTRACT = 'graphicalAbstract',
  ABSTRACT = 'abstract',
  KEYWORDS = 'keywords',
  REFERENCES = 'references',
  LINKED_PUBLICATIONS = 'linkedPublications',
  CITED_BY = 'citedBy',
  PREVIEW = 'preview'
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsClient({ 
  article, 
  id, 
  initialRelatedVolume,
  initialMetadataCSL,
  initialMetadataBibTeX 
}: ArticleDetailsClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  
  const [relatedVolume, setRelatedVolume] = useState<IVolume | undefined>(initialRelatedVolume || undefined);
  const [metadataCSL, setMetadataCSL] = useState<string | null>(initialMetadataCSL || null);
  const [metadataBibTeX, setMetadataBibTeX] = useState<string | null>(initialMetadataBibTeX || null);
  const [isLoading, setIsLoading] = useState(!initialRelatedVolume && !initialMetadataCSL);

  const [openedSections, setOpenedSections] = useState<{ key: ARTICLE_SECTION, isOpened: boolean }[]>([
    { key: ARTICLE_SECTION.GRAPHICAL_ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.KEYWORDS, isOpened: true },
    { key: ARTICLE_SECTION.REFERENCES, isOpened: true },
    { key: ARTICLE_SECTION.LINKED_PUBLICATIONS, isOpened: true },
    { key: ARTICLE_SECTION.CITED_BY, isOpened: true },
    { key: ARTICLE_SECTION.PREVIEW, isOpened: true }
  ]);
  const [authors, setAuthors] = useState<EnhancedArticleAuthor[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [citations, setCitations] = useState<ICitation[]>([]);

  // Debug: Log metadata values when they change
  useEffect(() => {
    console.log('[Metadata Debug] metadataCSL:', metadataCSL);
    console.log('[Metadata Debug] metadataBibTeX:', metadataBibTeX);
  }, [metadataCSL, metadataBibTeX]);

  useEffect(() => {
    async function fetchData() {
      // Skip client-side fetching if data was provided server-side
      if (initialRelatedVolume !== undefined && initialMetadataCSL !== undefined) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Si nous sommes en mode statique, ne pas effectuer d'appels API
        if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
          setIsLoading(false);
          return;
        }
        
        // Only fetch volume if not provided server-side
        if (!initialRelatedVolume && article?.volumeId && rvcode) {
          const volumeData = await fetchVolume({ 
            rvcode, 
            vid: article.volumeId.toString(), 
            language 
          });
          setRelatedVolume(volumeData || undefined);
        }
        
        // Only fetch metadata if not provided server-side
        if (!initialMetadataCSL && !initialMetadataBibTeX && id && rvcode) {
          const [cslData, bibtexData] = await Promise.all([
            fetchArticleMetadata({ rvcode, paperid: id, type: METADATA_TYPE.CSL }),
            fetchArticleMetadata({ rvcode, paperid: id, type: METADATA_TYPE.BIBTEX })
          ]);
          setMetadataCSL(cslData);
          setMetadataBibTeX(bibtexData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [article, id, rvcode, language, initialRelatedVolume, initialMetadataCSL, initialMetadataBibTeX]);

  useEffect(() => {
    if (article && article.authors && authors.length === 0 && institutions.length === 0) {
      const allAuthors: EnhancedArticleAuthor[] = [];
      const allInstitutionsSet = new Set<string>();

      article.authors.forEach((author) => {
        const enhancedAuthor: EnhancedArticleAuthor = { ...author, institutionsKeys: [] };

        author.institutions?.forEach((institution) => {
          if (!allInstitutionsSet.has(institution.name)) {
            allInstitutionsSet.add(institution.name);
          }

          const institutionIndex = Array.from(allInstitutionsSet).indexOf(institution.name);
          enhancedAuthor.institutionsKeys.push(institutionIndex);
        });

        allAuthors.push(enhancedAuthor);
      });

      setAuthors(allAuthors)
      setInstitutions(Array.from(allInstitutionsSet))
    }
  }, [article])

  const renderArticleTitleAndAuthors = (isMobile: boolean): JSX.Element => {
    return (
      <>
        <h1 className={`articleDetails-content-article-title ${isMobile && 'articleDetails-content-article-title-mobile'}`}>
          <MathJax dynamic>{article?.title}</MathJax>
        </h1>
        {authors.length > 0 ? (
          <CollapsibleInstitutions 
            authors={authors} 
            institutions={institutions} 
            isMobile={isMobile} 
          />
        ) : (
          <div>No authors processed yet</div>
        )}
      </>
    )
  }

  const renderSection = (sectionKey: ARTICLE_SECTION, sectionTitle: string, sectionContent: JSX.Element | null): JSX.Element | null => {
    if (!sectionContent) return null

    const isOpenedSection = openedSections.find(section => section.key === sectionKey)?.isOpened

    return (
      <div className='articleDetails-content-article-section'>
        <div className={`articleDetails-content-article-section-title ${!isOpenedSection && 'articleDetails-content-article-section-closed'}`} onClick={(): void => toggleSection(sectionKey)}>
          <div className='articleDetails-content-article-section-title-text'>{sectionTitle}</div>
          {isOpenedSection ? (
            <img className='articleDetails-content-article-section-title-caret' src={caretUpRed} alt='Caret up icon' />
          ) : (
            <img className='articleDetails-content-article-section-title-caret' src={caretDownRed} alt='Caret down icon' />
          )}
        </div>
        <div className={`articleDetails-content-article-section-content ${isOpenedSection && 'articleDetails-content-article-section-content-opened'}`}>{sectionContent}</div>
      </div>
    )
  }

  const toggleSection = (sectionKey: ARTICLE_SECTION) => {
    const updatedSections = openedSections.map((section) => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }
      return { ...section };
    });

    setOpenedSections(updatedSections);
  }

  const getGraphicalAbstractSection = (): JSX.Element | null => {
    const graphicalAbstractURL = (rvcode && article?.graphicalAbstract) ? `https://${rvcode}.episciences.org/public/documents/${article.id}/${article?.graphicalAbstract}` : null
    
    return graphicalAbstractURL ? <img src={graphicalAbstractURL} className="articleDetails-content-article-section-content-graphicalAbstract" /> : null
  }

  const getAbstractSection = (): JSX.Element | null => {
    if (!article?.abstract) {
      return null;
    }

    return (
      <AbstractSection
        abstractData={article.abstract}
        currentLanguage={language}
      />
    );
  }

  const getKeywordsSection = (): JSX.Element | null => {
    if (!article?.keywords) {
      return null;
    }

    // Check if keywords is empty (array or object)
    const hasKeywords = Array.isArray(article.keywords)
      ? article.keywords.length > 0
      : Object.keys(article.keywords).some(lang => {
          // Type guard: ensure keywords is an object (IArticleKeywords)
          if (typeof article.keywords === 'object' && !Array.isArray(article.keywords)) {
            const langKeywords = article.keywords[lang as keyof typeof article.keywords];
            return Array.isArray(langKeywords) && langKeywords.length > 0;
          }
          return false;
        });

    if (!hasKeywords) {
      return null;
    }

    return (
      <KeywordsSection
        keywordsData={article.keywords}
        currentLanguage={language as AvailableLanguage}
      />
    );
  }

  const getLinkedPublicationsSection = (): JSX.Element | null => {
    if (!article?.relatedItems || article.relatedItems.length === 0) {
      return null;
    }

    // Filter out specific relationship types to match LinkedPublicationsSection logic
    const filteredItems = article.relatedItems.filter(
      (relatedItem) =>
        relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.IS_SAME_AS &&
        relatedItem.relationshipType !== INTER_WORK_RELATIONSHIP.HAS_PREPRINT
    );

    // If no items remain after filtering, return null
    if (filteredItems.length === 0) {
      return null;
    }

    return <LinkedPublicationsSection relatedItems={article.relatedItems} />;
  }

  const getReferencesSection = (): JSX.Element | null => {
    return article?.references ? (
      <ReferencesSection references={article.references} />
    ) : null;
  }

  const getCitedBySection = (): JSX.Element | null => {
    return article?.citedBy ? (
      <CitedBySection citedBy={article.citedBy} />
    ) : null;
  }

  const getPreviewSection = (): JSX.Element | null => {
    if (!article?.pdfLink) {
      return null;
    }

    // PreviewSection handles the viewer choice (iframe vs PDF.js) internally
    return <PreviewSection pdfLink={article.pdfLink} />;
  }

  const renderMetrics = (): JSX.Element | undefined => {
    if (article?.metrics && (article.metrics.views > 0 || article.metrics.downloads > 0)) {
      return (
        <div className="articleDetailsSidebar-metrics">
          <div className="articleDetailsSidebar-metrics-title">{t('pages.articleDetails.metrics.title')}</div>
          <div className="articleDetailsSidebar-metrics-data">
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.views}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">{t('pages.articleDetails.metrics.views')}</div>
            </div>
            <div className="articleDetailsSidebar-metrics-data-divider"></div>
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.downloads}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">{t('pages.articleDetails.metrics.downloads')}</div>
            </div>
          </div>
        </div>
      )
    }

    return;
  }

  useEffect(() => {
    const fetchCitations = async () => {
      console.log('[Citations Debug] Starting citation fetch...');
      console.log('[Citations Debug] metadataCSL:', metadataCSL?.substring(0, 200));
      console.log('[Citations Debug] metadataBibTeX:', metadataBibTeX?.substring(0, 200));

      const fetchedCitations = await getCitations(metadataCSL as string);
      console.log('[Citations Debug] Fetched citations:', fetchedCitations);

      // Update the BibTeX citation with the proper content
      const bibtexIndex = fetchedCitations.findIndex(citation => citation.key === CITATION_TEMPLATE.BIBTEX);
      if (bibtexIndex !== -1 && metadataBibTeX) {
        fetchedCitations[bibtexIndex].citation = metadataBibTeX as string;
      }

      // Filter out citations with empty content
      const validCitations = fetchedCitations.filter(citation => citation.citation && citation.citation.trim() !== '');
      console.log('[Citations Debug] Valid citations after filtering:', validCitations);

      setCitations(validCitations);
    };

    fetchCitations();
  }, [metadataCSL, metadataBibTeX]);

  return (
    <main className='articleDetails'>
      {/* Tracking pixel for article views - appears in Apache logs as /articles/[id]/preview */}
      {article?.id && (
        <img
          src={`/articles/${article.id}/preview`}
          alt=""
          width="1"
          height="1"
          style={{ position: 'absolute', visibility: 'hidden' }}
          aria-hidden="true"
        />
      )}
      <Breadcrumb
        parents={[
          { path: BREADCRUMB_PATHS.home, label: `${t('pages.home.title')} > ${t('common.content')} >` },
          { path: BREADCRUMB_PATHS.articles, label: `${t('pages.articles.title')} >` }
        ]}
        crumbLabel={article?.title.length ? article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title : ''}
      />
      {isLoading ? (
        <Loader />
      ) : (
        <>
          {article?.tag && <div className='articleDetails-tag'>{t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}</div>}
          <div className="articleDetails-content">
            {renderArticleTitleAndAuthors(true)}
            <ArticleDetailsSidebar language={language} t={t} article={article as IArticle | undefined} relatedVolume={relatedVolume} citations={citations} metrics={renderMetrics()} />
            <div className="articleDetails-content-article">
              {renderArticleTitleAndAuthors(false)}
              {renderSection(ARTICLE_SECTION.GRAPHICAL_ABSTRACT, t('pages.articleDetails.sections.graphicalAbstract'), getGraphicalAbstractSection())}
              {renderSection(ARTICLE_SECTION.ABSTRACT, t('pages.articleDetails.sections.abstract'), getAbstractSection())}
              {renderSection(ARTICLE_SECTION.KEYWORDS, t('pages.articleDetails.sections.keywords'), getKeywordsSection())}
              {renderSection(ARTICLE_SECTION.LINKED_PUBLICATIONS, t('pages.articleDetails.sections.linkedPublications'), getLinkedPublicationsSection())}
              {renderSection(ARTICLE_SECTION.CITED_BY, t('pages.articleDetails.sections.citedBy'), getCitedBySection())}
              {renderSection(ARTICLE_SECTION.REFERENCES, t('pages.articleDetails.sections.references'), getReferencesSection())}
              {renderSection(ARTICLE_SECTION.PREVIEW, t('pages.articleDetails.sections.preview'), getPreviewSection())}
              {isMobileOnly && renderMetrics()}
            </div>
          </div>
        </>
      )}
    </main>
  )
}