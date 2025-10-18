'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-i18next';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isMobileOnly } from "react-device-detect";
import { Link } from '@/components/Link/Link';

import { PATHS } from '@/config/paths';
import { useAppSelector } from "@/hooks/store";
import { IArticle, IArticleAuthor, IArticleCitedBy, IArticleCitedByCitation, IArticleReference } from "@/types/article";
import { articleTypes, CITATION_TEMPLATE, getCitations, ICitation, INTER_WORK_RELATIONSHIP, interworkRelationShipTypes, LINKED_PUBLICATION_IDENTIFIER_TYPE, METADATA_TYPE } from '@/utils/article';
import { AvailableLanguage, availableLanguages } from '@/utils/i18n';
import { decodeText } from "@/utils/markdown";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from "@/components/Loader/Loader";
import ArticleDetailsSidebar from "@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar";
import './ArticleDetailsNotice.scss';

enum ARTICLE_SECTION {
  GRAPHICAL_ABSTRACT = 'graphicalAbstract',
  ABSTRACT = 'abstract',
  KEYWORDS = 'keywords',
  REFERENCES = 'references',
  LINKED_PUBLICATIONS = 'linkedPublications',
  CITED_BY = 'citedBy',
  PREVIEW = 'preview'
}

interface EnhancedArticleAuthor extends IArticleAuthor {
  institutionsKeys: number[];
}

