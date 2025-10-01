import { Metadata } from 'next';
import { fetchVolume, fetchVolumes } from '@/services/volume';
import dynamic from 'next/dynamic';
import { getLanguageFromParams } from '@/utils/language-utils';
import { combineWithLanguageParams } from '@/utils/static-params-helper';

const VolumeDetailsClient = dynamic(() => import('./VolumeDetailsClient'), { ssr: false });


export const metadata: Metadata = {
  title: 'Volume Details',
};

export default async function VolumeDetailsPage({
  params
}: {
  params: { id: string; lang?: string }
}) {
  const language = getLanguageFromParams(params);
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-volumes-found') {
      return {
        title: "Aucun volume - Placeholder | " + process.env.NEXT_PUBLIC_JOURNAL_NAME,
        description: "Page placeholder pour les volumes"
      };
    }
    
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    const volumeData = await fetchVolume({
      rvcode,
      vid: params.id,
      language
    });
    
    return (
      <VolumeDetailsClient 
        initialVolume={volumeData}
      />
    );
  } catch (error) {
    console.error(`Erreur lors de la récupération du volume ${params.id}:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement du volume</h1>
        <p>Impossible de charger les données du volume.</p>
      </div>
    );
  }
}

export async function generateStaticParams() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    const { data: volumes } = await fetchVolumes({
      page: 1,
      itemsPerPage: 1000,
      rvcode
    });

    if (!volumes || volumes.length === 0) {
      return combineWithLanguageParams([{ id: 'no-volumes-found' }]);
    }

    const volumeParams = volumes.map((volume: { id: number }) => ({
      id: volume.id.toString(),
    }));

    return combineWithLanguageParams(volumeParams);
  } catch (error) {
    console.error('Error generating static params for volumes:', error);
    return combineWithLanguageParams([{ id: 'no-volumes-found' }]);
  }
} 