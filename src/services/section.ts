import { ISection } from '@/types/section';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'section' });
import { formatArticle } from '@/utils/article';
import { API_URL, API_PATHS } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

interface FetchSectionParams {
  sid: string;
  rvcode?: string;
}

interface FetchSectionsParams {
  rvcode: string;
  page?: number;
  itemsPerPage?: number;
}

export async function fetchSection({ sid, rvcode }: FetchSectionParams): Promise<ISection | null> {
  const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;
  const url = rvcode
    ? `${apiRoot}${API_PATHS.sections}/${encodeURIComponent(sid)}?rvcode=${encodeURIComponent(rvcode)}`
    : `${apiRoot}${API_PATHS.sections}/${encodeURIComponent(sid)}`;
  return safeFetchData(
    async () => {
      const response = await fetch(url, {
        next: {
          revalidate: CACHE_TTL.sections,
          tags: [
            'sections',
            `sections-${rvcode}`,
            `section-${sid}`,
            `section-${sid}-${rvcode}`,
          ].filter(Boolean),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawSection = await response.json();
      return {
        ...rawSection,
        id: rawSection.sid,
        title: rawSection.titles,
        description: rawSection.descriptions,
        articles: rawSection.papers,
        committee: rawSection.committee,
      };
    },
    null,
    `fetchSection(${sid})`
  );
}

/**
 * Fetch sections list
 * @param params - Fetch parameters
 * @returns Sections data with pagination info
 */
export async function fetchSections({
  rvcode,
  page = 1,
  itemsPerPage = 10,
}: FetchSectionsParams): Promise<{ data: ISection[]; totalItems: number; articlesCount: number }> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(
      `${apiUrl}${API_PATHS.sections}?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`,
      {
        next: {
          revalidate: CACHE_TTL.sections,
          tags: ['sections', `sections-${rvcode}`],
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sections: ${response.statusText}`);
    }

    const baseQueryReturnValue = await response.json();

    const articlesCount = baseQueryReturnValue['hydra:totalPublishedArticles'];
    const totalItems = baseQueryReturnValue['hydra:totalItems'];
    const formattedData = baseQueryReturnValue['hydra:member'].map((section: any) => ({
      ...section,
      id: section['sid'],
      title: section['titles'],
      description: section['descriptions'],
      articles: section['papers'],
    }));

    return {
      data: formattedData,
      totalItems,
      articlesCount,
    };
  } catch (error) {
    log.error('Error fetching sections:', error);
    return { data: [], totalItems: 0, articlesCount: 0 };
  }
}

// Sections can hold 1000+ papers: cap parallel requests to avoid socket exhaustion
// (24 is where throughput plateaus against the API: ~8s for 1058 papers vs ~22s at 8)
const SECTION_ARTICLES_CONCURRENCY = 24;

export async function fetchSectionArticles(paperIds: string[], rvcode?: string, sid?: string) {
  const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;

  const fetchOne = async (docid: string) => {
    const tags = [
      'articles',
      rvcode && `articles-${rvcode}`,
      `article-${docid}`,
      sid && `section-articles-${sid}`,
      sid && rvcode && `section-articles-${sid}-${rvcode}`,
    ].filter(Boolean) as string[];

    try {
      const response = await fetch(`${apiRoot}${API_PATHS.papers}${docid}`, {
        next: {
          revalidate: CACHE_TTL.articles,
          tags,
        },
      });

      if (!response.ok) {
        return null;
      }

      const article = await response.json();
      return formatArticle(article);
    } catch (error) {
      // One failing article must not break the whole section page
      log.warn(`Failed to fetch article ${docid} for section ${sid ?? '?'}`, error);
      return null;
    }
  };

  const articles: Awaited<ReturnType<typeof fetchOne>>[] = new Array(paperIds.length);
  let next = 0;
  const worker = async () => {
    while (next < paperIds.length) {
      const index = next++;
      articles[index] = await fetchOne(paperIds[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(SECTION_ARTICLES_CONCURRENCY, paperIds.length) }, worker)
  );

  return articles.filter(Boolean);
}
