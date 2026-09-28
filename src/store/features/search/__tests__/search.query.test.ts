import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { searchApi } from '../search.query';
import searchReducer from '../search.slice';

vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn(raw => ({ ...raw, formatted: true })),
}));

describe('search.query - end to end', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function buildStore() {
    return configureStore({
      reducer: {
        searchReducer,
        [searchApi.reducerPath]: searchApi.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(searchApi.middleware),
    });
  }

  it('builds the search URL with all filters and enriches results via onQueryStarted', async () => {
    const requestedUrls: string[] = [];

    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      requestedUrls.push(requestUrl);
      if (requestUrl.includes('/papers/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ '@id': '/api/papers/1', docid: '1' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:totalItems': 1,
            'hydra:member': [{ docid: '1' }],
            'hydra:range': { year: { '2024': 3 }, type: { 'research-article': 2 } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();

    const result = await store.dispatch(
      searchApi.endpoints.fetchSearchResults.initiate({
        terms: 'graph',
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        types: ['research-article'],
        years: [2023, 2024],
        volumes: [7],
        sections: [3],
        authors: ['Doe'],
      })
    );

    expect('data' in result).toBe(true);
    const searchListUrl = requestedUrls.find(u => u.includes('terms=graph'))!;
    expect(searchListUrl).toContain('type[]=research-article');
    expect(searchListUrl).toContain('year[]=2023');
    expect(searchListUrl).toContain('year[]=2024');
    expect(searchListUrl).toContain('volume_id[]=7');
    expect(searchListUrl).toContain('section_id[]=3');
    expect(searchListUrl).toContain('author_fullname[]=Doe');

    expect(result.data?.totalItems).toBe(1);
    expect(result.data?.range?.years).toEqual([{ value: 2024, count: 3 }]);
    expect(result.data?.range?.types).toEqual([{ value: 'research-article', count: 2 }]);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.getState().searchReducer.results.totalItems).toBe(1);
  });

  it('drops search results whose enrichment fetch fails instead of injecting a malformed entry', async () => {
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      if (requestUrl.includes('/papers/1?')) {
        return Promise.resolve(
          new Response(JSON.stringify({ '@id': '/api/papers/1', docid: '1' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      if (requestUrl.includes('/papers/2?')) {
        // Simulates the proxy's rate limiter or an upstream timeout.
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:totalItems': 2,
            'hydra:member': [{ docid: '1' }, { docid: '2' }],
            'hydra:range': { year: {}, type: {} },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();

    await store.dispatch(
      searchApi.endpoints.fetchSearchResults.initiate({
        terms: 'graph',
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
      })
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    const state = store.getState() as unknown as {
      [searchApi.reducerPath]: {
        queries: Record<string, { data?: { data: Array<{ docid?: string }> } }>;
      };
    };
    const cachedQuery = Object.values(state[searchApi.reducerPath].queries)[0];
    expect(cachedQuery?.data?.data).toHaveLength(1);
  });
});
