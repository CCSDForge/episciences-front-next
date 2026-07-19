'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@/hooks/store';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { fetchCreditsPage, CreditsPage } from '@/services/credits';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';

interface CreditsClientProps {
  readonly creditsPage: CreditsPage | null;
  readonly lang?: string;
  readonly breadcrumbLabels?: {
    home: string;
    credits: string;
  };
}

export default function CreditsClient({
  creditsPage,
  lang,
  breadcrumbLabels,
}: CreditsClientProps): React.JSX.Element {
  const { t } = useTranslation();

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // Architecture hybride : creditsPage = HTML statique (SEO), pageData = données à jour depuis l'API
  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      return await fetchCreditsPage(rvcode);
    },
    initialData: creditsPage,
    enabled: !!rvcode,
  });

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(false);
  }, [pageData]);

  const contentResult = getLocalizedContent(pageData?.content, language);
  const languageNotice =
    contentResult.isAvailable && !contentResult.isOriginalLanguage
      ? t('common.contentNotInLanguage')
      : undefined;

  const title = breadcrumbLabels?.credits || t('pages.credits.title');

  return (
    <MarkdownPageWithSidebar
      content={contentResult.value}
      title={title}
      isLoading={isLoading}
      isUpdating={isUpdating}
      breadcrumbLabels={{
        parents: [
          {
            path: '/',
            label: breadcrumbLabels ? `${breadcrumbLabels.home} >` : `${t('pages.home.title')} >`,
          },
        ],
        current: title,
      }}
      lang={lang}
      noContentMessage={t('pages.credits.noContent')}
      languageNotice={languageNotice}
      lastUpdated={pageData?.date_updated}
      className="credits"
    />
  );
}
