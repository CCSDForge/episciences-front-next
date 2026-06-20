import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchIndexingPage } from '@/services/indexing';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

const IndexingClient = dynamic(() => import('./IndexingClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate indexing page for all journals at build time
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
    title: t('pages.indexing.title', translations),
    description: t('pages.indexing.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/indexing'),
  };
}

export default async function IndexingPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch all pages and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchIndexingPage(journalId) : null,
      getServerTranslations(lang),
    ]);
  } catch (error) {
    logger.warn('[IndexingPage] Failed to fetch data:', error);
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/indexing', translations),
    current: t('pages.indexing.title', translations),
  };

  return (
    <>
      <JsonLd
        data={generateWebPageJsonLd('WebPage', journalId, lang, '/indexing', {
          name: t('pages.indexing.title', translations),
        })}
      />
      <IndexingClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
    </>
  );
}
