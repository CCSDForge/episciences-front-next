import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((code: string) => `https://api.${code}.test`),
}));

vi.mock('@/utils/validation', () => ({
  sanitizeForLog: vi.fn((v: string) => v),
}));

function makeRequest(journalId: string, id: string, format: string): NextRequest {
  return new NextRequest(
    `http://localhost/sites/${journalId}/fr/articles/${id}/${format}`
  );
}

function makeContext(journalId: string, id: string, format: string) {
  return { params: Promise.resolve({ journalId, lang: 'fr', id, format }) };
}

describe('GET /articles/[id]/[format]', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns 400 for a non-numeric id', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', 'abc', 'bibtex'), makeContext('lmcs', 'abc', 'bibtex'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an unknown format', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'unknown'), makeContext('lmcs', '42', 'unknown'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when backend responds 404', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'openaire'), makeContext('lmcs', '42', 'openaire'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with correct Content-Type for openaire (xml)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('<openaire/>', { status: 200 })
    );
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'openaire'), makeContext('lmcs', '42', 'openaire'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="article_42.xml"');
  });

  it('returns 200 with correct Content-Type for bibtex', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('@article{...}', { status: 200 })
    );
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'bibtex'), makeContext('lmcs', '42', 'bibtex'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/x-bibtex');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="article_42.bib"');
  });

  it('returns 200 with correct Content-Type for json', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('{}', { status: 200 })
    );
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'json'), makeContext('lmcs', '42', 'json'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="article_42.json"');
  });

  it('returns 200 with correct Content-Type for ris', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('TY  - JOUR', { status: 200 })
    );
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'ris'), makeContext('lmcs', '42', 'ris'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/x-research-info-systems');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="article_42.ris"');
  });

  it('includes Cache-Control header', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('<dc/>', { status: 200 })
    );
    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '1', 'dc'), makeContext('lmcs', '1', 'dc'));
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('returns 504 on timeout', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    vi.mocked(global.fetch).mockRejectedValueOnce(abortError);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('lmcs', '42', 'tei'), makeContext('lmcs', '42', 'tei'));
    expect(res.status).toBe(504);
  });
});
