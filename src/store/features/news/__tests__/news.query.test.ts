import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { newsApi } from '../news.query';

function buildStore() {
  return configureStore({
    reducer: { [newsApi.reducerPath]: newsApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(newsApi.middleware),
  });
}

describe('news.query - fetchNews', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('appends years to the query and formats each news item', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': [
              {
                id: 1,
                title: { en: 'News 1' },
                date_creation: '2024-01-01T00:00:00+00:00',
                creator: { screenName: 'Editor' },
                link: { und: 'https://example.com/news/1' },
              },
            ],
            'hydra:totalItems': 1,
            'hydra:range': { years: [2024] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      newsApi.endpoints.fetchNews.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        years: [2024],
      })
    );

    expect(requestedUrl).toContain('year[]=2024');

    expect(result.data?.totalItems).toBe(1);
    expect(result.data?.data[0]).toEqual(
      expect.objectContaining({
        publicationDate: '2024-01-01T00:00:00+00:00',
        author: 'Editor',
        link: 'https://example.com/news/1',
      })
    );
  });

  it('omits the years filter when absent and defaults link/publicationDate', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': [
              { id: 2, title: { en: 'No link' }, creator: { screenName: 'Editor' } },
            ],
            'hydra:totalItems': 1,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      newsApi.endpoints.fetchNews.initiate({ rvcode: 'epijinfo', page: 1, itemsPerPage: 10 })
    );

    expect(requestedUrl).not.toContain('year[]');
    expect(result.data?.data[0].link).toBeUndefined();
    expect(result.data?.data[0].publicationDate).toEqual(expect.any(String));
  });
});
