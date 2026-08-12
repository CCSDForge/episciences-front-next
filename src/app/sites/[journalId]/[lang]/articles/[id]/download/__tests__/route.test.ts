import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/article', () => ({
  fetchArticle: vi.fn(),
}));

vi.mock('@/utils/pdf', () => ({
  generateArticleFilename: vi.fn((journalCode, articleId, title) => {
    const sanitizedTitle = (title || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const prefix = journalCode ? `${journalCode}_` : '';
    return `${prefix}article_${articleId}_${sanitizedTitle}.pdf`;
  }),
  isAllowedPdfDomain: vi.fn(() => true),
}));

vi.mock('@/utils/validation', () => ({
  isValidJournalId: vi.fn((id: string) => id === 'lmcs' || id === 'ops'),
  sanitizeForLog: vi.fn((v: string) => v),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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

  it('exports force-dynamic config', async () => {
    const routeModule = await import('../route');
    expect(routeModule.dynamic).toBe('force-dynamic');
  });

  it('returns 400 for an invalid journal ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest('invalid_journal!', '42'), makeContext('invalid_journal!', '42'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-numeric article ID', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', 'abc'), makeContext('lmcs', 'abc'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when article is not found', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockResolvedValueOnce(null);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '999'), makeContext('lmcs', '999'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when article has no pdfLink', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockResolvedValueOnce({
      id: 42,
      title: 'Test',
      pdfLink: '',
    } as any);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42'), makeContext('lmcs', '42'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when PDF domain is not allowed', async () => {
    const { fetchArticle } = await import('@/services/article');
    const { isAllowedPdfDomain } = await import('@/utils/pdf');

    vi.mocked(fetchArticle).mockResolvedValueOnce({
      id: 42,
      title: 'Test',
      pdfLink: 'https://malicious.domain/paper.pdf',
    } as any);
    vi.mocked(isAllowedPdfDomain).mockReturnValueOnce(false);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42'), makeContext('lmcs', '42'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with streamed PDF and encoded Content-Disposition header', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockResolvedValueOnce({
      id: 16405,
      title: 'Modeling of evaporation of macroparticles',
      pdfLink: 'https://hal.science/hal-012345/document',
    } as any);

    const pdfStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('%PDF-1.4 mock content'));
        controller.close();
      },
    });

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(pdfStream, {
        status: 200,
        headers: { 'Content-Length': '12345678' },
      })
    );

    const { GET } = await import('../route');
    const res = await GET(makeRequest('ops', '16405'), makeContext('ops', '16405'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Length')).toBe('12345678');
    expect(res.headers.get('Content-Disposition')).toContain('filename=');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=604800, immutable');
  });

  it('handles titles with special characters and quotes gracefully without breaking headers', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockResolvedValueOnce({
      id: 16405,
      title: 'Modeling of "evaporation" & macroparticles / électricité',
      pdfLink: 'https://hal.science/hal-012345/document',
    } as any);

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('pdf-data', { status: 200 })
    );

    const { GET } = await import('../route');
    const res = await GET(makeRequest('ops', '16405'), makeContext('ops', '16405'));

    expect(res.status).toBe(200);
    const contentDisp = res.headers.get('Content-Disposition');
    expect(contentDisp).toBeDefined();
    expect(contentDisp).not.toContain('"evaporation"');
  });

  it('returns 504 on request timeout', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockResolvedValueOnce({
      id: 42,
      title: 'Timeout Test',
      pdfLink: 'https://hal.science/hal-012345/document',
    } as any);

    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    vi.mocked(global.fetch).mockRejectedValueOnce(abortError);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42'), makeContext('lmcs', '42'));

    expect(res.status).toBe(504);
  });

  it('returns 500 and logs error on unexpected internal exception', async () => {
    const { fetchArticle } = await import('@/services/article');
    vi.mocked(fetchArticle).mockRejectedValueOnce(new Error('Database connection failed'));

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42'), makeContext('lmcs', '42'));

    expect(res.status).toBe(500);
  });
});
