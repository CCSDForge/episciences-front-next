import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/article', () => ({
  fetchArticle: vi.fn(),
}));

vi.mock('@/utils/pdf', () => ({
  generateArticleFilename: vi.fn(() => 'article.pdf'),
  isAllowedPdfDomain: vi.fn(() => true),
}));

vi.mock('@/utils/validation', () => ({
  isValidJournalId: vi.fn(() => true),
}));

import { fetchArticle } from '@/services/article';

function makeRequest(journalId: string, id: string): NextRequest {
  return new NextRequest(`http://localhost/sites/${journalId}/fr/articles/${id}/download`);
}

function makeContext(journalId: string, id: string) {
  return { params: Promise.resolve({ journalId, lang: 'fr' as const, id }) };
}

describe('GET /articles/[id]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns 404 when the article belongs to a different journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      pdfLink: 'https://hal.science/hal-05671009v1/document',
      title: 'Some article',
      authors: [],
    } as never);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('slovo', '18632'), makeContext('slovo', '18632'));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('serves the PDF when the article belongs to the requested journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      pdfLink: 'https://hal.science/hal-05671009v1/document',
      title: 'Some article',
      authors: [],
    } as never);
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('%PDF-1.4', { status: 200, headers: { 'Content-Length': '8' } })
    );

    const { GET } = await import('../route');
    const res = await GET(makeRequest('fajpc', '18632'), makeContext('fajpc', '18632'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('serves the PDF when journalCode is absent from the payload', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      pdfLink: 'https://hal.science/hal-05671009v1/document',
      title: 'Some article',
      authors: [],
    } as never);
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('%PDF-1.4', { status: 200 }));

    const { GET } = await import('../route');
    const res = await GET(makeRequest('fajpc', '18632'), makeContext('fajpc', '18632'));

    expect(res.status).toBe(200);
  });

  it('returns 404 when the article has no PDF link', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      title: 'Some article',
      authors: [],
    } as never);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('fajpc', '18632'), makeContext('fajpc', '18632'));

    expect(res.status).toBe(404);
  });
});
