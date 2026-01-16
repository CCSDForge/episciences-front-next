import { Metadata } from 'next';

import { fetchSections } from '@/services/section';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

import dynamic from 'next/dynamic';

const SectionsClient = dynamic(() => import('./SectionsClient'));

// Sections list updates moderately - daily revalidation is appropriate
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

export const metadata: Metadata = {
  title: 'Sections',
};

const SECTIONS_PER_PAGE = 10;

export default async function SectionsPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
}) {

  const params = await props.params;
  const { lang, journalId } = params;
  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [sectionsData, translations] = await Promise.all([
      fetchSections({
        rvcode: journalId,
        page: 1,
        itemsPerPage: SECTIONS_PER_PAGE,
      }),
      getServerTranslations(lang),
    ]);

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      sections: t('pages.sections.title', translations),
    };

    return (
      <SectionsClient
        initialSections={sectionsData}
        initialPage={1}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
      />
    );
  } catch (error) {
    console.error('Error fetching sections:', error);
    return <div>Failed to load sections</div>;
  }
}
