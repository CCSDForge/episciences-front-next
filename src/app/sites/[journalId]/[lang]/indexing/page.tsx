import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchIndexingPage } from '@/services/indexing';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import './Indexing.scss';

const IndexingClient = dynamic(() => import('./IndexingClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate indexing page for all journals at build time
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
  title: 'Indexing',
  description: 'Journal indexing information',
};

export default async function IndexingPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  try {
    if (journalId) {
      const rawData = await fetchIndexingPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] Indexing page content not found for journal "${journalId}" on API. It will be empty.`
        );
      }
    }
  } catch (error) {
    console.warn(`[Build] Could not reach API for Indexing page of journal "${journalId}".`);
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/indexing', translations),
    current: t('pages.indexing.title', translations),
  };

  return <IndexingClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />;
}
