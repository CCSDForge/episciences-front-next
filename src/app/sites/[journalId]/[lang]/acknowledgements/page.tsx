import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchAcknowledgementsPage } from '@/services/acknowledgements';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

const AcknowledgementsClient = dynamic(() => import('./AcknowledgementsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate acknowledgements page for all journals at build time
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
  title: 'Acknowledgements',
  description: 'Journal acknowledgements',
};

export default async function AcknowledgementsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  try {
    if (journalId) {
      const rawData = await fetchAcknowledgementsPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] Acknowledgements page content not found for journal "${journalId}" on API. It will be empty.`
        );
      }
    }
  } catch (error) {
    console.warn(
      `[Build] Could not reach API for Acknowledgements page of journal "${journalId}".`
    );
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/acknowledgements', translations),
    current: t('pages.acknowledgements.title', translations),
  };

  return (
    <AcknowledgementsClient
      initialPage={pageData}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
