import { Metadata, Suspense } from 'next';
import { fetchSections } from '@/services/section';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';

const SectionsClient = dynamic(() => import('./SectionsClient'));

// Section list updates moderately - daily revalidation
export const revalidate = 86400; // 24 hours

// Pre-generate sections page for all journals at build time
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
    title: t('pages.sections.title', translations),
    description: t('pages.sections.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/sections'),
  };
}

export default async function SectionsPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
}) {
  const params = await props.params;
  const { lang, journalId } = params;

  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [sections, translations] = await Promise.all([
      fetchSections({ rvcode: journalId }),
      getServerTranslations(lang),
    ]);

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      sections: t('pages.sections.title', translations),
    };

    return (
      <Suspense fallback={null}>
        <SectionsClient
          initialSections={sections}
          initialPage={1}
          lang={lang}
          breadcrumbLabels={breadcrumbLabels}
        />
      </Suspense>
    );
  } catch (error) {
    logger.error('Error fetching sections:', error);
    throw error;
  }
}
