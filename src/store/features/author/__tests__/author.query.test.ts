import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { authorApi } from '../author.query';

function buildStore() {
  return configureStore({
    reducer: { [authorApi.reducerPath]: authorApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(authorApi.middleware),
  });
}

describe('author.query - fetchAuthors', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('builds the query URL with search and letter, and formats the response', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': [{ '@id': '/a/1', values: { name: 'Jane Doe', count: 3 } }],
            'hydra:totalItems': 1,
            'hydra:range': { A: 1, J: 1 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      authorApi.endpoints.fetchAuthors.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        search: 'Jane',
        letter: 'J',
      })
    );

    expect(requestedUrl).toContain('search=Jane');
    expect(requestedUrl).toContain('letter=J');

    expect('data' in result).toBe(true);
    expect(result.data?.data).toEqual([{ name: 'Jane Doe', count: 3 }]);
    expect(result.data?.totalItems).toBe(1);
    expect(result.data?.range).toEqual({ A: 1, J: 1 });
  });

  it('omits search/letter params when absent', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(JSON.stringify({ 'hydra:member': [], 'hydra:totalItems': 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    }) as unknown as typeof fetch;

    const store = buildStore();
    await store.dispatch(
      authorApi.endpoints.fetchAuthors.initiate({ rvcode: 'epijinfo', page: 1, itemsPerPage: 10 })
    );

    expect(requestedUrl).not.toContain('search=');
    expect(requestedUrl).not.toContain('letter=');
  });
});

describe('author.query - fetchAuthorArticles', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('deduplicates articles by paperid, keeping the highest version', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          'hydra:member': [
            {
              paperid: 1,
              paper_title_t: ['Title v1'],
              publication_date_tdate: '2024-01-01',
              doi_s: '10.1/v1',
              version_td: 1,
            },
            {
              paperid: 1,
              paper_title_t: ['Title v2'],
              publication_date_tdate: '2024-02-01',
              doi_s: '10.1/v2',
              version_td: 2,
            },
            {
              paperid: 2,
              paper_title_t: ['Other article'],
              publication_date_tdate: '2024-03-01',
              doi_s: '10.2/v1',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    ) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      authorApi.endpoints.fetchAuthorArticles.initiate({ rvcode: 'epijinfo', fullname: 'Jane Doe' })
    );

    expect('data' in result).toBe(true);
    expect(result.data?.totalItems).toBe(2);
    const paper1 = result.data?.data.find(a => a.id === 1);
    expect(paper1?.title).toBe('Title v2');
  });
});
