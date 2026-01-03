import { Metadata } from 'next';

import { fetchSections } from '@/services/section';

import dynamic from 'next/dynamic';

const SectionsClient = dynamic(() => import('./SectionsClient'));


export const metadata: Metadata = {
  title: 'Sections',
};

const SECTIONS_PER_PAGE = 10;

export default async function SectionsPage({ params }: { params: { lang: string; journalId: string } }) {
  const lang = params.lang || 'en';
  const { journalId } = params;
  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }
    
    const sectionsData = await fetchSections({
      rvcode: journalId,
      page: 1,
      itemsPerPage: SECTIONS_PER_PAGE
    });
    
    return (
      <SectionsClient
        initialSections={sectionsData}
        initialPage={1}
        lang={lang}
      />
    );
  } catch (error) {
    console.error('Error fetching sections:', error);
    return <div>Failed to load sections</div>;
  }
}
 