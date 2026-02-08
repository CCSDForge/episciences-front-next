import { MetadataRoute } from 'next';
import { fetchAllArticlesForSitemap, fetchAllVolumesForSitemap } from '@/services/sitemap';

// Force dynamic rendering pour que le sitemap puisse être mis à jour à la demande
export const dynamic = 'force-dynamic';

// Durée de cache par défaut (si pas de webhook)
export const revalidate = 86400; // 24 heures

export default async function sitemap({
  params,
}: {
  params: Promise<{ journalId: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { journalId } = await params;

  // URL de base (ex: https://epijinfo.episciences.org)
  // En production, le hostname est géré par le proxy, mais pour le sitemap
  // on veut générer des URLs canoniques.
  const baseUrl = `https://${journalId}.episciences.org`;

  // 1. Pages Statiques
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/volumes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.5,
    },
  ];

  // 2. Récupération des données dynamiques en parallèle
  const [articles, volumes] = await Promise.all([
    fetchAllArticlesForSitemap(journalId),
    fetchAllVolumesForSitemap(journalId),
  ]);

  // 3. Construction des URLs Articles
  const articleRoutes: MetadataRoute.Sitemap = articles.map(article => ({
    url: `${baseUrl}/articles/${article.id}`,
    lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
    changeFrequency: 'monthly', // Un article publié change rarement
    priority: 0.7,
  }));

  // 4. Construction des URLs Volumes
  const volumeRoutes: MetadataRoute.Sitemap = volumes.map(volume => ({
    url: `${baseUrl}/volumes/${volume.id}`,
    lastModified: volume.updated_at ? new Date(volume.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...articleRoutes, ...volumeRoutes];
}
