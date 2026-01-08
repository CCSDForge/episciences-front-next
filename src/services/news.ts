import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';

export interface INews {
  id: number;
  title: Record<AvailableLanguage, string>;
  content?: Record<AvailableLanguage, string>;
  publicationDate: string;
  author: string;
  link?: string;
}

export type RawNews = {
  id: number;
  title: Record<AvailableLanguage, string>;
  content?: Record<AvailableLanguage, string>;
  date_creation: string;
  creator: {
    screenName: string;
  };
  link?: {
    und: string;
  };
};

export interface Range {
  years?: number[];
}

export interface PaginatedResponseWithRange<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
  'hydra:range'?: Range;
}

export async function fetchNews({
  rvcode,
  page = 1,
  itemsPerPage = 10,
  years = [],
}: {
  rvcode: string;
  page?: number;
  itemsPerPage?: number;
  years?: number[];
}): Promise<{ data: INews[]; totalItems: number; range?: Range }> {
  const apiUrl = getJournalApiUrl(rvcode);
  let url = `${apiUrl}/news/?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`;

  if (years && years.length > 0) {
    const yearsQuery = years.map(year => `year[]=${year}`).join('&');
    url = `${url}&${yearsQuery}`;
  }

  // Use safeFetchData to ensure graceful degradation if API is down
  const result = await safeFetchData(
    async () => {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/ld+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch news: HTTP ${response.status}`);
      }

      const data: PaginatedResponseWithRange<RawNews> = await response.json();
      const range = data['hydra:range'];
      const totalItems = data['hydra:totalItems'];

      const formattedData = data['hydra:member'].map(news => ({
        id: news.id,
        title: news.title,
        content: news.content,
        publicationDate: news.date_creation,
        author: news.creator.screenName,
        link: news.link ? news.link.und : undefined,
      }));

      return {
        data: formattedData,
        totalItems,
        range,
      };
    },
    // Fallback to empty news list if API fails
    { data: [], totalItems: 0, range: undefined },
    `fetchNews(${rvcode}, page=${page})`
  );

  return result;
}
