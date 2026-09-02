import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/validation', () => ({
  sanitizeIp: vi.fn((raw: string | null) => {
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
  getClientIp: vi.fn((headers: Headers) => {
    const raw = headers.get('x-real-ip') ?? headers.get('x-forwarded-for');
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
  sanitizeForLog: vi.fn((value: string | null | undefined) => String(value ?? '').slice(0, 200)),
}));

// Helper to build a pdf-proxy GET request
function makeRequest(url: string | null, ip = '1.2.3.4'): NextRequest {
  const searchParams = url ? `?url=${encodeURIComponent(url)}` : '';
  return new NextRequest(`http://localhost/api/pdf-proxy${searchParams}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': ip },
  });
}

describe('GET /api/pdf-proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN;
    // Stub global fetch so the route can proxy a "PDF"
    global.fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN;
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Parameter validation
  // ─────────────────────────────────────────────────────────────────────────
  describe('parameter validation', () => {
    it('returns 400 when url parameter is missing', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest(null));
      expect(res.status).toBe(400);
    });

    it.each([
      { description: 'domain is not whitelisted', url: 'https://evil.com/file.pdf', status: 403 },
      // "evilzenodo.org" contains "zenodo.org" — must be rejected
      {
        description: 'domain that contains whitelisted name as substring (bypass attempt)',
        url: 'https://evilzenodo.org/file.pdf',
        status: 403,
      },
      // "zenodo.org.evil.com" contains "zenodo.org" — must be rejected
      {
        description: 'domain that appends whitelisted name (bypass attempt)',
        url: 'https://zenodo.org.evil.com/file.pdf',
        status: 403,
      },
      {
        description: 'HTTP (non-HTTPS) URL',
        url: 'http://zenodo.org/record/123/files/paper.pdf',
        status: 403,
      },
      {
        description: 'a whitelisted domain (zenodo.org)',
        url: 'https://zenodo.org/record/123/files/paper.pdf',
        status: 200,
      },
      {
        description: 'a subdomain of a whitelisted domain',
        url: 'https://data.zenodo.org/record/123/files/paper.pdf',
        status: 200,
      },
      {
        description: 'a whitelisted domain (arxiv.org)',
        url: 'https://arxiv.org/pdf/2301.00001.pdf',
        status: 200,
      },
    ])('returns $status for $description', async ({ url, status }) => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest(url));
      expect(res.status).toBe(status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Upstream Content-Type validation (arxiv rate-limit page scenario)
  // ─────────────────────────────────────────────────────────────────────────
  describe('upstream content-type validation', () => {
    it('returns 502 when upstream returns text/html (rate-limit or captcha page)', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('<html>Too Many Requests</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      );
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://arxiv.org/pdf/2301.00001.pdf'));
      expect(res.status).toBe(502);
    });

    it('returns 200 when upstream returns application/octet-stream', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(200);
    });

    it('returns 200 when upstream returns application/pdf', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(200);
    });

    it('forces Content-Type: application/pdf in the response regardless of upstream value', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CORS headers
  // ─────────────────────────────────────────────────────────────────────────
  describe('CORS headers', () => {
    it('does not include Access-Control-Allow-Origin when env var is not set', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('includes Access-Control-Allow-Origin when NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN is set', async () => {
      process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN = 'https://episciences.org';
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://episciences.org');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONS (preflight)
  // ─────────────────────────────────────────────────────────────────────────
  describe('OPTIONS /api/pdf-proxy', () => {
    it('returns 200 for preflight', async () => {
      const { OPTIONS } = await import('../route');
      const res = await OPTIONS();
      expect(res.status).toBe(200);
    });

    it('does not include Access-Control-Allow-Origin in preflight when env var is absent', async () => {
      const { OPTIONS } = await import('../route');
      const res = await OPTIONS();
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('includes Access-Control-Allow-Origin in preflight when env var is set', async () => {
      process.env.NEXT_PUBLIC_EPISCIENCES_ALLOWED_ORIGIN = 'https://episciences.org';
      const { OPTIONS } = await import('../route');
      const res = await OPTIONS();
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://episciences.org');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Disposition & Filename
  // ─────────────────────────────────────────────────────────────────────────
  describe('disposition and filename', () => {
    it('returns 400 when disposition is invalid', async () => {
      const { GET } = await import('../route');
      const req = new NextRequest(
        'http://localhost/api/pdf-proxy?url=https://zenodo.org/file.pdf&disposition=invalid',
        { method: 'GET', headers: { 'x-forwarded-for': '1.2.3.4' } }
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain('Invalid disposition parameter');
    });

    it('sets attachment with sanitized filename when disposition is attachment', async () => {
      const { GET } = await import('../route');
      const req = new NextRequest(
        'http://localhost/api/pdf-proxy?url=https://zenodo.org/file.pdf&disposition=attachment&filename=my/unsafe;file.pdf',
        { method: 'GET', headers: { 'x-forwarded-for': '1.2.3.4' } }
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="my_unsafe_file.pdf"');
    });

    it('sets Content-Length when provided by upstream', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '1048576',
          },
        })
      );
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/file.pdf'));
      expect(res.headers.get('Content-Length')).toBe('1048576');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Upstream errors and timeouts
  // ─────────────────────────────────────────────────────────────────────────
  describe('error handling and timeouts', () => {
    it('returns upstream status code when upstream returns non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        })
      );
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/file.pdf'));
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain('Failed to fetch PDF: Not Found');
    });

    it('returns 504 on request timeout (AbortError)', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/file.pdf'));
      expect(res.status).toBe(504);
      const text = await res.text();
      expect(text).toBe('Request timeout');
    });

    it('returns 500 on unexpected network or parsing error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection reset by peer'));

      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/file.pdf'));
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toBe('Internal server error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rate limiting
  // ─────────────────────────────────────────────────────────────────────────
  describe('rate limiting', () => {
    it('returns 429 when client exceeds rate limit', async () => {
      const { GET } = await import('../route');
      const targetIp = '99.88.77.66';

      // Exhaust 30 allowed requests
      for (let i = 0; i < 30; i++) {
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', targetIp));
        expect(res.status).toBe(200);
      }

      // 31st request should be blocked
      const blockedRes = await GET(makeRequest('https://zenodo.org/file.pdf', targetIp));
      expect(blockedRes.status).toBe(429);
      const text = await blockedRes.text();
      expect(text).toBe('Too many requests');
    });
  });
});
