import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchIndexingPage } from '@/services/indexing';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import './Indexing.scss';

const IndexingClient = dynamic(() => import('./IndexingClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

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
