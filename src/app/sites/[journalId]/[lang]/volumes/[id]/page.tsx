import { Metadata } from 'next';
import { fetchVolume, fetchVolumes } from '@/services/volume';
import { fetchArticle } from '@/services/article';
import { getLanguageFromParams } from '@/utils/language-utils';
import { FetchedArticle } from '@/utils/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import VolumeDetailsClient from './VolumeDetailsClient';

// Volume details rarely change after publication - long revalidation time
// Use on-demand revalidation API for updates
export const revalidate = 604800; // 7 days

export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = {
  title: 'Volume Details',
};

export default async function VolumeDetailsPage(props: {
  params: Promise<{ id: string; lang?: string; journalId: string }>;
}) {
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
      fetchVolume(journalId, parseInt(params.id, 10), language),
      getServerTranslations(language),
    ]);

    // Fetch all articles for the volume server-side
    let articles: FetchedArticle[] = [];
    if (volumeData && volumeData.articles && volumeData.articles.length > 0) {
      console.log(
        `[Volume ${params.id}] Found ${volumeData.articles.length} articles in volume data`
      );

      const paperIds = volumeData.articles
        .filter(article => article.paperid)
        .map(article => String(article.paperid));

      console.log(`[Volume ${params.id}] Extracted ${paperIds.length} paper IDs:`, paperIds);

      // Fetch articles in parallel with error handling
      const articlePromises = paperIds.map(async docid => {
        try {
          const article = await fetchArticle(docid, journalId);
          if (article) {
            console.log(`[Volume ${params.id}] Successfully fetched article ${docid}`);
          } else {
            console.warn(`[Volume ${params.id}] Article ${docid} returned null`);
          }
          return article;
        } catch (error) {
          console.error(`[Volume ${params.id}] Error fetching article ${docid}:`, error);
          return null;
        }
      });

      const fetchedArticles = await Promise.all(articlePromises);
      articles = fetchedArticles.filter(
        (article: FetchedArticle | null): article is FetchedArticle =>
          article !== null && article !== undefined
      );

      console.log(`[Volume ${params.id}] Final articles count: ${articles.length}`);
    } else {
      console.log(`[Volume ${params.id}] No articles in volume data`);
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
