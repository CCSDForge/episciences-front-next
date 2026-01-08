import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';

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
  const response = await fetch(`${apiUrl}/journals/${rvcode}/stats?${params}`, {
    next: {
      revalidate: 3600, // Stats - revalidate every hour
      tags: ['stats'], // Tag for on-demand revalidation
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}
