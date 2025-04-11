import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseUrl = process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT;

const baseQueryWithRetry = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json')
    return headers;
  }
});

export const createBaseQuery = baseQueryWithRetry;

export const createBaseQueryWithJsonAccept = baseQueryWithRetry;

export const createBaseQueryWithLdJsonAccept = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/ld+json')
    return headers;
  }
}); 