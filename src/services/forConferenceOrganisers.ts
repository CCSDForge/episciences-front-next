import { getJournalApiUrl } from '@/utils/env-loader';

/**
 * Fetch for conference organisers page content for a journal
 * @param rvcode - Journal code
 * @returns Page data from API
 */
export async function fetchForConferenceOrganisersPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(
    `${apiUrl}/pages?page_code=for-conference-organisers&rvcode=${rvcode}`,
    {
      next: {
        revalidate: false, // Static content - no revalidation needed
        tags: ['for-conference-organisers'],
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch for conference organisers page');
  }

  return await response.json();
}
