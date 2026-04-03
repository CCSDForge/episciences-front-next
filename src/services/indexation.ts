import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { CACHE_TTL } from '@/utils/cache-ttl';

export async function fetchIndexationPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/journals/${rvcode}/indexation`, {
    next: {
      revalidate: CACHE_TTL.pages,
      tags: ['indexation', `indexation-${rvcode}`],
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch indexation page');
  }

  return response.json();
}
