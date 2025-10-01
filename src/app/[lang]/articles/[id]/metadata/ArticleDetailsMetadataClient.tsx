'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { FetchedArticle } from '@/utils/article';
import { CITATION_TEMPLATE, getCitations, ICitation } from '@/utils/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { BREADCRUMB_PATHS } from '@/config/paths';
import './ArticleDetailsMetadata.scss';

interface ArticleDetailsMetadataClientProps {
  article: FetchedArticle | null;
  metadataCSL: string | undefined;
  metadataBibTeX: string | undefined;
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsMetadataClient({ 
  article, 
  metadataCSL, 
  metadataBibTeX 
}: ArticleDetailsMetadataClientProps): JSX.Element {
  const { t } = useTranslation();
  const [citations, setCitations] = useState<ICitation[]>([]);

  useEffect(() => {
    const fetchCitations = async () => {
      if (metadataCSL && metadataBibTeX) {
        const fetchedCitations = await getCitations(metadataCSL);
        fetchedCitations.push({
          key: CITATION_TEMPLATE.BIBTEX,
          citation: metadataBibTeX,
        });

        setCitations(fetchedCitations);
      }
    };

    fetchCitations();
  }, [metadataCSL, metadataBibTeX]);

  const handleDownload = (citation: ICitation) => {
    if (!citation || !article) return;
  
    const blob = new Blob([citation.citation]);
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `article_${article.id}_metadata_${citation.key}.txt`;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!article) {
    return (
      <div className="articleDetails-error">
        {t('errors.articleNotFound')}
      </div>
    );
  }

  return (
    <main className="articleDetails">
      <Breadcrumb 
        parents={[
          { path: BREADCRUMB_PATHS.home, label: `${t('pages.home.title')} > ${t('common.content')} >` },
          { path: BREADCRUMB_PATHS.articles, label: `${t('pages.articles.title')} >` },
          { path: BREADCRUMB_PATHS.articleDetails(article.id.toString()), label: `${article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title} >` }
        ]} 
        crumbLabel={t('pages.articleDetails.sections.metadata')} 
      />
      <div className="articleDetails-content">
        <div className="articleDetails-content-metadata">
          <h1 className="articleDetails-content-metadata-title">
            {t('pages.articleDetails.metadata.title')}
          </h1>

          <div className="articleDetails-content-metadata-citations">
            {citations.map((citation, index) => (
              <div key={index} className="articleDetails-content-metadata-citation">
                <h2 className="articleDetails-content-metadata-citation-title">
                  {t(`pages.articleDetails.metadata.citationFormats.${citation.key}`)}
                </h2>
                <pre className="articleDetails-content-metadata-citation-content">
                  {citation.citation}
                </pre>
                <button 
                  onClick={() => handleDownload(citation)}
                  className="articleDetails-content-metadata-citation-download"
                >
                  {t('pages.articleDetails.metadata.download')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
} 