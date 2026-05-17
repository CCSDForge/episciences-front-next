import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchForEditorsPage } from '@/services/forEditors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';

const ForEditorsClient = dynamic(() => import('./ForEditorsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate accessibility page for all journals at build time
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
  return {
    title: 'For editors',
    alternates: generateSeoAlternates(journalId, lang, '/for-editors'),
  };
}

export default async function ForEditorsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch all pages and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchForEditorsPage(journalId) : null,
      getServerTranslations(lang),
    ]);
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
