'use client';

import { useTranslation } from 'next-i18next';
import { FetchedArticle } from '@/utils/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { BREADCRUMB_PATHS } from '@/config/paths';
import './ArticleDetailsPreview.scss';

interface ArticleDetailsPreviewClientProps {
  article: FetchedArticle | null;
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsPreviewClient({ article }: ArticleDetailsPreviewClientProps): JSX.Element {
  const { t } = useTranslation();

  if (!article) {
    return (
      <div className="articleDetails-error">
        {t('errors.articleNotFound')}
      </div>
    );
  }

  if (!article.pdfLink) {
    return (
      <div className="articleDetails-error">
        {t('errors.previewNotAvailable')}
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
        crumbLabel={t('pages.articleDetails.sections.preview')} 
      />
      <div className="articleDetails-content">
        <div className="articleDetails-content-preview">
          <iframe 
            src={article.pdfLink} 
            className="articleDetails-content-preview-frame"
            title={article.title}
          />
        </div>
      </div>
    </main>
  );
} 