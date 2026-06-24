import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ROBOTS_DISALLOW } from '@/config/robots';
import { loadJournalConfig } from '@/utils/env-loader';
import { isValidJournalId } from '@/utils/validation';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = 'journal.episciences.org';

  try {
    const headersList = await headers();
    host = headersList.get('host') || host;
  } catch {
    // headers() unavailable during static generation
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const sitemap = `${protocol}://${host}/sitemap.xml`;

  const journalCode = host.split(':')[0].split('.')[0];
  const allowIndexing =
    !isValidJournalId(journalCode) ||
    loadJournalConfig(journalCode).env['NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING'] !== 'false';

  if (!allowIndexing) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      sitemap,
    };
  }

  return {
    rules: { userAgent: '*', disallow: ROBOTS_DISALLOW },
    sitemap,
  };
}
