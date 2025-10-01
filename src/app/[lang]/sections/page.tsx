import { generateLanguageParams } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import { fetchSections } from '@/services/section';

import dynamic from 'next/dynamic';



export async function generateStaticParams() {
  return generateLanguageParams();
}

const SectionsClient = dynamic(() => import('./SectionsClient'), { ssr: false });


export const metadata: Metadata = {
  title: 'Sections',
};

const SECTIONS_PER_PAGE = 10;

export default async function SectionsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    const sectionsData = await fetchSections({
      rvcode,
      page: 1,
      itemsPerPage: SECTIONS_PER_PAGE
    });
    
    return (
      <SectionsClient 
        initialSections={sectionsData} 
        initialPage={1}
      />
    );
  } catch (error) {
    console.error('Error fetching sections:', error);
    return <div>Failed to load sections</div>;
  }
} 