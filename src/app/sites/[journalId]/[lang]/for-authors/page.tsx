import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import {
  fetchEditorialWorkflowPage,
  fetchEthicalCharterPage,
  fetchPrepareSubmissionPage,
} from '@/services/forAuthors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

const ForAuthorsClient = dynamic(() => import('./ForAuthorsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate for-authors page for all journals at build time
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

// Cette fonction est aussi appelée au build time
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'For Authors',
  };
}

export default async function ForAuthorsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  if (!journalId) {
    throw new Error('journalId is not defined');
  }

  let editorialWorkflowPage = null;
  let ethicalCharterPage = null;
  let prepareSubmissionPage = null;
  let translations = {};

  try {
    // Fetch all pages and translations in parallel
    [editorialWorkflowPage, ethicalCharterPage, prepareSubmissionPage, translations] =
      await Promise.all([
        fetchEditorialWorkflowPage(journalId),
        fetchEthicalCharterPage(journalId),
        fetchPrepareSubmissionPage(journalId),
        getServerTranslations(lang),
      ]);
  } catch (error) {
    console.warn('[ForAuthorsPage] Failed to fetch data:', error);
    // Data remains at fallback values (null/empty)
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-authors', translations),
    current: t('pages.forAuthors.title', translations),
  };

  return (
    <ForAuthorsClient
      editorialWorkflowPage={editorialWorkflowPage}
      ethicalCharterPage={ethicalCharterPage}
      prepareSubmissionPage={prepareSubmissionPage}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
