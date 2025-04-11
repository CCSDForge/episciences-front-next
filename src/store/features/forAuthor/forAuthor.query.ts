import { createApi } from '@reduxjs/toolkit/query/react'
import { IPage } from '@/types/page'
import { createBaseQueryWithJsonAccept } from '@/lib/api/baseQuery'

interface ForAuthorQueryParams {
  rvcode: string;
}

export const forAuthorApi = createApi({
  baseQuery: createBaseQueryWithJsonAccept,
  reducerPath: 'forAuthor',
  tagTypes: ['For author'],
  endpoints: (builder) => ({
    fetchEditorialWorkflowPage: builder.query<IPage | undefined, ForAuthorQueryParams>({
      query: ({ rvcode }) => ({
        url: `/for-author/editorial-workflow/${rvcode}`,
      }),
      transformResponse: (response: { items: IPage[] }) => response.items[0],
    }),
    fetchEthicalCharterPage: builder.query<IPage | undefined, ForAuthorQueryParams>({
      query: ({ rvcode }) => ({
        url: `/for-author/ethical-charter/${rvcode}`,
      }),
      transformResponse: (response: { items: IPage[] }) => response.items[0],
    }),
    fetchPrepareSubmissionPage: builder.query<IPage | undefined, ForAuthorQueryParams>({
      query: ({ rvcode }) => ({
        url: `/for-author/prepare-submission/${rvcode}`,
      }),
      transformResponse: (response: { items: IPage[] }) => response.items[0],
    }),
  }),
})

export const {
  useFetchEditorialWorkflowPageQuery,
  useFetchEthicalCharterPageQuery,
  useFetchPrepareSubmissionPageQuery,
} = forAuthorApi 