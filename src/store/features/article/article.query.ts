import { createApi } from '@reduxjs/toolkit/query/react';

import { IArticle, IPartialArticle, RawArticle } from '@/types/article';
import { formatArticle, METADATA_TYPE } from '@/utils/article';
import { PaginatedResponseWithRange, Range } from '@/utils/pagination';
import { createBaseQueryWithLdJsonAccept } from '../../utils';
import { API_URL } from '@/config/api';
import { logger } from '@/lib/logger';

type FetchArticlesArgs = {
  rvcode: string;
  page: number;
  itemsPerPage: number;
  types?: string[];
  years?: number[];
  onlyAccepted?: boolean;
};

type ArticlesPage = { data: IArticle[]; totalItems: number; range?: Range };

function buildArticlesUrl({
  rvcode,
  page,
  itemsPerPage,
  types,
  years,
  onlyAccepted,
}: FetchArticlesArgs): string {
  const baseUrl = `papers/?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`;
  let queryParams = '';

  if (onlyAccepted) {
    queryParams += `&only_accepted=true`;
  }

  if (types && types.length > 0) {
    const typesQuery = types.map(type => `type[]=${type}`).join('&');
    queryParams += `&${typesQuery}`;
  }

  if (years && years.length > 0) {
    const yearsQuery = years.map(year => `year[]=${year}`).join('&');
    queryParams += `&${yearsQuery}`;
  }

  return `${baseUrl}${queryParams}`;
}

function formatArticlesPage(
  baseQueryReturnValue: PaginatedResponseWithRange<IPartialArticle>
): ArticlesPage {
  const range = baseQueryReturnValue['hydra:range'] as {
    publicationYears: number[];
    types?: string[];
  };

  const totalItems = baseQueryReturnValue['hydra:totalItems'];
  const formattedData = baseQueryReturnValue['hydra:member'].map(partialArticle => ({
    id: partialArticle.paperid,
    ...partialArticle,
  }));

  return {
    data: formattedData as unknown as IArticle[],
    totalItems,
    range: {
      ...range,
      years: range?.publicationYears,
      types: range?.types,
    },
  };
}

async function enrichArticles(articles: IArticle[], rvcode: string): Promise<IArticle[]> {
  const results = await Promise.allSettled(
    articles.map(async (article: IArticle) => {
      const response = await fetch(`${API_URL}/papers/${article?.id}?rvcode=${rvcode}`);
      if (!response.ok) {
        throw new Error(`Article ${article?.id} fetch failed: HTTP ${response.status}`);
      }
      const rawArticle: RawArticle = await response.json();
      const formattedArticle = formatArticle(rawArticle);
      if (!formattedArticle) {
        throw new Error(`Article ${article?.id} not found`);
      }
      return formattedArticle;
    })
  );

  // Drop articles whose enrichment fetch failed (e.g. rate-limited or timed out)
  // instead of feeding a malformed response into formatArticle, which would
  // otherwise silently produce a fake minimal article with a colliding id.
  return results
    .filter((result): result is PromiseFulfilledResult<IArticle> => {
      if (result.status === 'rejected') {
        logger.warn('[fetchArticles] Article enrichment failed:', result.reason?.message);
        return false;
      }
      return true;
    })
    .map(result => result.value);
}

export const articleApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'article',
  tagTypes: ['Article'],
  endpoints: build => ({
    fetchArticles: build.query<ArticlesPage, FetchArticlesArgs>({
      // The list endpoint only returns partial articles (no title, authors, ...), so each one
      // is enriched before the result reaches the cache. Doing it inside the query keeps
      // isFetching true until the list is complete, instead of briefly exposing partial
      // articles that consumers filter out (which rendered the "no results" state).
      queryFn: async (args, _api, _extraOptions, baseQuery) => {
        const listResult = await baseQuery(buildArticlesUrl(args));
        if (listResult.error) {
          return { error: listResult.error };
        }

        const page = formatArticlesPage(
          listResult.data as PaginatedResponseWithRange<IPartialArticle>
        );

        if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
          return { data: page };
        }

        return { data: { ...page, data: await enrichArticles(page.data, args.rvcode) } };
      },
    }),
    fetchArticle: build.query<IArticle, { paperid: string }>({
      query: ({ paperid }: { paperid: string }) => `papers/${paperid}`,
      transformResponse(baseQueryReturnValue: RawArticle) {
        const formattedArticle = formatArticle(baseQueryReturnValue);
        if (!formattedArticle) {
          throw new Error(`Article ${baseQueryReturnValue.paperid} not found`);
        }
        return formattedArticle;
      },
    }),
    fetchArticleMetadata: build.query<
      BlobPart,
      { rvcode: string; paperid: string; type: METADATA_TYPE }
    >({
      query: ({ rvcode, paperid, type }) => {
        return {
          url: `papers/export/${paperid}/${type}?code=${rvcode}`,
          responseHandler: 'text',
        };
      },
    }),
  }),
});

export const { useFetchArticlesQuery, useFetchArticleQuery, useFetchArticleMetadataQuery } =
  articleApi;
