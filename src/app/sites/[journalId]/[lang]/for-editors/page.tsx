import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { fetchForEditorsPage } from '@/services/forEditors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { getPublicJournalConfig } from '@/utils/env-loader';

const ForEditorsClient = dynamic(() => import('./ForEditorsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate for-editors page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export const metadata: Metadata = {
  title: 'For Editors',
  description: 'Information for journal editors',
};

export default async function ForEditorsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  // Check if this page should be rendered for this journal
  const journalConfig = getPublicJournalConfig(journalId);
  if (journalConfig.NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_EDITORS_RENDER === 'false') {
    notFound();
  }

  const translationsPromise = getServerTranslations(lang);

  try {
    if (journalId) {
      const rawData = await fetchForEditorsPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] For Editors page content not found for journal "${journalId}" on API.`
        );
      }
    }
  } catch (error) {
    console.warn(`[Build] Could not reach API for For Editors page of journal "${journalId}".`);
  }

  const translations = await translationsPromise;
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-editors', translations),
    current: t('pages.forEditors.title', translations),
  };

  return (
    <ForEditorsClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
  );
}
