import { createApi } from '@reduxjs/toolkit/query/react'

import { RawArticle } from '@/types/article'
import { FetchedArticle, formatArticle } from '@/utils/article'
import { PaginatedResponseWithSearchRange, SearchRange } from '@/utils/pagination'
import { formatSearchRange } from '@/utils/search'
import { createBaseQueryWithLdJsonAccept } from '@/store/utils'
import { ISearchResult } from '@/types/search'

export const searchApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'search',
  tagTypes: ['Search'],
  endpoints: (build) => ({
    fetchSearchResults: build.query<{ data: FetchedArticle[], totalItems: number, range?: SearchRange }, { terms: string; rvcode: string, page: number, itemsPerPage: number, types?: string[], years?: number[], volumes?: number[], sections?: number[], authors?: string[] }>({
      query: ({ terms, rvcode, page, itemsPerPage, types, years, volumes, sections, authors }) => {
        const baseUrl = `search?terms=${terms}&page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`;
        let queryParams = '';

        if (types && types.length > 0) {
          const typesQuery = types.map(type => `type[]=${type}`).join('&')
          queryParams += `&${typesQuery}`;
        }
        
        if (years && years.length > 0) {
          const yearsQuery = years.map(year => `year[]=${year}`).join('&')
          queryParams += `&${yearsQuery}`;
        }

        if (volumes && volumes.length > 0) {
          const volumesQuery = volumes.map(volume => `volume_id[]=${volume}`).join('&')
          queryParams += `&${volumesQuery}`;
        }

        if (sections && sections.length > 0) {
          const sectionsQuery = sections.map(section => `section_id[]=${section}`).join('&')
          queryParams += `&${sectionsQuery}`;
        }

        if (authors && authors.length > 0) {
          const authorsQuery = authors.map(author => `author_fullname[]=${author}`).join('&')
          queryParams += `&${authorsQuery}`;
        }
        
        return `${baseUrl}${queryParams}`;
      },
      transformResponse: (baseQueryReturnValue: PaginatedResponseWithSearchRange<ISearchResult>) => {
        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const formattedData = baseQueryReturnValue['hydra:member'].map(searchResult => ({ id: searchResult.docid }));

        return {
          data: formattedData as unknown as FetchedArticle[],
          totalItems,
          range: formatSearchRange(baseQueryReturnValue['hydra:range'])
        }
      },
      async onQueryStarted({ terms, rvcode, page, itemsPerPage, types, years, volumes, sections, authors }, { queryFulfilled, dispatch }) {
        const { data: searchResults } = await queryFulfilled;
        const fullResults: FetchedArticle[] = await Promise.all(
          searchResults.data.map(async (searchResult: FetchedArticle) => {
            const rawArticle: RawArticle = await (await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/papers/${searchResult?.id}`)).json();
            return formatArticle(rawArticle);
          })
        );

        dispatch(searchApi.util.updateQueryData('fetchSearchResults', { terms, rvcode, page, itemsPerPage, types, years, volumes, sections, authors }, (draftedData) => {
          Object.assign(draftedData.data, fullResults);
        }));
      }
    }),
  }),
})

export const {
  useFetchSearchResultsQuery,
} = searchApi 