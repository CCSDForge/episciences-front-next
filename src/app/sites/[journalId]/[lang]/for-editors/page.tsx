import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { fetchForEditorsPage } from '@/services/forEditors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { getPublicJournalConfig } from '@/utils/env-loader';
import { generateSeoAlternates } from '@/utils/seo';

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

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.forEditors.title', translations),
    description: t('pages.forEditors.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/for-editors'),
  };
}

export default async function ForEditorsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  const journalConfig = getPublicJournalConfig(journalId);
  if (journalConfig.NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_EDITORS_RENDER !== 'true') {
    notFound();
  }

  let pageData = null;
  let translations = {};

  try {
    let rawData = null;
    [rawData, translations] = await Promise.all([
      fetchForEditorsPage(journalId),
      getServerTranslations(lang),
    ]);
    pageData = rawData?.['hydra:member']?.[0] ?? null;
  } catch (error) {
    console.warn('[ForEditorsPage] Failed to fetch data:', error);
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-editors', translations),
    current: t('pages.forEditors.title', translations),
  };

  return (
    <ForEditorsClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
  );
}
