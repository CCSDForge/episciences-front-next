'use client';

import React, { useState } from 'react';
import { IArticle, IArticleAuthor } from "@/types/article";
import { IVolume } from "@/types/volume";
import { getCitations, ICitation, CITATION_TEMPLATE } from '@/utils/article';
import { BREADCRUMB_PATHS } from '@/config/paths';
import { AvailableLanguage, defaultLanguage } from '@/utils/i18n';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ArticleDetailsSidebarServer from './components/ArticleDetailsSidebarServer';
import CollapsibleInstitutions from './components/CollapsibleInstitutions';
import KeywordsSection from './components/KeywordsSection';
import LinkedPublicationsSection from './components/LinkedPublicationsSection';
import CitedBySection from './components/CitedBySection';
import ReferencesSection from './components/ReferencesSection';
import PreviewSection from './components/PreviewSection';
import caretUpRed from '../../../../public/icons/caret-up-red.svg';
import caretDownRed from '../../../../public/icons/caret-down-red.svg';
import './ArticleDetails.scss';

interface ArticleDetailsServerProps {
  article: IArticle;
  id: string;
  relatedVolume?: IVolume | null;
  metadataCSL?: string | null;
  metadataBibTeX?: string | null;
}

interface EnhancedArticleAuthor extends IArticleAuthor {
  institutionsKeys: number[];
}

const MAX_BREADCRUMB_TITLE = 20;

enum ARTICLE_SECTION {
  GRAPHICAL_ABSTRACT = 'graphicalAbstract',
  ABSTRACT = 'abstract',
  KEYWORDS = 'keywords',
  REFERENCES = 'references',
  LINKED_PUBLICATIONS = 'linkedPublications',
  CITED_BY = 'citedBy',
  PREVIEW = 'preview'
}

