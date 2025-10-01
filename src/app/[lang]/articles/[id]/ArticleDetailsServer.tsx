import React from 'react';
import { IArticle, IArticleAuthor } from "@/types/article";
import { IVolume } from "@/types/volume";
import { ICitation } from '@/utils/article';
import { BREADCRUMB_PATHS } from '@/config/paths';
import { Translations, t } from '@/utils/server-i18n';
import { AvailableLanguage, defaultLanguage } from '@/utils/i18n';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ArticleDetailsSidebarServer from './components/ArticleDetailsSidebarServer';
import CollapsibleInstitutions from './components/CollapsibleInstitutions';
import KeywordsSection from './components/KeywordsSection';
import LinkedPublicationsSection from './components/LinkedPublicationsSection';
import CitedBySection from './components/CitedBySection';
import ReferencesSection from './components/ReferencesSection';
import PreviewSection from './components/PreviewSection';
import CollapsibleSectionWrapper from './components/CollapsibleSectionWrapper';
import './ArticleDetails.scss';

// Icon paths
const caretUpRed = '/icons/caret-up-red.svg';
const caretDownRed = '/icons/caret-down-red.svg';

interface ArticleDetailsServerProps {
  article: IArticle;
  id: string;
  relatedVolume?: IVolume | null;
  metadataCSL?: string | null;
  metadataBibTeX?: string | null;
  translations: Translations;
  locale?: string;
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
  metadataBibTeX,
  translations,
  locale
}: ArticleDetailsServerProps): JSX.Element {

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

  // Process citations
  const citations: ICitation[] = [];
  if (metadataBibTeX) {
    citations.push({
      key: 'BibTeX',
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
        currentLanguage={(locale || defaultLanguage) as AvailableLanguage}
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

  // Helper to render sections with collapsible wrapper
  const renderSection = (sectionKey: ARTICLE_SECTION, sectionTitle: string, sectionContent: JSX.Element | null): JSX.Element | null => {
    if (!sectionContent) {
      return null;
    }

    return (
      <CollapsibleSectionWrapper
        title={sectionTitle}
        sectionKey={sectionKey}
        initialOpen={true}
        caretUpIcon={caretUpRed}
        caretDownIcon={caretDownRed}
      >
        {sectionContent}
      </CollapsibleSectionWrapper>
    );
  };

  return (
    <main className='articleDetails'>
      <Breadcrumb
        parents={[
          {
            path: BREADCRUMB_PATHS.home,
            label: `${t('pages.home.title', translations)} > ${t('common.content', translations)} >`
          },
          {
            path: BREADCRUMB_PATHS.articles,
            label: `${t('pages.articles.title', translations)} >`
          }
        ]}
        crumbLabel={article?.title.length ? article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title : ''}
      />

      <div className="articleDetails-content">
        {renderArticleTitleAndAuthors(true)}
        <ArticleDetailsSidebarServer
          article={article}
          relatedVolume={relatedVolume}
          citations={citations}
          translations={translations}
        />
        <div className="articleDetails-content-article">
          {renderArticleTitleAndAuthors(false)}
          {renderSection(
            ARTICLE_SECTION.GRAPHICAL_ABSTRACT,
            t('pages.articleDetails.sections.graphicalAbstract', translations),
            getGraphicalAbstractSection()
          )}
          {renderSection(
            ARTICLE_SECTION.ABSTRACT,
            t('pages.articleDetails.sections.abstract', translations),
            getAbstractSection()
          )}
          {renderSection(
            ARTICLE_SECTION.KEYWORDS,
            t('pages.articleDetails.sections.keywords', translations),
            getKeywordsSection()
          )}
          {renderSection(
            ARTICLE_SECTION.LINKED_PUBLICATIONS,
            t('pages.articleDetails.sections.linkedPublications', translations),
            getLinkedPublicationsSection()
          )}
          {renderSection(
            ARTICLE_SECTION.CITED_BY,
            t('pages.articleDetails.sections.citedBy', translations),
            getCitedBySection()
          )}
          {renderSection(
            ARTICLE_SECTION.REFERENCES,
            t('pages.articleDetails.sections.references', translations),
            getReferencesSection()
          )}
          {renderSection(
            ARTICLE_SECTION.PREVIEW,
            t('pages.articleDetails.sections.preview', translations),
            getPreviewSection()
          )}
        </div>
      </div>
    </main>
  );
}