import { generateLanguageParams } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import { fetchVolumes } from '@/services/volume';

import dynamic from 'next/dynamic';



export async function generateStaticParams() {
  return generateLanguageParams();
}

const VolumesClient = dynamic(() => import('./VolumesClient'), { ssr: false });


const VOLUMES_PER_PAGE = 10;

export const metadata: Metadata = {
  title: 'Volumes',
};

export default async function VolumesPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    const volumesData = await fetchVolumes({
      rvcode,
      language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
      page: 1,
      itemsPerPage: VOLUMES_PER_PAGE,
      types: [],
      years: []
    });
    
    return (
      <VolumesClient 
        initialVolumes={volumesData} 
        initialPage={1}
        initialType=""
      />
    );
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return <div>Failed to load volumes</div>;
  }
} 