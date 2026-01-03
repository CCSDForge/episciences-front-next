import { Metadata } from 'next';
import { fetchVolume, fetchVolumes } from '@/services/volume';
import { fetchArticle } from '@/services/article';
import { getLanguageFromParams } from '@/utils/language-utils';
import { combineWithLanguageParams } from '@/utils/static-params-helper';
import { FetchedArticle } from '@/utils/article';
import VolumeDetailsClient from './VolumeDetailsClient';


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

    // Fetch all articles for the volume server-side
    let articles: FetchedArticle[] = [];
    if (volumeData && volumeData.articles && volumeData.articles.length > 0) {
      const paperIds = volumeData.articles.map(article => article['@id'].replace(/\D/g, ''));

      // Fetch articles in parallel with error handling
      const articlePromises = paperIds.map(async (docid) => {
        try {
          const article = await fetchArticle(docid);
          return article;
        } catch (error) {
          console.error(`Error fetching article ${docid}:`, error);
          return null;
        }
      });

      const fetchedArticles = await Promise.all(articlePromises);
      articles = fetchedArticles.filter((article): article is FetchedArticle => article !== null && article !== undefined);
    }

    return (
      <VolumeDetailsClient
        initialVolume={volumeData}
        initialArticles={articles}
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
  // Targeted volume rebuild - only generate specific volume if env var is set
  if (process.env.ONLY_BUILD_VOLUME_ID) {
    return combineWithLanguageParams([{ id: process.env.ONLY_BUILD_VOLUME_ID }]);
  }

  // Full build: generate all volumes
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