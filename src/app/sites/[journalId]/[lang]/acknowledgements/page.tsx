import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchAcknowledgementsPage } from '@/services/acknowledgements';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

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

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.acknowledgements.title', translations),
    description: t('pages.acknowledgements.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/acknowledgements'),
  };
}

export default async function AcknowledgementsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  const translationsPromise = getServerTranslations(lang);

  try {
    if (journalId) {
      const rawData = await fetchAcknowledgementsPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        logger.warn(
          `[Build] Acknowledgements page content not found for journal "${journalId}" on API. It will be empty.`
        );
      }
    }
  } catch (error) {
    logger.warn(
      `[Build] Could not reach API for Acknowledgements page of journal "${journalId}".`
    );
  }

  const translations = await translationsPromise;
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/acknowledgements', translations),
    current: t('pages.acknowledgements.title', translations),
  };

  return (
    <>
      <JsonLd data={generateWebPageJsonLd('WebPage', journalId, lang, '/acknowledgements', {
        name: t('pages.acknowledgements.title', translations),
      })} />
      <AcknowledgementsClient
        initialPage={pageData}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
      />
    </>
  );
}
