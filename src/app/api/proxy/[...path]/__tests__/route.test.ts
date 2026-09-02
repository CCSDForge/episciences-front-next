import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((code: string) => `https://api.${code}.test`),
}));

vi.mock('@/utils/validation', () => ({
  isValidJournalId: vi.fn((id: string) => /^[a-z0-9-]{2,50}$/.test(id)),
  sanitizeIp: vi.fn((raw: string | null) => {
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
  getClientIp: vi.fn((headers: Headers) => {
    const raw = headers.get('x-real-ip') ?? headers.get('x-forwarded-for');
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
}));

function makeGetRequest(path: string, searchParams = ''): NextRequest {
  return new NextRequest(`http://localhost/api/proxy/${path}${searchParams}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });
}

function makePostRequest(path: string, searchParams = '', body = '{}'): NextRequest {
  return new NextRequest(`http://localhost/api/proxy/${path}${searchParams}`, {
    method: 'POST',
    headers: {
      'x-forwarded-for': '1.2.3.4',
      'Content-Type': 'application/json',
    },
    body,
  });
}

describe('GET /api/proxy/[...path]', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Missing rvcode — must return 400 (no silent fallback to 'epijinfo')
  // ─────────────────────────────────────────────────────────────────────────
  describe('rvcode validation', () => {
    it('returns 400 when rvcode query param is missing', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '123'] }) };
      const res = await GET(makeGetRequest('papers/123'), context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/missing rvcode/i);
    });

    it('returns 400 when rvcode is an empty string', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await GET(makeGetRequest('papers', '?rvcode='), context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/missing rvcode/i);
    });

    it('returns 400 when rvcode contains invalid characters', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await GET(makeGetRequest('papers', '?rvcode=INVALID_CODE!'), context);
      expect(res.status).toBe(400);
    });

    it('returns 200 when rvcode is valid', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await GET(makeGetRequest('papers', '?rvcode=epijinfo'), context);
      expect(res.status).toBe(200);
    });

    it('accepts rvcode from x-journal-code header', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const req = new NextRequest('http://localhost/api/proxy/papers', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-journal-code': 'epijinfo',
        },
      });
      const res = await GET(req, context);
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Proxying
  // ─────────────────────────────────────────────────────────────────────────
  describe('proxying', () => {
    it('proxies to the correct journal API URL', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '42'] }) };
      await GET(makeGetRequest('papers/42', '?rvcode=transformations'), context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.transformations.test/papers/42'),
        expect.any(Object)
      );
    });

    it('percent-encodes spaces and commas instead of stripping them (author names)', async () => {
      const { GET } = await import('../route');
      const context = {
        params: Promise.resolve({ path: ['browse', 'authors-search', 'Morgan, Grant B.'] }),
      };
      await GET(makeGetRequest('placeholder', '?rvcode=transformations'), context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'api.transformations.test/browse/authors-search/Morgan%2C%20Grant%20B.'
        ),
        expect.any(Object)
      );
    });

    it('drops "." and ".." traversal segments', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '..', '42'] }) };
      await GET(makeGetRequest('placeholder', '?rvcode=transformations'), context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.transformations.test/papers/42'),
        expect.any(Object)
      );
    });

    it('passes an abort signal to the upstream fetch (timeout protection)', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '42'] }) };
      await GET(makeGetRequest('papers/42', '?rvcode=transformations'), context);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('returns 504 when the upstream request times out', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '42'] }) };
      const res = await GET(makeGetRequest('papers/42', '?rvcode=transformations'), context);
      expect(res.status).toBe(504);
    });

    it('accepts code query param when rvcode is absent', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await GET(makeGetRequest('papers', '?code=epijinfo'), context);
      expect(res.status).toBe(200);
    });

    it('returns 502 when upstream fetch throws unexpected network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers', '42'] }) };
      const res = await GET(makeGetRequest('papers/42', '?rvcode=transformations'), context);
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe('Failed to proxy request');
    });

    it('returns 429 when client IP exceeds rate limit in GET', async () => {
      const { GET } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const ip = '45.33.22.11';
      const req = (clientIp: string) =>
        new NextRequest('http://localhost/api/proxy/papers?rvcode=epijinfo', {
          method: 'GET',
          headers: { 'x-forwarded-for': clientIp },
        });

      for (let i = 0; i < 60; i++) {
        const res = await GET(req(ip), context);
        expect(res.status).toBe(200);
      }

      const blockedRes = await GET(req(ip), context);
      expect(blockedRes.status).toBe(429);
    });
  });
});

describe('POST /api/proxy/[...path]', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ created: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
  });

  describe('rvcode validation', () => {
    it('returns 400 when rvcode is missing from POST', async () => {
      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers'), context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/missing rvcode/i);
    });

    it('returns 400 when rvcode is invalid in POST', async () => {
      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers', '?rvcode=BAD_CODE!'), context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/invalid journal code/i);
    });

    it('returns proxied response when rvcode is valid in POST', async () => {
      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers', '?rvcode=epijinfo'), context);
      expect(res.status).toBe(201);
    });

    it('returns 504 on POST upstream timeout', async () => {
      const timeoutError = new Error('Upstream timeout');
      timeoutError.name = 'TimeoutError';
      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers', '?rvcode=epijinfo'), context);
      expect(res.status).toBe(504);
      const body = await res.json();
      expect(body.error).toBe('Upstream timeout');
    });

    it('returns 502 on POST network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network reset'));

      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers', '?rvcode=epijinfo'), context);
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe('Failed to proxy request');
    });

    it('returns 429 when client IP exceeds rate limit in POST', async () => {
      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const ip = '123.123.123.123';
      const req = () =>
        new NextRequest('http://localhost/api/proxy/papers?rvcode=epijinfo', {
          method: 'POST',
          headers: {
            'x-forwarded-for': ip,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

      for (let i = 0; i < 60; i++) {
        const res = await POST(req(), context);
        expect(res.status).toBe(201);
      }

      const blockedRes = await POST(req(), context);
      expect(blockedRes.status).toBe(429);
    });
  });
});
