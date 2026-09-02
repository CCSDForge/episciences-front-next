import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { articleApi } from '../article.query';

vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn(raw => ({ ...raw, formatted: true })),
  METADATA_TYPE: { CSL: 'csl', BIBTEX: 'bibtex' },
}));

function buildStore() {
  return configureStore({
    reducer: { [articleApi.reducerPath]: articleApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(articleApi.middleware),
  });
}

describe('article.query - fetchArticles', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_STATIC_BUILD;

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_STATIC_BUILD = originalEnv;
  });

  it('builds the query URL with types/years/onlyAccepted and enriches results via onQueryStarted', async () => {
    delete process.env.NEXT_PUBLIC_STATIC_BUILD;
    const requestedUrls: string[] = [];

    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      const url = typeof input === 'string' ? input : input.url;
      requestedUrls.push(url);
      if (url.includes('/papers/1?')) {
        return Promise.resolve(
          new Response(JSON.stringify({ paperid: 1, title: 'Full article' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': [{ paperid: 1 }],
            'hydra:totalItems': 1,
            'hydra:range': { publicationYears: [2024], types: ['article'] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();

    const result = await store.dispatch(
      articleApi.endpoints.fetchArticles.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        types: ['article'],
        years: [2024],
        onlyAccepted: true,
      })
    );

    const listUrl = requestedUrls.find(u => u.includes('itemsPerPage'))!;
    expect(listUrl).toContain('only_accepted=true');
    expect(listUrl).toContain('type[]=article');
    expect(listUrl).toContain('year[]=2024');

    expect('data' in result).toBe(true);
    expect(result.data?.totalItems).toBe(1);
    expect(result.data?.range).toEqual({
      publicationYears: [2024],
      types: ['article'],
      years: [2024],
    });

    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('skips the client-side enrichment during static builds', async () => {
    process.env.NEXT_PUBLIC_STATIC_BUILD = 'true';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ 'hydra:member': [{ paperid: 1 }], 'hydra:totalItems': 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const store = buildStore();

    await store.dispatch(
      articleApi.endpoints.fetchArticles.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
      })
    );

    await new Promise(resolve => setTimeout(resolve, 0));
    // Only the list request should happen — no per-article enrichment fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('article.query - fetchArticle', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns the formatted article', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ paperid: 42, title: 'Solo article' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      articleApi.endpoints.fetchArticle.initiate({ paperid: '42' })
    );

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data).toEqual(expect.objectContaining({ paperid: 42, formatted: true }));
    }
  });
});
