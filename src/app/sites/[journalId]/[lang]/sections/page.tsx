import { Metadata } from 'next';

import { fetchSections } from '@/services/section';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';
import { connection } from 'next/server';

const SectionsClient = dynamic(() => import('./SectionsClient'));

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sections',
};

const SECTIONS_PER_PAGE = 10;

export default async function SectionsPage(props: { params: Promise<{ lang: string; journalId: string }> }) {
  // Dynamic rendering: client-side pagination
  await connection();

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
        itemsPerPage: SECTIONS_PER_PAGE
      }),
      getServerTranslations(lang)
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
 