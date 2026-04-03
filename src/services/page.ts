import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

export interface IPage {
  id: number;
  title: Record<AvailableLanguage, string>;
  content: Record<AvailableLanguage, string>;
  rvcode: string;
  page_code: string;
}

export async function fetchPage(pageCode: string, rvcode: string): Promise<IPage | undefined> {
  const apiUrl = getJournalApiUrl(rvcode);

  // Use safeFetchData to ensure graceful degradation if API is down
  const page = await safeFetchData(
    async () => {
      const params = new URLSearchParams({ page_code: pageCode, rvcode });
      const response = await fetch(`${apiUrl}/pages?${params}`, {
        next: { revalidate: CACHE_TTL.pages, tags: ['pages', `page-${pageCode}`, `page-${pageCode}-${rvcode}`] },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page with code ${pageCode}: HTTP ${response.status}`);
      }

      const data: IPage[] = await response.json();
      return data.length > 0 ? data[0] : undefined;
    },
    // Fallback to undefined if API fails
    undefined,
    `fetchPage(${pageCode}, ${rvcode})`
  );

  return page;
}
