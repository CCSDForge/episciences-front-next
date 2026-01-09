import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ROBOTS_COMMON_DISALLOW } from '@/config/robots';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('host');

  // Déterminer le protocole (https en prod, http en local)
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

  // Fallback si le host est manquant (ne devrait pas arriver)
  const domain = host ?? 'journal.episciences.org';
  const baseUrl = `${protocol}://${domain}`;

  return {
    rules: {
      userAgent: '*',
      disallow: ROBOTS_COMMON_DISALLOW,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
