import { ISection } from '@/types/section';
import { IArticle } from '@/types/article';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'section' });
import { formatArticle, FetchedArticle } from '@/utils/article';
import { API_URL, API_PATHS } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';
import { createConcurrencyLimiter } from '@/utils/concurrency';

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
// (24 is where throughput plateaus against the API: ~8s for 1058 papers vs ~22s at 8).
// The limiter is module-level so the cap is shared by all section pages rendered
// concurrently in this process (e.g. during a build), not applied per call.
export const SECTION_ARTICLES_CONCURRENCY = 24;
const limitArticleFetch = createConcurrencyLimiter(SECTION_ARTICLES_CONCURRENCY);

export async function fetchSectionArticles(
  paperIds: string[],
  rvcode?: string,
  sid?: string
): Promise<IArticle[]> {
  const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;

  // One failing article must not break the whole section page: fall back to null
  const fetchOne = (docid: string) =>
    safeFetchData<FetchedArticle | null>(
      async () => {
        const tags = [
          'articles',
          rvcode && `articles-${rvcode}`,
          `article-${docid}`,
          sid && `section-articles-${sid}`,
          sid && rvcode && `section-articles-${sid}-${rvcode}`,
        ].filter(Boolean) as string[];

        const response = await fetch(`${apiRoot}${API_PATHS.papers}${docid}`, {
          next: {
            revalidate: CACHE_TTL.articles,
            tags,
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return formatArticle(await response.json());
      },
      null,
      `fetchSectionArticles(article ${docid}, section ${sid ?? '?'})`
    );

  const articles = await Promise.all(
    paperIds.map(docid => limitArticleFetch(() => fetchOne(docid)))
  );

  return articles.filter((article): article is IArticle => Boolean(article));
}
