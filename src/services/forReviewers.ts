import { getJournalApiUrl } from '@/utils/env-loader';

/**
 * Fetch for reviewers page content for a journal
 * @param rvcode - Journal code
 * @returns Page data from API
 */
export async function fetchForReviewersPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/pages?page_code=for-reviewers&rvcode=${rvcode}`, {
    next: {
      revalidate: false, // Static content - no revalidation needed
      tags: ['for-reviewers'],
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch for reviewers page');
  }

  return await response.json();
}
