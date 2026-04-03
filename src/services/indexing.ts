import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

export async function fetchIndexingPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(
        `${apiUrl}/pages?page_code=journal-indexing&rvcode=${rvcode}`,
        {
          next: {
            revalidate: CACHE_TTL.pages,
            tags: ['indexing', `indexing-${rvcode}`, 'pages', `page-journal-indexing-${rvcode}`],
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    null,
    `fetchIndexingPage(${rvcode})`
  );
}
