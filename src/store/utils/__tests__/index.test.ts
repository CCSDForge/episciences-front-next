import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createBaseQuery,
  createBaseQueryWithJsonAccept,
  createBaseQueryWithLdJsonAccept,
} from '../index';

describe('store/utils base query factories', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchOnce() {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  function buildApi(state: Record<string, unknown>) {
    return {
      getState: () => state,
      signal: new AbortController().signal,
      dispatch: vi.fn(),
      extra: undefined,
      endpoint: 'test',
      type: 'query' as const,
    };
  }

  it('uses the dynamic apiEndpoint from journalReducer when present', async () => {
    const fetchMock = mockFetchOnce();

    await createBaseQuery(
      'search',
      buildApi({ journalReducer: { apiEndpoint: 'https://dynamic.test' } }) as never,
      {}
    );

    const [request] = fetchMock.mock.calls[0];
    expect((request as Request).url).toContain('https://dynamic.test');
  });

  it('falls back to the default API URL when no dynamic endpoint is set', async () => {
    const fetchMock = mockFetchOnce();

    await createBaseQueryWithJsonAccept('search', buildApi({}) as never, {});

    expect(fetchMock).toHaveBeenCalled();
    const [request] = fetchMock.mock.calls[0];
    expect((request as Request).headers.get('Accept')).toBe('application/json');
  });

  it('sets the ld+json Accept header for createBaseQueryWithLdJsonAccept', async () => {
    const fetchMock = mockFetchOnce();

    await createBaseQueryWithLdJsonAccept('search', buildApi({}) as never, {});

    const [request] = fetchMock.mock.calls[0];
    expect((request as Request).headers.get('Accept')).toBe('application/ld+json');
  });
});
