import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';

/**
 * Fetch credits page content
 * @param rvcode - Journal code
 * @returns The credits page or null if not found/failed
 */
export async function fetchCreditsPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);

  // Use safeFetchData to ensure graceful degradation if API is down
  const page = await safeFetchData(
    async () => {
      const response = await fetch(`${apiUrl}/pages?page_code=credits&rvcode=${rvcode}`, {
        next: {
          revalidate: 86400, // Static content - revalidate once per day (24 hours)
          tags: ['credits'], // Tag for on-demand revalidation
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch credits page: HTTP ${response.status}`);
      }

      const pages = await response.json();
      return pages.length > 0 ? pages[0] : null;
    },
    // Fallback to null if API fails
    null,
    `fetchCreditsPage(${rvcode})`
  );

  return page;
}
