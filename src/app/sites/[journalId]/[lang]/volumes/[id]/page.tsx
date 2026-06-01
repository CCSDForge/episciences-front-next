import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchVolume, fetchVolumes } from '@/services/volume';
import { fetchArticle } from '@/services/article';
import { getJournalByCode } from '@/services/journal';
import { getLanguageFromParams } from '@/utils/language-utils';
import { FetchedArticle } from '@/utils/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { generateSeoAlternates } from '@/utils/seo';
import VolumeDetailsClient from './VolumeDetailsClient';
import { logger } from '@/lib/logger';

const getCachedJournal = cache((journalId: string) =>
  getJournalByCode(journalId).catch(() => null)
);

// Volume details rarely change after publication - long revalidation time
// Use on-demand revalidation API for updates
export const revalidate = 604800; // 7 days

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: {
  params: Promise<{ id: string; lang?: string; journalId: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, journalId } = params;
  const language = getLanguageFromParams(params);

  return {
    title: 'Volume Details',
    alternates: generateSeoAlternates(journalId, language, `/volumes/${id}`),
  };
}

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

    const [volumeData, translations, activeJournal] = await Promise.all([
      fetchVolume(journalId, parseInt(params.id, 10), language),
      getServerTranslations(language),
      getCachedJournal(journalId),
    ]);

    // Tier 1: null means the journal-scoped API returned no result
    if (!volumeData) {
      notFound();
    }

    // Tier 2: if the API returned a volume belonging to another journal, redirect.
    // Fail-closed: if rvid is present but the journal lookup failed, block rather than skip.
    if (volumeData.rvid !== undefined) {
      if (!activeJournal || volumeData.rvid !== activeJournal.id) {
        logger.warn('Cross-journal volume access blocked', {
          reason: 'volume-wrong-journal',
          resourceType: 'volume',
          resourceId: params.id,
          volumeRvid: volumeData.rvid,
          requestedJournalRvid: activeJournal?.id,
        });
        notFound();
      }
    }

    // Fetch all articles for the volume server-side
    let articles: FetchedArticle[] = [];
    if (volumeData && volumeData.articles && volumeData.articles.length > 0) {
      logger.debug(
        `[Volume ${params.id}] Found ${volumeData.articles.length} articles in volume data`
      );

      const paperIds = volumeData.articles
        .filter(article => article.paperid)
        .map(article => String(article.paperid));

      logger.debug(`[Volume ${params.id}] Extracted ${paperIds.length} paper IDs:`, paperIds);

      // Fetch articles in parallel with error handling
      const articlePromises = paperIds.map(async docid => {
        try {
          const article = await fetchArticle(docid, journalId);
          if (article) {
            logger.debug(`[Volume ${params.id}] Successfully fetched article ${docid}`);
          } else {
            logger.warn(`[Volume ${params.id}] Article ${docid} returned null`);
          }
          return article;
        } catch (error) {
          logger.error(`[Volume ${params.id}] Error fetching article ${docid}:`, error);
          return null;
        }
      });

      const fetchedArticles = await Promise.all(articlePromises);
      articles = fetchedArticles.filter(
        (article: FetchedArticle | null): article is FetchedArticle =>
          article !== null && article !== undefined
      );

      logger.debug(`[Volume ${params.id}] Final articles count: ${articles.length}`);
    } else {
      logger.debug(`[Volume ${params.id}] No articles in volume data`);
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
    if (error instanceof Error && 'digest' in error) throw error;
    logger.error(`Erreur lors de la récupération du volume ${params.id}:`, error);
    throw error;
  }
}
