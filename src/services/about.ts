import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';

export async function fetchAboutPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(`${apiUrl}/pages?page_code=about&rvcode=${rvcode}`, {
        next: {
          revalidate: 86400,
          tags: ['about'],
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    null,
    `fetchAboutPage(${rvcode})`
  );
}
