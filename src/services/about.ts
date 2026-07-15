import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

export interface AboutPage {
  content: Record<string, string>;
  date_updated?: string;
}

export async function fetchAboutPage(
  rvcode: string
): Promise<{ 'hydra:member': AboutPage[] } | null> {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData<{ 'hydra:member': AboutPage[] } | null>(
    async () => {
      const response = await fetch(`${apiUrl}/pages?page_code=about&rvcode=${rvcode}`, {
        next: {
          revalidate: CACHE_TTL.pages,
          tags: ['about', `about-${rvcode}`, 'pages', `page-about-${rvcode}`],
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    null,
    `fetchAboutPage(${rvcode})`
  );
}
