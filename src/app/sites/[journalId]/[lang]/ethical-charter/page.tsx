import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEthicalCharterPage } from '@/services/forAuthors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';

const EthicalCharterClient = dynamic(() => import('./EthicalCharterClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate ethical-charter page for all journals at build time
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
    title: t('pages.ethicalCharter.title', translations),
    description: t('pages.ethicalCharter.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/ethical-charter'),
  };
}

export default async function EthicalCharterPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch all pages and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchEthicalCharterPage(journalId) : null,
      getServerTranslations(lang),
    ]);
  } catch (error) {
    logger.warn('[EthicalCharterPage] Failed to fetch data:', error);
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/ethical-charter', translations),
    current: t('pages.ethicalCharter.title', translations),
  };

  return (
    <EthicalCharterClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
  );
}
