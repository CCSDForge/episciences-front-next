import { API_PATHS } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { fetchWithRetry } from '@/utils/fetch-with-retry';

interface SitemapItem {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface RawSitemapData {
  id: number | string;
  updated_at?: string;
  created_at?: string;
}

/**
 * Récupère tous les articles pour le sitemap
 * Note: On utilise une pagination large pour récupérer un maximum d'items
 */
export async function fetchAllArticlesForSitemap(rvcode: string): Promise<RawSitemapData[]> {
  const apiRoot = getJournalApiUrl(rvcode);
  // On suppose que l'API peut retourner une liste allégée ou on pagine
  // Pour l'instant on prend les 1000 derniers, à adapter selon la taille des revues
  const response = await fetchWithRetry(
    `${apiRoot}${API_PATHS.papers}?rvcode=${rvcode}&itemsPerPage=1000&page=1`,
    {
      next: {
        revalidate: 86400, // 24h par défaut
        tags: ['sitemap', `sitemap-${rvcode}`, `articles-${rvcode}`], // Invalidation via webhook
      },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();

  return (data['hydra:member'] || []).map((item: any) => ({
    id: item.paperid,
    updated_at: item.modification_date || item.publication_date,
    created_at: item.publication_date,
  }));
}

/**
 * Récupère tous les volumes pour le sitemap
 */
export async function fetchAllVolumesForSitemap(rvcode: string): Promise<RawSitemapData[]> {
  const apiRoot = getJournalApiUrl(rvcode);
  const response = await fetchWithRetry(
    `${apiRoot}${API_PATHS.volumes}?rvcode=${rvcode}&itemsPerPage=500`,
    {
      next: {
        revalidate: 86400,
        tags: ['sitemap', `sitemap-${rvcode}`, `volumes-${rvcode}`],
      },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();

  return (data['hydra:member'] || []).map((item: any) => ({
    id: item.vid,
    updated_at: item.date_updated,
    created_at: item.date_creation,
  }));
}
