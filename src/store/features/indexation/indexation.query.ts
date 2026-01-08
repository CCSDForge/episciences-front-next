import { createApi } from '@reduxjs/toolkit/query/react';

import { IPage } from '../../../types/page';
import { createBaseQueryWithJsonAccept } from '../../utils';

export const indexationApi = createApi({
  baseQuery: createBaseQueryWithJsonAccept,
  reducerPath: 'indexation',
  tagTypes: ['Indexation'],
  endpoints: build => ({
    fetchIndexationPage: build.query<IPage | undefined, string>({
      query: (rvcode: string) => `pages?page_code=journal-indexing&rvcode=${rvcode}`,
      transformResponse(baseQueryReturnValue: IPage[]) {
        return baseQueryReturnValue.length > 0 ? baseQueryReturnValue[0] : undefined;
      },
    }),
  }),
});

export const { useFetchIndexationPageQuery } = indexationApi;
