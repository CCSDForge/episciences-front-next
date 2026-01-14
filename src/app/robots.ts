import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ROBOTS_COMMON_DISALLOW } from '@/config/robots';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = 'journal.episciences.org';
  
  try {
    const headersList = await headers();
    host = headersList.get('host') || host;
  } catch (error) {
    // headers() n'est pas disponible lors de la génération statique (build)
  }

  // Déterminer le protocole (https en prod, http en local)
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  return {
    rules: {
      userAgent: '*',
      disallow: ROBOTS_COMMON_DISALLOW,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
