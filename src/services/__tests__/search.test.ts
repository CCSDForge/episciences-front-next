import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSearchResults } from '../search';
import { API_PATHS } from '@/config/api';

// Mock dependencies
vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn().mockReturnValue('https://mock-api.com'),
}));

vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn(article => ({ ...article, formatted: true })),
}));

vi.mock('@/utils/search', () => ({
  formatSearchRange: vi.fn(() => ({ start: 1, end: 10, total: 100 })),
}));

describe('fetchSearchResults', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should construct the search URL correctly with all parameters', async () => {
    // Mock successful search response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'hydra:member': [],
        'hydra:totalItems': 0,
        'hydra:range': {},
      }),
    });

    await fetchSearchResults({
      terms: 'test query',
      rvcode: 'journal-code',
      page: 2,
      itemsPerPage: 20,
      types: ['article', 'review'],
      years: [2020, 2021],
      volumes: [1, 2],
      sections: [10, 11],
      authors: ['Doe', 'Smith'],
    });

    const expectedUrl = new URL('https://mock-api.com' + API_PATHS.search);
    expectedUrl.searchParams.append('terms', 'test query');
    expectedUrl.searchParams.append('page', '2');
    expectedUrl.searchParams.append('itemsPerPage', '20');
    expectedUrl.searchParams.append('rvcode', 'journal-code');
    expectedUrl.searchParams.append('type[]', 'article');
    expectedUrl.searchParams.append('type[]', 'review');
    expectedUrl.searchParams.append('year[]', '2020');
    expectedUrl.searchParams.append('year[]', '2021');
    expectedUrl.searchParams.append('volume_id[]', '1');
    expectedUrl.searchParams.append('volume_id[]', '2');
    expectedUrl.searchParams.append('section_id[]', '10');
    expectedUrl.searchParams.append('section_id[]', '11');
    expectedUrl.searchParams.append('author_fullname[]', 'Doe');
    expectedUrl.searchParams.append('author_fullname[]', 'Smith');

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expectedUrl.toString(),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should fetch details for each search result', async () => {
    const searchResults = [{ docid: 101 }, { docid: 102 }];

    // 1. Mock Search Response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'hydra:member': searchResults,
        'hydra:totalItems': 2,
        'hydra:range': {},
      }),
    });

    // 2. Mock Article 101 Response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 101, title: 'Article 1' }),
    });

    // 3. Mock Article 102 Response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 102, title: 'Article 2' }),
    });

    const result = await fetchSearchResults({ terms: 'test' });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Check calls for individual articles
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`${API_PATHS.papers}101`),
      expect.anything()
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`${API_PATHS.papers}102`),
      expect.anything()
    );

    // Verify result contains formatted articles
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual(expect.objectContaining({ id: 101, formatted: true }));
    expect(result.data[1]).toEqual(expect.objectContaining({ id: 102, formatted: true }));
  });

  it('should handle search API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchSearchResults({ terms: 'fail' })).rejects.toThrow(
      'Failed to fetch search results: 500'
    );
  });

  it('should handle individual article fetch failure gracefully', async () => {
    const searchResults = [
      { docid: 101 }, // Will fail
      { docid: 102 }, // Will succeed
    ];

    // 1. Mock Search Response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'hydra:member': searchResults,
        'hydra:totalItems': 2,
        'hydra:range': {},
      }),
    });

    // 2. Mock Article 101 Response (Fail)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // 3. Mock Article 102 Response (Success)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 102, title: 'Article 2' }),
    });

    // Spy on console.warn to suppress output
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchSearchResults({ terms: 'partial' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(102);

    consoleSpy.mockRestore();
  });

  it('should use default API_URL when rvcode is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'hydra:member': [],
        'hydra:totalItems': 0,
        'hydra:range': {},
      }),
    });

    await fetchSearchResults({ terms: 'test' });

    // getJournalApiUrl returns 'https://mock-api.com'
    // If rvcode is missing, it should use API_URL which is NOT 'https://mock-api.com'
    // (unless they happen to be identical, which is unlikely given the mock)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.not.stringContaining('https://mock-api.com'),
      expect.anything()
    );
  });
});
