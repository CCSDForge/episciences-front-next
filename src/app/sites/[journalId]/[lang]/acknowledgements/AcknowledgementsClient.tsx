'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import { fetchAcknowledgementsPage } from '@/services/acknowledgements';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';
import { BreadcrumbItem } from '@/utils/breadcrumbs';

interface AcknowledgementsClientProps {
  initialPage: any | null;
  lang?: string;
  breadcrumbLabels?: {
    parents: BreadcrumbItem[];
    current: string;
  };
}

export default function AcknowledgementsClient({
  initialPage,
  lang,
  breadcrumbLabels,
}: AcknowledgementsClientProps): React.JSX.Element {
  const { t } = useTranslation();
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      const rawData = await fetchAcknowledgementsPage(rvcode);
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
  const title = titleResult.value || t('pages.acknowledgements.title');
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
        current: breadcrumbLabels?.current || t('pages.acknowledgements.title'),
      }}
      lang={lang}
      noContentMessage={t('pages.acknowledgements.noContent')}
      languageNotice={languageNotice}
      className="markdown-page"
    />
  );
}
