import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

interface FetchStatsParams {
  rvcode: string;
  page: number;
  itemsPerPage: number;
}

export async function fetchStats({ rvcode, page, itemsPerPage }: FetchStatsParams) {
  const params = new URLSearchParams({
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  });

  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(`${apiUrl}/journals/${rvcode}/stats?${params}`, {
        next: {
          revalidate: CACHE_TTL.statistics,
          tags: ['stats', `stats-${rvcode}`],
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    null,
    `fetchStats(${rvcode})`
  );
}
