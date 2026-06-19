import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Credits.scss';
import { fetchCreditsPage } from '@/services/credits';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

const CreditsClient = dynamic(() => import('./CreditsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate credits page for all journals at build time
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
    title: t('pages.credits.title', translations),
    description: t('pages.credits.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/credits'),
  };
}

export default async function CreditsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch page data and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchCreditsPage(journalId) : null,
      getServerTranslations(lang),
    ]);
  } catch (error) {
    logger.warn('[CreditsPage] Failed to fetch data:', error);
    // pageData and translations remain at fallback values
  }

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    credits: t('pages.credits.title', translations),
  };

  return (
    <>
      <JsonLd data={generateWebPageJsonLd('WebPage', journalId, lang, '/credits', {
        name: t('pages.credits.title', translations),
      })} />
      <CreditsClient creditsPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
    </>
  );
}
