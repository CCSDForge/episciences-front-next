import { createApi } from '@reduxjs/toolkit/query/react';

import { IPage } from '@/types/page';
import { createBaseQueryWithJsonAccept } from '@/store/utils';

export const creditsApi = createApi({
  baseQuery: createBaseQueryWithJsonAccept,
  reducerPath: 'credits',
  tagTypes: ['Credits'],
  endpoints: build => ({
    fetchCreditsPage: build.query<IPage | undefined, string>({
      query: (rvcode: string) => `pages?page_code=credits&rvcode=${rvcode}`,
      transformResponse(baseQueryReturnValue: IPage[]) {
        return baseQueryReturnValue.length > 0 ? baseQueryReturnValue[0] : undefined;
      },
    }),
  }),
});

export const { useFetchCreditsPageQuery } = creditsApi;
