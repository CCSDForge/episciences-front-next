import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchProposingSpecialIssuesPage } from '@/services/proposingSpecialIssues';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';

const ProposingSpecialIssuesClient = dynamic(() => import('./ProposingSpecialIssuesClient'));

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
    title: 'Proposing special issues',
    alternates: generateSeoAlternates(journalId, lang, '/proposing-special-issues'),
  };
}

export default async function ProposingSpecialIssuesPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch all pages and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchProposingSpecialIssuesPage(journalId) : null,
      getServerTranslations(lang),
    ]);
  } catch (error) {
    console.warn('[ProposingSpecialIssuesPage] Failed to fetch data:', error);
  }

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
