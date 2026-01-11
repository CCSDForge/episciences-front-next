import { getJournalApiUrl } from '@/utils/env-loader';

/**
 * Fetch indexing page content for a journal
 * @param rvcode - Journal code
 * @returns Page data from API
 */
export async function fetchIndexingPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/pages?page_code=journal-indexing&rvcode=${rvcode}`, {
    next: {
      revalidate: false, // Static content - no revalidation needed
      tags: ['indexing'],
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch indexing page');
  }

  return await response.json();
}
