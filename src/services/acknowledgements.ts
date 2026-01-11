import { getJournalApiUrl } from '@/utils/env-loader';

/**
 * Fetch acknowledgements page content for a journal
 * @param rvcode - Journal code
 * @returns Page data from API
 */
export async function fetchAcknowledgementsPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(
    `${apiUrl}/pages?page_code=journal-acknowledgements&rvcode=${rvcode}`,
    {
      next: {
        revalidate: false, // Static content - no revalidation needed
        tags: ['acknowledgements'],
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch acknowledgements page');
  }

  return await response.json();
}
