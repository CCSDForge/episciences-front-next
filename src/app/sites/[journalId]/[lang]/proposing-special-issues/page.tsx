import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { fetchProposingSpecialIssuesPage } from '@/services/proposingSpecialIssues';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { getPublicJournalConfig } from '@/utils/env-loader';

const ProposingSpecialIssuesClient = dynamic(() => import('./ProposingSpecialIssuesClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate proposing-special-issues page for all journals at build time
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
  title: 'Proposing Special Issues',
  description: 'Information about proposing special issues',
};

export default async function ProposingSpecialIssuesPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  // Check if this page should be rendered for this journal
  const journalConfig = getPublicJournalConfig(journalId);
  if (journalConfig.NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_PROPOSING_SPECIAL_ISSUES_RENDER === 'false') {
    notFound();
  }

  const translationsPromise = getServerTranslations(lang);

  try {
    if (journalId) {
      const rawData = await fetchProposingSpecialIssuesPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] Proposing Special Issues page content not found for journal "${journalId}" on API.`
        );
      }
    }
  } catch (error) {
    console.warn(
      `[Build] Could not reach API for Proposing Special Issues page of journal "${journalId}".`
    );
  }

  const translations = await translationsPromise;
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/proposing-special-issues', translations),
    current: t('pages.proposingSpecialIssues.title', translations),
  };

  return (
    <ProposingSpecialIssuesClient
      initialPage={pageData}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
