import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn(() => 'https://api.example.org'),
}));

vi.mock('@/utils/validation', () => ({
  isValidJournalId: vi.fn(() => true),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { isValidJournalId } from '@/utils/validation';
import { getJournalApiUrl } from '@/utils/env-loader';

function makeContext(journalId: string, lang = 'fr') {
  return { params: Promise.resolve({ journalId, lang: lang as never }) };
}

describe('GET /feed/atom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isValidJournalId).mockReturnValue(true);
    vi.mocked(getJournalApiUrl).mockReturnValue('https://api.example.org');
    global.fetch = vi.fn();
  });

  it('returns 400 for an invalid journal id', async () => {
    vi.mocked(isValidJournalId).mockReturnValue(false);

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/feed/atom'), makeContext('../evil'));

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid journal code');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('passes through the upstream status when the response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('nope', { status: 503 }));

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/feed/atom'), makeContext('epijinfo'));

    expect(res.status).toBe(503);
    expect(await res.text()).toBe('Feed unavailable');
  });

  it('returns 502 when the upstream fetch throws', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'));

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/feed/atom'), makeContext('epijinfo'));

    expect(res.status).toBe(502);
    expect(await res.text()).toBe('Feed unavailable');
  });

  it('returns 200 with the upstream content type and body on success', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('<feed>content</feed>', {
        status: 200,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      })
    );

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/feed/atom'), makeContext('epijinfo'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/atom+xml; charset=utf-8');
    expect(await res.text()).toBe('<feed>content</feed>');
  });

  it('falls back to a default content type when upstream does not provide one', async () => {
    // A real Response always defaults Content-Type for a string body, so simulate an
    // upstream response with no Content-Type header via a minimal fake response object.
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '<feed></feed>',
    } as unknown as Response);

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/feed/atom'), makeContext('epijinfo'));

    expect(res.headers.get('Content-Type')).toBe('application/atom+xml; charset=utf-8');
  });
});
