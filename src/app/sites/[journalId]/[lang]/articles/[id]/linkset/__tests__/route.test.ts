import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/article', () => ({
  fetchArticle: vi.fn(),
}));

vi.mock('@/utils/signposting', () => ({
  getJournalBaseUrl: vi.fn((journalId: string) => `https://${journalId}.episciences.org`),
  SIGNPOSTING_FORMATS: [{ format: 'bibtex', type: 'application/x-bibtex' }],
}));

import { fetchArticle } from '@/services/article';

function makeRequest(journalId: string, id: string): NextRequest {
  return new NextRequest(`http://localhost/sites/${journalId}/fr/articles/${id}/linkset`);
}

function makeContext(journalId: string, id: string) {
  return { params: Promise.resolve({ journalId, lang: 'fr', id }) };
}

describe('GET /articles/[id]/linkset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the article belongs to a different journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      authors: [],
      title: 'Some article',
    } as never);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('slovo', '18632'), makeContext('slovo', '18632'));

    expect(res.status).toBe(404);
  });

  it('returns the linkset when the article belongs to the requested journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      authors: [],
      title: 'Some article',
    } as never);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('fajpc', '18632'), makeContext('fajpc', '18632'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.linkset[0].anchor).toBe('https://fajpc.episciences.org/fr/articles/18632');
  });

  it('returns the linkset when journalCode is absent from the payload', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      authors: [],
      title: 'Some article',
    } as never);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('fajpc', '18632'), makeContext('fajpc', '18632'));

    expect(res.status).toBe(200);
  });
});
