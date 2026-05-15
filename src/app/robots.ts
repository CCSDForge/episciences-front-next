import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ROBOTS_DISALLOW } from '@/config/robots';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = 'journal.episciences.org';

  try {
    const headersList = await headers();
    host = headersList.get('host') || host;
  } catch {
    // headers() unavailable during static generation
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

  return {
    rules: {
      userAgent: '*',
      disallow: ROBOTS_DISALLOW,
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
