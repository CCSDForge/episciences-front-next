import { Metadata } from 'next';
import { fetchVolume, fetchVolumes } from '@/services/volume';
import { fetchArticle } from '@/services/article';
import { getLanguageFromParams } from '@/utils/language-utils';
import { FetchedArticle } from '@/utils/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import VolumeDetailsClient from './VolumeDetailsClient';

// Volume details - revalidate every hour (3600 seconds)
export const revalidate = 3600;

// Enable On-Demand ISR: pages generated on first visit, then cached
export const dynamicParams = true;

/**
 * generateStaticParams for On-Demand ISR
 * Returns empty array - pages will be generated on-demand when visited
 */
export async function generateStaticParams() {
  // On-Demand ISR: generate nothing at build time
  // Pages are generated on first request and cached with revalidate=3600
  return [];
}

export const metadata: Metadata = {
  title: 'Volume Details',
};

export default async function VolumeDetailsPage(
  props: {
    params: Promise<{ id: string; lang?: string; journalId: string }>
  }
) {
  const params = await props.params;
  const language = getLanguageFromParams(params);
  const { journalId } = params;

  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-volumes-found') {
      return (
        <div className="error-message">
          <h1>Aucun volume - Placeholder</h1>
          <p>Page placeholder pour les volumes</p>
        </div>
      );
    }

    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [volumeData, translations] = await Promise.all([
      fetchVolume(
        journalId,
        parseInt(params.id, 10),
        language
      ),
      getServerTranslations(language)
    ]);

    // Fetch all articles for the volume server-side
    let articles: FetchedArticle[] = [];
    if (volumeData && volumeData.articles && volumeData.articles.length > 0) {
      const paperIds = volumeData.articles
        .filter(article => article['@id'])
        .map(article => article['@id'].replace(/\D/g, ''));

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
      articles = fetchedArticles.filter((article: FetchedArticle | null): article is FetchedArticle => article !== null && article !== undefined);
    }

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      volumes: t('pages.volumes.title', translations),
      volumeDetails: t('pages.volumeDetails.title', translations),
    };

    return (
      <VolumeDetailsClient
        initialVolume={volumeData}
        initialArticles={articles}
        lang={params.lang}
        journalId={journalId}
        breadcrumbLabels={breadcrumbLabels}
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
 