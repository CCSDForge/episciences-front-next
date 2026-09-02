import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProposingSpecialIssuesPage } from '../proposingSpecialIssues';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.test`),
}));

vi.mock('@/utils/api-error-handler', () => ({
  safeFetchData: vi.fn(async (fn: () => Promise<unknown>, fallback: unknown) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(data),
});

describe('proposingSpecialIssues service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the first page item on success', async () => {
    const pageItem = {
      page_code: 'proposing-special-issues',
      content: { en: '<p>Special issues guidelines</p>' },
    };
    mockFetch.mockResolvedValue(
      createMockResponse({
        'hydra:member': [pageItem],
      })
    );

    const result = await fetchProposingSpecialIssuesPage('epijinfo');

    expect(result).toEqual(pageItem);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.epijinfo.test/pages?page_code=proposing-special-issues&rvcode=epijinfo',
      expect.objectContaining({
        next: expect.objectContaining({
          tags: ['proposing-special-issues', 'proposing-special-issues-epijinfo'],
        }),
      })
    );
  });

  it('should return null when hydra:member is empty', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        'hydra:member': [],
      })
    );

    const result = await fetchProposingSpecialIssuesPage('epijinfo');
    expect(result).toBeNull();
  });

  it('should return null when fetch fails (HTTP error)', async () => {
    mockFetch.mockResolvedValue(createMockResponse(null, false, 404));

    const result = await fetchProposingSpecialIssuesPage('epijinfo');
    expect(result).toBeNull();
  });

  it('should return null when fetch throws network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchProposingSpecialIssuesPage('epijinfo');
    expect(result).toBeNull();
  });
});