export default function ArticleDetailsServer({
  article,
  id,
  relatedVolume,
  metadataCSL,
  metadataBibTeX
}: ArticleDetailsServerProps): JSX.Element {
  
  // State for collapsible sections
  const [openedSections, setOpenedSections] = useState<{ key: ARTICLE_SECTION, isOpened: boolean }[]>([
    { key: ARTICLE_SECTION.GRAPHICAL_ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.KEYWORDS, isOpened: true },
    { key: ARTICLE_SECTION.REFERENCES, isOpened: true },
    { key: ARTICLE_SECTION.LINKED_PUBLICATIONS, isOpened: true },
    { key: ARTICLE_SECTION.CITED_BY, isOpened: true },
    { key: ARTICLE_SECTION.PREVIEW, isOpened: true }
  ]);
  
  // Process authors and institutions
  const allAuthors: EnhancedArticleAuthor[] = [];
  const allInstitutionsSet = new Set<string>();

  article.authors.forEach((author) => {
    const enhancedAuthor: EnhancedArticleAuthor = { ...author, institutionsKeys: [] };

    author.institutions?.forEach((institution) => {
      if (!allInstitutionsSet.has(institution)) {
        allInstitutionsSet.add(institution);
      }

      const institutionIndex = Array.from(allInstitutionsSet).indexOf(institution);
      enhancedAuthor.institutionsKeys.push(institutionIndex);
    });

    allAuthors.push(enhancedAuthor);
  });

  const institutions = Array.from(allInstitutionsSet);

  // Process citations (simplified for client component)
  const citations: ICitation[] = [];
  if (metadataBibTeX) {
    citations.push({
      key: CITATION_TEMPLATE.BIBTEX,
      citation: metadataBibTeX
    });
  }

  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || process.env.NEXT_PUBLIC_RVCODE || '';

  const renderArticleTitleAndAuthors = (isMobile: boolean): JSX.Element => {
    return (
      <>
        <h1 className={`articleDetails-content-article-title ${isMobile && 'articleDetails-content-article-title-mobile'}`}>
          {article?.title}
        </h1>
        {allAuthors.length > 0 && (
          <CollapsibleInstitutions 
            authors={allAuthors} 
            institutions={institutions} 
            isMobile={isMobile} 
          />
        )}
      </>
    );
  };

  const toggleSection = (sectionKey: ARTICLE_SECTION) => {
    const updatedSections = openedSections.map((section) => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }
      return { ...section };
    });

    setOpenedSections(updatedSections);
  };

  const renderSection = (sectionKey: ARTICLE_SECTION, sectionTitle: string, sectionContent: JSX.Element | null): JSX.Element | null => {
    if (!sectionContent) {
      return null;
    }

    const isOpenedSection = openedSections.find(section => section.key === sectionKey)?.isOpened;

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
    );
  };

  const getGraphicalAbstractSection = (): JSX.Element | null => {
    const graphicalAbstractURL = (rvcode && article?.graphicalAbstract) 
      ? `https://${rvcode}.episciences.org/public/documents/${article.id}/${article?.graphicalAbstract}` 
      : null;
    
    return graphicalAbstractURL ? (
      <img src={graphicalAbstractURL} className="articleDetails-content-article-section-content-graphicalAbstract" alt="Graphical Abstract" />
    ) : null;
  };

  const getAbstractSection = (): JSX.Element | null => {
    return article?.abstract ? <div dangerouslySetInnerHTML={{ __html: article.abstract }} /> : null;
  };

  const getKeywordsSection = (): JSX.Element | null => {
    if (!article?.keywords) {
      return null;
    }
    
    return (
      <KeywordsSection 
        keywordsData={article.keywords} 
        currentLanguage={defaultLanguage as AvailableLanguage}
      />
    );
  };

  const getLinkedPublicationsSection = (): JSX.Element | null => {
    return article?.relatedItems && article.relatedItems.length > 0 ? (
      <LinkedPublicationsSection relatedItems={article.relatedItems} />
    ) : null;
  };

  const getReferencesSection = (): JSX.Element | null => {
    return article?.references && article.references.length > 0 ? (
      <ReferencesSection references={article.references} />
    ) : null;
  };

  const getCitedBySection = (): JSX.Element | null => {
    return article?.citedBy && article.citedBy.length > 0 ? (
      <CitedBySection citedBy={article.citedBy} />
    ) : null;
  };

  const getPreviewSection = (): JSX.Element | null => {
    return article?.pdfLink ? (
      <PreviewSection pdfLink={article.pdfLink} />
    ) : null;
  };


  return (
    <main className='articleDetails'>
      <Breadcrumb 
        parents={[
          { path: BREADCRUMB_PATHS.home, label: `Home > Articles & Issues >` },
          { path: BREADCRUMB_PATHS.articles, label: `Articles >` }
        ]} 
        crumbLabel={article?.title.length ? article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title : ''} 
      />
      
      <div className="articleDetails-content">
        {renderArticleTitleAndAuthors(true)}
        <ArticleDetailsSidebarServer 
          article={article} 
          relatedVolume={relatedVolume} 
          citations={citations} 
        />
        <div className="articleDetails-content-article">
          {renderArticleTitleAndAuthors(false)}
          {renderSection(ARTICLE_SECTION.GRAPHICAL_ABSTRACT, 'Graphical abstract', getGraphicalAbstractSection())}
          {renderSection(ARTICLE_SECTION.ABSTRACT, 'Abstract', getAbstractSection())}
          {renderSection(ARTICLE_SECTION.KEYWORDS, 'Keywords', getKeywordsSection())}
          {renderSection(ARTICLE_SECTION.LINKED_PUBLICATIONS, 'Linked publications - datasets - software', getLinkedPublicationsSection())}
          {renderSection(ARTICLE_SECTION.CITED_BY, 'Cited by', getCitedBySection())}
          {renderSection(ARTICLE_SECTION.REFERENCES, 'References', getReferencesSection())}
          {renderSection(ARTICLE_SECTION.PREVIEW, 'Preview', getPreviewSection())}
        </div>
      </div>
    </main>
  );
}