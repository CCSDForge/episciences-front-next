import { generateLanguageParamsForPage } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import { fetchVolumes } from '@/services/volume';

import dynamic from 'next/dynamic';



export async function generateStaticParams() {
  return generateLanguageParamsForPage('volumes');
}

const VolumesClient = dynamic(() => import('./VolumesClient'));


const VOLUMES_PER_PAGE = 10;

export const metadata: Metadata = {
  title: 'Volumes',
};

export default async function VolumesPage({ params }: { params: { lang: string } }) {
  const lang = params.lang || 'en';
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }

    // For static builds, fetch all volumes for client-side pagination
    const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    const itemsPerPage = isStaticBuild ? 9999 : VOLUMES_PER_PAGE;

    const volumesData = await fetchVolumes({
      rvcode,
      language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
      page: 1,
      itemsPerPage: itemsPerPage,
      types: [],
      years: []
    });
    
    return (
      <VolumesClient
        initialVolumes={volumesData}
        initialPage={1}
        initialType=""
        lang={lang}
      />
    );
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return <div>Failed to load volumes</div>;
  }
} 