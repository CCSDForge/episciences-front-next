import { describe, it, expect, vi, afterAll } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { volumeApi } from '../volume.query';

vi.mock('@/utils/volume', () => ({
  formatVolume: vi.fn((rvcode: string, language: string, raw: any) => ({
    ...raw,
    rvcode,
    language,
    formatted: true,
  })),
}));

function buildStore() {
  return configureStore({
    reducer: { [volumeApi.reducerPath]: volumeApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(volumeApi.middleware),
  });
}

describe('volume.query - fetchVolumes', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('builds the query URL with types/years and formats each volume', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: string | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.url;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': [{ id: 1 }],
            'hydra:totalItems': 1,
            'hydra:totalPublishedArticles': 5,
            'hydra:range': { year: [2023, 2024] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    }) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      volumeApi.endpoints.fetchVolumes.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        types: ['special_issue'],
        years: [2024],
        language: 'en',
      })
    );

    expect(requestedUrl).toContain('type[]=special_issue');
    expect(requestedUrl).toContain('year[]=2024');

    expect('data' in result).toBe(true);
    expect(result.data?.totalItems).toBe(1);
    expect(result.data?.articlesCount).toBe(5);
    expect(result.data?.range).toEqual({ year: [2023, 2024], years: [2023, 2024] });
    expect(result.data?.data[0]).toEqual(
      expect.objectContaining({ id: 1, rvcode: 'epijinfo', language: 'en', formatted: true })
    );
  });

  it('defaults range.years to an empty array when the API omits it', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ 'hydra:member': [], 'hydra:totalItems': 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      volumeApi.endpoints.fetchVolumes.initiate({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        language: 'en',
      })
    );

    expect(result.data?.range?.years).toEqual([]);
  });
});

describe('volume.query - fetchVolume', () => {
  const originalFetch = global.fetch;
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('fetches and formats a single volume', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 7 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    const store = buildStore();
    const result = await store.dispatch(
      volumeApi.endpoints.fetchVolume.initiate({ rvcode: 'epijinfo', vid: '7', language: 'fr' })
    );

    if ('data' in result) {
      expect(result.data).toEqual(
        expect.objectContaining({ id: 7, rvcode: 'epijinfo', language: 'fr', formatted: true })
      );
    }
  });
});
