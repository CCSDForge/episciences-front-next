import { createApi } from '@reduxjs/toolkit/query/react'

import { RawNews, INews } from '../../../types/news'
import { PaginatedResponseWithRange, Range } from '../../../utils/pagination'
import { createBaseQueryWithLdJsonAccept } from '../../utils'

export const newsApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'news',
  tagTypes: ['News'],
  endpoints: (build) => ({
    fetchNews: build.query<{ data: INews[], totalItems: number, range?: Range }, { rvcode: string, page: number, itemsPerPage: number; years?: number[] }>({
      query: ({ rvcode, page, itemsPerPage, years } :{ rvcode: string, page: number, itemsPerPage: number; years?: number[] }) => {
        if (years && years.length > 0) {
          const yearsQuery = years.map(year => `year[]=${year}`).join('&')
          return `news/?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}&${yearsQuery}`
         }
         
        return `news/?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`
      },
      transformResponse(baseQueryReturnValue: PaginatedResponseWithRange<RawNews>) {
        const range = baseQueryReturnValue['hydra:range'];

        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const formattedData = (baseQueryReturnValue['hydra:member']).map((news) => ({
          ...news,
          publicationDate: news['date_creation'] || new Date().toISOString(),
          author: news['creator']['screenName'],
          link: news['link'] ? news['link']['und'] : undefined
        }))

        return {
          data: formattedData,
          totalItems,
          range
        }
      },
    }),
  }),
})

export const {
  useFetchNewsQuery,
} = newsApi 