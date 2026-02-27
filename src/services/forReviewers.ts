import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';

export async function fetchForReviewersPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(
        `${apiUrl}/pages?page_code=for-reviewers&rvcode=${rvcode}`,
        {
          next: {
            revalidate: false,
            tags: ['for-reviewers'],
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    null,
    `fetchForReviewersPage(${rvcode})`
  );
}
