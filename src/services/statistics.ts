import { IStat } from '@/types/stat';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

interface StatisticsParams {
  rvcode: string;
  years?: number[];
  page?: number;
  itemsPerPage?: number;
}

export async function fetchStatistics({
  rvcode,
  page = 1,
  itemsPerPage = 7,
  years,
}: StatisticsParams): Promise<IStat[]> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('itemsPerPage', itemsPerPage.toString());
  params.append('rvcode', encodeURIComponent(rvcode));

  if (years && years.length > 0) {
    years.forEach(year => params.append('year[]', year.toString()));
  }

  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(`${apiUrl}/statistics/?${params}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        next: {
          revalidate: CACHE_TTL.statistics,
          tags: ['statistics', `statistics-${rvcode}`],
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    [],
    `fetchStatistics(${rvcode})`
  );
}
