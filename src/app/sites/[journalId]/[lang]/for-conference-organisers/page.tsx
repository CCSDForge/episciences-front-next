import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { fetchForConferenceOrganisersPage } from '@/services/forConferenceOrganisers';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { getPublicJournalConfig } from '@/utils/env-loader';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';

const ForConferenceOrganisersClient = dynamic(() => import('./ForConferenceOrganisersClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate for-conference-organisers page for all journals at build time
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
    title: t('pages.forConferenceOrganisers.title', translations),
    description: t('pages.forConferenceOrganisers.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/for-conference-organisers'),
  };
}

export default async function ForConferenceOrganisersPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  const journalConfig = getPublicJournalConfig(journalId);
  if (journalConfig.NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_CONFERENCE_ORGANISERS_RENDER === 'false') {
    notFound();
  }

  let pageData = null;
  let translations = {};

  try {
    let rawData = null;
    [rawData, translations] = await Promise.all([
      fetchForConferenceOrganisersPage(journalId),
      getServerTranslations(lang),
    ]);
    pageData = rawData?.['hydra:member']?.[0] ?? null;
  } catch (error) {
    logger.warn('[ForConferenceOrganisersPage] Failed to fetch data:', error);
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-conference-organisers', translations),
    current: t('pages.forConferenceOrganisers.title', translations),
  };

  return (
    <ForConferenceOrganisersClient
      initialPage={pageData}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
