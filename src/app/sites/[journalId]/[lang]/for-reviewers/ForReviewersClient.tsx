'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { AvailableLanguage } from '@/utils/i18n';
import { fetchForReviewersPage } from '@/services/forReviewers';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';
import { BreadcrumbItem } from '@/utils/breadcrumbs';

interface ForReviewersClientProps {
  initialPage: any | null;
  lang?: string;
  breadcrumbLabels?: {
    parents: BreadcrumbItem[];
    current: string;
  };
}

export default function ForReviewersClient({
  initialPage,
  lang,
  breadcrumbLabels,
}: ForReviewersClientProps): React.JSX.Element {
  const { t } = useTranslation();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // Use the lang prop for consistent SSR/client rendering
  const currentLang = (lang || 'en') as 'en' | 'fr';

  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      const rawData = await fetchForReviewersPage(rvcode);
      return rawData?.['hydra:member']?.[0] || null;
    },
    initialData: initialPage,
    enabled: !!rvcode,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [pageData]);

  const content = pageData?.content?.[currentLang] || pageData?.content?.['en'] || '';
  const title =
    pageData?.title?.[currentLang] || pageData?.title?.['en'] || t('pages.forReviewers.title');

  return (
    <MarkdownPageWithSidebar
      content={content}
      title={title}
      isLoading={isLoading}
      isUpdating={isUpdating}
      breadcrumbLabels={{
        parents: breadcrumbLabels?.parents || [{ path: '/', label: `${t('pages.home.title')} >` }],
        current: breadcrumbLabels?.current || t('pages.forReviewers.title'),
      }}
      lang={lang}
      noContentMessage={t('pages.forReviewers.noContent')}
      className="markdown-page"
    />
  );
}
