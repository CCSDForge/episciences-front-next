import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const createBaseQueryWithJsonAccept = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT,
  prepareHeaders: headers => {
    headers.set('Accept', 'application/json');
    return headers;
  },
});
