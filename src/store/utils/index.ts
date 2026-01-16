import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

// Server-side: use direct API URL, Client-side: use dynamic proxy to avoid CORS
const defaultBaseUrl =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || 'https://api-preprod.episciences.org/api'
    : '/api/proxy';

const createDynamicBaseQuery =
  (acceptHeader: string): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =>
  async (args, api, extraOptions) => {
    const state = api.getState() as any;
    const baseUrl = state.journalReducer?.apiEndpoint || defaultBaseUrl;

    return fetchBaseQuery({
      baseUrl,
      prepareHeaders: headers => {
        headers.set('Accept', acceptHeader);
        return headers;
      },
    })(args, api, extraOptions);
  };

export const createBaseQuery = createDynamicBaseQuery('application/json');

export const createBaseQueryWithJsonAccept = createDynamicBaseQuery('application/json');

export const createBaseQueryWithLdJsonAccept = createDynamicBaseQuery('application/ld+json');
