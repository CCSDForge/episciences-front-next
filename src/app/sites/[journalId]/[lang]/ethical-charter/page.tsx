import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEthicalCharterPage } from '@/services/forAuthors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

const EthicalCharterClient = dynamic(() => import('./EthicalCharterClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate ethical charter page for all journals at build time
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
  title: 'Ethical Charter',
  description: 'Journal ethical charter',
};

export default async function EthicalCharterPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  try {
    if (journalId) {
      pageData = await fetchEthicalCharterPage(journalId);
      if (!pageData) {
        console.warn(
          `[Build] Ethical Charter page content not found for journal "${journalId}" on API.`
        );
      }
    }
  } catch (error) {
    console.warn(`[Build] Could not reach API for Ethical Charter page of journal "${journalId}".`);
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/ethical-charter', translations),
    current: t('pages.ethicalCharter.title', translations),
  };

  return (
    <EthicalCharterClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
  );
}
