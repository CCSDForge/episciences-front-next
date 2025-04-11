import { createApi } from '@reduxjs/toolkit/query/react'

import { IPage } from '@/types/page'
import { createBaseQueryWithJsonAccept } from '@/store/utils'

export const aboutApi = createApi({
  baseQuery: createBaseQueryWithJsonAccept,
  reducerPath: 'about',
  tagTypes: ['About'],
  endpoints: (build) => ({
    fetchAboutPage: build.query<IPage | undefined, string>({
      query: (rvcode: string) => `pages?page_code=about&rvcode=${rvcode}`,
      transformResponse(baseQueryReturnValue: IPage[]) {
        return baseQueryReturnValue.length > 0 ? baseQueryReturnValue[0] : undefined
      },
    }),
  }),
})

export const {
  useFetchAboutPageQuery,
} = aboutApi 