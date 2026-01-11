'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { fetchForConferenceOrganisersPage } from '@/services/forConferenceOrganisers';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';
import { BreadcrumbItem } from '@/utils/breadcrumbs';

interface ForConferenceOrganisersClientProps {
  initialPage: any | null;
  lang?: string;
  breadcrumbLabels?: {
    parents: BreadcrumbItem[];
    current: string;
  };
}

export default function ForConferenceOrganisersClient({
  initialPage,
  lang,
  breadcrumbLabels,
}: ForConferenceOrganisersClientProps): React.JSX.Element {
  const { t } = useTranslation();
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      const rawData = await fetchForConferenceOrganisersPage(rvcode);
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
  const title =
    pageData?.title?.[language] ||
    pageData?.title?.['en'] ||
    t('pages.forConferenceOrganisers.title');

  return (
    <MarkdownPageWithSidebar
      content={content}
      title={title}
      isLoading={isLoading}
      isUpdating={isUpdating}
      breadcrumbLabels={{
        parents: breadcrumbLabels?.parents || [{ path: '/', label: `${t('pages.home.title')} >` }],
        current: breadcrumbLabels?.current || t('pages.forConferenceOrganisers.title'),
      }}
      lang={lang}
      noContentMessage={t('pages.forConferenceOrganisers.noContent')}
      className="markdown-page"
    />
  );
}
