import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEditorialWorkflowPage, fetchPrepareSubmissionPage } from '@/services/forAuthors';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

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

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.forAuthors.title', translations),
    description: t('pages.forAuthors.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/for-authors'),
  };
}

export default async function ForAuthorsPage(props: {
  readonly params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let editorialWorkflowPage = null;
  let prepareSubmissionPage = null;

  const translationsPromise = getServerTranslations(lang);

  try {
    if (journalId) {
      // Fetch both pages in parallel
      [editorialWorkflowPage, prepareSubmissionPage] = await Promise.all([
        fetchEditorialWorkflowPage(journalId),
        fetchPrepareSubmissionPage(journalId),
      ]);
    } else {
      logger.warn('[ForAuthorsPage] journalId is not defined');
    }
  } catch (error) {
    logger.warn('[ForAuthorsPage] Failed to fetch data:', error);
    // Data remains at fallback values (null/empty)
  }

  const translations = await translationsPromise;

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-authors', translations),
    current: t('pages.forAuthors.title', translations),
  };

  return (
    <>
      <JsonLd
        data={generateWebPageJsonLd('WebPage', journalId, lang, '/for-authors', {
          name: t('pages.forAuthors.title', translations),
        })}
      />
      <ForAuthorsClient
        editorialWorkflowPage={editorialWorkflowPage}
        prepareSubmissionPage={prepareSubmissionPage}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
      />
    </>
  );
}