interface ArticleDetailsNoticeClientProps {
  article: IArticle | null;
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsNoticeClient({ article }: ArticleDetailsNoticeClientProps | any): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);

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
  const [openedInstitutions, setOpenedInstitutions] = useState(true);
  const [citedBy, setCitedBy] = useState<ICitation[]>([]);

  useEffect(() => {
    const previewDebounce = 1000;

    const timer = setTimeout(() => {
      if (article?.id) {
        fetch(`/articles/${article.id}/preview`);
      }
    }, previewDebounce);
  
    return () => clearTimeout(timer);
  }, [article?.id]);

  useEffect(() => {
    if (article && !authors.length && !institutions.length) {
      const allAuthors: EnhancedArticleAuthor[] = [];
      const allInstitutionsSet = new Set<string>();

      article.authors.forEach((author: IArticleAuthor) => {
        const enhancedAuthor: EnhancedArticleAuthor = { ...author, institutionsKeys: [] };
  
        author.institutions?.forEach((institution: string) => {
          if (!allInstitutionsSet.has(institution)) {
            allInstitutionsSet.add(institution);
          }
  
          const institutionIndex = Array.from(allInstitutionsSet).indexOf(institution);
          enhancedAuthor.institutionsKeys.push(institutionIndex);
        });
  
        allAuthors.push(enhancedAuthor);
      });

      setAuthors(allAuthors);
      setInstitutions(Array.from(allInstitutionsSet));
    }
  }, [article, authors, institutions]);

  const renderArticleAuthors = (isMobile: boolean): JSX.Element => {
    if (!authors || !authors.length) return <></>;
  
    const formattedAuthors = authors.map((author, index) => {
      const authorName = (
        <>
          {author.fullname}
          {author.orcid && (
            <Link href={`${author.orcid}`} title={author.orcid} target='_blank' rel="noopener noreferrer">
              {' '}
              <img className='articleDetails-content-article-authors-author-orcid' src="/icons/orcid.svg" alt='Orcid icon' />
            </Link>
          )}
        </>
      );
  
      const authorInstitutions = author.institutionsKeys.map((key, i) => (
        <sup key={i} className="articleDetails-content-article-authors-institution-key">{' '}({key + 1})</sup>
      ));
  
      return (
        <span key={index} className="articleDetails-content-article-authors-author">
          {authorName}
          {authorInstitutions}
          {index < authors.length - 1 && ', '}
        </span>
      );
    });

    return institutions.length > 0 ? (
      <div className={`articleDetails-content-article-authors articleDetails-content-article-authors-withInstitutions ${isMobile && 'articleDetails-content-article-authors-withInstitutions-mobile'}`}>
        <div>{formattedAuthors}</div>
        <img 
          className='articleDetails-content-article-authors-withInstitutions-caret' 
          src={openedInstitutions ? "/icons/caret-up-grey.svg" : "/icons/caret-down-grey.svg"} 
          alt={openedInstitutions ? 'Caret up icon' : 'Caret down icon'} 
          onClick={(): void => setOpenedInstitutions(!openedInstitutions)} 
        />
      </div>
    ) : (
      <div className={`articleDetails-content-article-authors ${isMobile && 'articleDetails-content-article-authors-mobile'}`}>
        {formattedAuthors}
      </div>
    );
  };

  const renderArticleAuthorsInstitutions = (): JSX.Element => {
    if (!institutions || !institutions.length) return <></>;
    if (!openedInstitutions) return <></>;

    return (
      <>
        {institutions.map((institution, index) => (
          <div key={index}>({index + 1}) {institution}</div>
        ))}
      </>
    );
  };

  const renderArticleTitleAndAuthors = (isMobile: boolean): JSX.Element => {
    return (
      <>
        <h1 className={`articleDetails-content-article-title ${isMobile && 'articleDetails-content-article-title-mobile'}`}>
          <MathJax dynamic>{article?.title}</MathJax>
        </h1>
        {authors.length > 0 && <>{renderArticleAuthors(isMobile)}</>}
        {institutions.length > 0 && (
          <div className={`articleDetails-content-article-institutions ${isMobile && 'articleDetails-content-article-institutions-mobile'}`}>
            {renderArticleAuthorsInstitutions()}
          </div>
        )}
      </>
    );
  };

  const renderSection = (sectionKey: ARTICLE_SECTION, sectionTitle: string, sectionContent: JSX.Element | null): JSX.Element | null => {
    if (!sectionContent) return null;

    const isOpenedSection = openedSections.find(section => section.key === sectionKey)?.isOpened;

    return (
      <div className='articleDetails-content-article-section'>
        <div 
          className={`articleDetails-content-article-section-title ${!isOpenedSection && 'articleDetails-content-article-section-closed'}`} 
          onClick={(): void => toggleSection(sectionKey)}
        >
          <div className='articleDetails-content-article-section-title-text'>{sectionTitle}</div>
          <img 
            className='articleDetails-content-article-section-title-caret' 
            src={isOpenedSection ? "/icons/caret-up-red.svg" : "/icons/caret-down-red.svg"} 
            alt={isOpenedSection ? 'Caret up icon' : 'Caret down icon'} 
          />
        </div>
        <div className={`articleDetails-content-article-section-content ${isOpenedSection && 'articleDetails-content-article-section-content-opened'}`}>
          {sectionContent}
        </div>
      </div>
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

  const getGraphicalAbstractSection = (): JSX.Element | null => {
    const graphicalAbstractURL = (rvcode && article?.graphicalAbstract) 
      ? `https://${rvcode}.episciences.org/public/documents/${article.id}/${article?.graphicalAbstract}` 
      : null;
    
    return graphicalAbstractURL 
      ? <img src={graphicalAbstractURL} className="articleDetails-content-article-section-content-graphicalAbstract" alt="Graphical abstract" /> 
      : null;
  };

  const getAbstractSection = (): JSX.Element | null => {
    return article?.abstract ? <MathJax dynamic>{article.abstract}</MathJax> : null;
  };

  const getKeywords = (): string[] => {
    const keywords: string[] = [];

    if (!article?.keywords) return keywords;

    if (Array.isArray(article.keywords)) {
      return article.keywords;
    }

    (Object.entries(article.keywords) as [string, string[]][]).forEach(([key, values]) => {
      if (availableLanguages.includes(key as AvailableLanguage)) {
        if (key === language) {
          keywords.push(...values);
        }
      } else {
        keywords.push(...values);
      }
    });

    return keywords;
  };

  const getKeywordsSection = (): JSX.Element | null => {
    const keywords = getKeywords();
    if (!keywords.length) return null;

    return (
      <ul>
        {keywords.map((keyword, index) => (
          <li className="articleDetails-content-article-section-content-keywords-tag" key={index}>
            {keyword}
          </li>
        ))}
      </ul>
    );
  };

  const getLinkedPublicationsSection = (): JSX.Element | null => {
    if (!article?.relatedItems?.length) return null;

    return (
      <div className="articleDetails-content-article-section-content-linkedPublications">
        {article.relatedItems.map((relatedItem: any, index: number) => (
          <div key={index} className="articleDetails-content-article-section-content-linkedPublications-publication">
            {getLinkedPublicationRow(relatedItem)}
          </div>
        ))}
      </div>
    );
  };

  const getLinkedPublicationRow = (relatedItem: any): JSX.Element => {
    const relationshipType = interworkRelationShipTypes.find(
      type => type.value === relatedItem.relationshipType
    );

    return (
      <>
        <div className="articleDetails-content-article-section-content-linkedPublications-publication-badge">
          {t(relationshipType?.label || '')}
        </div>
        <div>
          <MathJax dynamic>{relatedItem.citation}</MathJax>
        </div>
        {relatedItem.value && (
          <Link
            href={relatedItem.value}
            className="articleDetails-content-article-section-content-linkedPublications-publication-uri"
            target="_blank"
            rel="noopener noreferrer"
          >
            {relatedItem.value}
          </Link>
        )}
      </>
    );
  };

  const getReferencesSection = (): JSX.Element | null => {
    if (!article?.references) return null;

    return (
      <div className="articleDetails-content-article-section-content-references">
        {article.references.map((ref: any, index: number) => (
          <div key={index} className="articleDetails-content-article-section-content-references-reference">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({node, ...props}) => (
                  <Link href={props.href || ''} className="articleDetails-content-article-section-content-references-reference-doi" target="_blank" rel="noopener noreferrer">
                    {props.children}
                  </Link>
                )
              }}
            >
              {ref.citation}
            </ReactMarkdown>
          </div>
        ))}
      </div>
    );
  };

  const getCitedBySection = (): JSX.Element | null => {
    if (!article?.citedBy?.length) return null;

    return (
      <div className="articleDetails-content-article-section-content-citedBy">
        {article.citedBy.map((citedBy: any, index: number) => (
          <div key={index} className="articleDetails-content-article-section-content-citedBy-row">
            <div className="articleDetails-content-article-section-content-citedBy-row-source">
              {citedBy.source}
            </div>
            <div className="articleDetails-content-article-section-content-citedBy-row-citations">
              {citedBy.citations.map((citation: IArticleCitedByCitation, citationIndex: number) => (
                <div key={citationIndex} className="articleDetails-content-article-section-content-citedBy-row-citations-citation">
                  <div className="articleDetails-content-article-section-content-citedBy-row-citations-citation-title">
                    {citation.title}
                  </div>
                  {citation.authors && (
                    <div className="articleDetails-content-article-section-content-citedBy-row-citations-citation-authors">
                      {citation.authors.map(author => author.fullname).join(', ')}
                    </div>
                  )}
                  {citation.reference && (
                    <div className="articleDetails-content-article-section-content-citedBy-row-citations-citation-reference">
                      Volume {citation.reference.volume}, {citation.reference.year}, page {citation.reference.page}
                    </div>
                  )}
                  {citation.doi && (
                    <Link
                      href={`https://doi.org/${citation.doi}`}
                      className="articleDetails-content-article-section-content-citedBy-row-citations-citation-doi"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DOI: {citation.doi}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getPreviewSection = (): JSX.Element | null => {
    if (!article?.id) return null;

    return (
      <iframe 
        src={`/articles/${article.id}/preview`}
        className="articleDetails-content-article-section-content-preview"
        title="Article preview"
      />
    );
  };

  const renderMetrics = (): JSX.Element | undefined => {
    if (!article?.metrics) return;

    return (
      <div className="articleDetails-metrics">
        {Object.entries(article.metrics).map(([key, value]) => (
          <div key={key} className="articleDetails-metrics-item">
            <div className="articleDetails-metrics-item-label">{t(`metrics.${key}`)}</div>
            <div className="articleDetails-metrics-item-value">{value as string}</div>
          </div>
        ))}
      </div>
    );
  };

  if (!article) {
    return (
      <div className="articleDetails-error">
        {t('errors.articleNotFound')}
      </div>
    );
  }

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` },
    { path: '/articles', label: `${t('pages.articles.title')} >` }
  ];

  return (
    <main className="articleDetails">
      <Breadcrumb 
        parents={breadcrumbItems} 
        crumbLabel={article?.title.length ? article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title : ''} 
      />
      <>
        {article.tag && (
          <div className='articleDetails-tag'>
            {t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}
          </div>
        )}
        <div className="articleDetails-content">
          {renderArticleTitleAndAuthors(true)}
          <ArticleDetailsSidebar 
            language={language} 
            t={t} 
            article={article} 
            citations={citedBy} 
            metrics={renderMetrics()} 
          />
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
    </main>
  );
} 