import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';

export async function fetchAboutPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/pages?page_code=about&rvcode=${rvcode}`, {
    next: {
      revalidate: 86400, // Static content - revalidate once per day (24 hours)
      tags: ['about'], // Tag for on-demand revalidation
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch about page');
  }

  // Return the complete response for later processing
  return await response.json();
}
