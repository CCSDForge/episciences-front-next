'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { AvailableLanguage } from '@/utils/i18n';
import { fetchIndexingPage } from '@/services/indexing';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';
import { BreadcrumbItem } from '@/utils/breadcrumbs';
import './Indexing.scss';

interface IndexingClientProps {
  initialPage: any | null;
  lang?: string;
  breadcrumbLabels?: {
    parents: BreadcrumbItem[];
    current: string;
  };
}

export default function IndexingClient({
  initialPage,
  lang,
  breadcrumbLabels,
}: IndexingClientProps): React.JSX.Element {
  const { t } = useTranslation();
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      const rawData = await fetchIndexingPage(rvcode);
      return rawData?.['hydra:member']?.[0] || null;
    },
    initialData: initialPage,
    enabled: !!rvcode,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [pageData]);

  const content = pageData?.content?.[language] || pageData?.content?.['en'] || '';
  const title = pageData?.title?.[language] || pageData?.title?.['en'] || t('pages.indexing.title');

  return (
    <MarkdownPageWithSidebar
      content={content}
      title={title}
      isLoading={isLoading}
      isUpdating={isUpdating}
      breadcrumbLabels={{
        parents: breadcrumbLabels?.parents || [{ path: '/', label: `${t('pages.home.title')} >` }],
        current: breadcrumbLabels?.current || t('pages.indexing.title'),
      }}
      lang={lang}
      noContentMessage={t('pages.indexing.noContent')}
      className="markdown-page"
    />
  );
}
