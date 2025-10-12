'use client';

import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { FetchedArticle } from '@/utils/article';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { BREADCRUMB_PATHS } from '@/config/paths';
import './ArticleDetailsDownload.scss';

interface ArticleDetailsDownloadClientProps {
  article: FetchedArticle | null;
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsDownloadClient({ article }: ArticleDetailsDownloadClientProps): JSX.Element {
  const { t } = useTranslation();

  // Hide header and footer when component mounts
  useEffect(() => {
    // Add class to body to hide header and footer
    document.body.classList.add('download-page');

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('download-page');
    };
  }, []);

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
        {t('errors.downloadNotAvailable')}
      </div>
    );
  }

  return (
    <main className="articleDetails-download">
      <iframe
        src={article.pdfLink}
        className="articleDetails-download-frame"
        title={article.title}
      />
    </main>
  );
} 