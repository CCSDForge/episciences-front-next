import { createApi } from '@reduxjs/toolkit/query/react'

import { IArticle, IPartialArticle, RawArticle } from '@/types/article'
import { formatArticle, METADATA_TYPE } from '@/utils/article'
import { PaginatedResponseWithRange, Range } from '@/utils/pagination'
import { createBaseQueryWithLdJsonAccept } from '../../utils'

export const articleApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'article',
  tagTypes: ['Article'],
  endpoints: (build) => ({
    fetchArticles: build.query<{ data: IArticle[], totalItems: number, range?: Range }, { rvcode: string, page: number, itemsPerPage: number, types?: string[], years?: number[], onlyAccepted?: boolean }>({
      query: ({ rvcode, page, itemsPerPage, types, years, onlyAccepted }) => {
        const baseUrl = `papers/?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`;
        let queryParams = '';

        if (onlyAccepted) {
          queryParams += `&only_accepted=true`;
        }

        if (types && types.length > 0) {
          const typesQuery = types.map(type => `type[]=${type}`).join('&')
          queryParams += `&${typesQuery}`;
        }
        
        if (years && years.length > 0) {
          const yearsQuery = years.map(year => `year[]=${year}`).join('&')
          queryParams += `&${yearsQuery}`;
        }
        
        return `${baseUrl}${queryParams}`;
      },
      transformResponse: (baseQueryReturnValue: PaginatedResponseWithRange<IPartialArticle>) => {
        const range = (baseQueryReturnValue['hydra:range'] as { publicationYears: number[] });

        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const formattedData = baseQueryReturnValue['hydra:member'].map(partialArticle => ({
          id: partialArticle.paperid,
          ...partialArticle
        }));

        return {
          data: formattedData as unknown as IArticle[],
          totalItems,
          range: {
            ...range,
            years: range.publicationYears
          }
        }
      },
      onQueryStarted: async ({ rvcode, page, itemsPerPage, types, years, onlyAccepted }, { queryFulfilled, dispatch }) => {
        if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
          return;
        }
        
        const { data: articles } = await queryFulfilled;
        const fullArticles: IArticle[] = await Promise.all(
          articles.data.map(async (article: IArticle) => {
            const rawArticle: RawArticle = await (await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/papers/${article?.id}`)).json();
            const formattedArticle = formatArticle(rawArticle);
            if (!formattedArticle) {
              throw new Error(`Article ${article?.id} not found`);
            }
            return formattedArticle;
          })
        );

        dispatch(articleApi.util.updateQueryData('fetchArticles', { rvcode, page, itemsPerPage, types, years, onlyAccepted }, (draftedData) => {
          Object.assign(draftedData.data, fullArticles)
        }));
      },
    }),
    fetchArticle: build.query<IArticle, { paperid: string }>({
      query: ({ paperid } :{ paperid: string; }) => `papers/${paperid}`,
      transformResponse(baseQueryReturnValue: RawArticle) {
        const formattedArticle = formatArticle(baseQueryReturnValue);
        if (!formattedArticle) {
          throw new Error(`Article ${baseQueryReturnValue.paperid} not found`);
        }
        return formattedArticle;
      }
    }),
    fetchArticleMetadata: build.query<BlobPart, { rvcode: string, paperid: string, type: METADATA_TYPE }>({
      query: ({ rvcode, paperid, type }) => {
        return {
          url: `papers/export/${paperid}/${type}?code=${rvcode}`,
          responseHandler: 'text'
        }
      }
    })
  }),
})

export const {
  useFetchArticlesQuery,
  useFetchArticleQuery,
  useFetchArticleMetadataQuery
} = articleApi 