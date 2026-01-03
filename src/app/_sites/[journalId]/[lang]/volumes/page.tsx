import { Metadata } from 'next';

import { fetchVolumes } from '@/services/volume';

import dynamic from 'next/dynamic';

const VolumesClient = dynamic(() => import('./VolumesClient'));


const VOLUMES_PER_PAGE = 20;

export const metadata: Metadata = {
  title: 'Volumes',
};

export default async function VolumesPage({ params }: { params: { lang: string; journalId: string } }) {
  const lang = params.lang || 'en';
  const { journalId } = params;
  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const volumesData = await fetchVolumes({
      rvcode: journalId,
      language: lang,
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
        lang={lang}
      />
    );
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return <div>Failed to load volumes</div>;
  }
}
 