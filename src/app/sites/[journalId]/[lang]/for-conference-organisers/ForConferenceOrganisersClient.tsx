'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
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

  const contentResult = getLocalizedContent(pageData?.content, language);
  const titleResult = getLocalizedContent(pageData?.title, language);
  const content = contentResult.value;
  const title = titleResult.value || t('pages.forConferenceOrganisers.title');
  const languageNotice = contentResult.isAvailable && !contentResult.isOriginalLanguage
    ? t('common.contentNotInLanguage') : undefined;

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
      languageNotice={languageNotice}
      className="markdown-page"
    />
  );
}
