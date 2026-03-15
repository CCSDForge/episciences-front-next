import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';

export async function fetchForConferenceOrganisersPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData(
    async () => {
      const response = await fetch(
        `${apiUrl}/pages?page_code=for-conference-organisers&rvcode=${rvcode}`,
        {
          next: {
            revalidate: false,
            tags: ['for-conference-organisers'],
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    null,
    `fetchForConferenceOrganisersPage(${rvcode})`
  );
}
