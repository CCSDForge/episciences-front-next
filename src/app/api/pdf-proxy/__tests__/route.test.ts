import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { PdfCacheEntry } from '@/lib/pdf-cache';

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

// Cache disabled by default in every test unless a test overrides these
// mocks — this is what lets the whole pre-existing suite above prove the
// PDF_CACHE_ENABLED=false path is byte-for-byte the original behavior.
vi.mock('@/lib/pdf-cache', () => ({
  isCacheEnabled: vi.fn(() => false),
  getCacheMode: vi.fn(() => 'fallback'),
  getCacheKey: vi.fn((url: string) => `key-for-${url}`),
  getCacheMaxAgeSeconds: vi.fn(() => 15552000),
  readCacheEntry: vi.fn(async () => null),
  isEntryStale: vi.fn(() => false),
  enqueuePopulateJob: vi.fn(async () => {}),
}));

import {
  isCacheEnabled,
  getCacheMode,
  readCacheEntry,
  isEntryStale,
  enqueuePopulateJob,
} from '@/lib/pdf-cache';

// Helper to build a pdf-proxy GET request
function makeRequest(url: string | null, ip = '1.2.3.4'): NextRequest {
  const searchParams = url ? `?url=${encodeURIComponent(url)}` : '';
  return new NextRequest(`http://localhost/api/pdf-proxy${searchParams}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': ip },
  });
}

function fakeCacheEntry(content: string, ageSeconds = 0): PdfCacheEntry {
  const bytes = new TextEncoder().encode(content);
  return {
    sidecar: {
      schemaVersion: 1,
      sourceUrl: 'https://zenodo.org/file.pdf',
      key: 'key-for-https://zenodo.org/file.pdf',
      fetchedAt: new Date(Date.now() - ageSeconds * 1000).toISOString(),
      byteLength: bytes.length,
      upstreamContentType: 'application/pdf',
      httpStatus: 200,
      host: 'zenodo.org',
    },
    byteLength: bytes.length,
    ageSeconds,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
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
    // Cache disabled by default; individual tests below opt back in.
    // mockReset (not just mockReturnValue) so each test starts from a clean
    // call history too — vi.restoreAllMocks() in afterEach does not clear
    // call counts for plain vi.fn() mocks the way it does for vi.spyOn spies.
    vi.mocked(isCacheEnabled).mockReset().mockReturnValue(false);
    vi.mocked(getCacheMode).mockReset().mockReturnValue('fallback');
    vi.mocked(readCacheEntry).mockReset().mockResolvedValue(null);
    vi.mocked(isEntryStale).mockReset().mockReturnValue(false);
    vi.mocked(enqueuePopulateJob).mockReset().mockResolvedValue(undefined);
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

    it('blocks a response whose final URL (after redirects) is not whitelisted', async () => {
      const response = new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
      Object.defineProperty(response, 'url', { value: 'https://evil.com/file.pdf' });
      global.fetch = vi.fn().mockResolvedValue(response);
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(502);
    });

    it('allows a response whose final URL redirected to another whitelisted host', async () => {
      const response = new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
      Object.defineProperty(response, 'url', { value: 'https://data.zenodo.org/file.pdf' });
      global.fetch = vi.fn().mockResolvedValue(response);
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

  // ─────────────────────────────────────────────────────────────────────────
  // Disk cache (PDF_CACHE_ENABLED) — src/lib/pdf-cache is mocked above, so
  // these only test the route's wiring: which cache calls happen in which
  // mode, and that they never change the response when disabled (already
  // covered, implicitly, by every test above this block).
  // ─────────────────────────────────────────────────────────────────────────
  describe('disk cache', () => {
    it('marks the response X-Pdf-Cache: OFF when the cache is disabled', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.0.1'));
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Pdf-Cache')).toBe('OFF');
      expect(readCacheEntry).not.toHaveBeenCalled();
    });

    describe('mode=systematic', () => {
      beforeEach(() => {
        vi.mocked(isCacheEnabled).mockReturnValue(true);
        vi.mocked(getCacheMode).mockReturnValue('systematic');
      });

      it('serves a fresh hit straight from the cache, without ever calling fetch()', async () => {
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-fresh'));
        vi.mocked(isEntryStale).mockReturnValue(false);

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.0.2'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('HIT');
        expect(await res.text()).toBe('%PDF-fresh');
        expect(global.fetch).not.toHaveBeenCalled();
        expect(enqueuePopulateJob).not.toHaveBeenCalled();
      });

      it('serves a stale hit and enqueues a refresh', async () => {
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-stale', 999_999));
        vi.mocked(isEntryStale).mockReturnValue(true);

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.0.3'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('STALE');
        expect(global.fetch).not.toHaveBeenCalled();
        expect(enqueuePopulateJob).toHaveBeenCalledWith(
          'https://zenodo.org/file.pdf',
          expect.any(String),
          'refresh'
        );
      });

      it('falls through to upstream on a cold miss and enqueues a populate job', async () => {
        vi.mocked(readCacheEntry).mockResolvedValue(null);

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.0.4'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('MISS');
        expect(global.fetch).toHaveBeenCalled();
        expect(enqueuePopulateJob).toHaveBeenCalledWith(
          'https://zenodo.org/file.pdf',
          expect.any(String),
          'populate'
        );
      });
    });

    describe('mode=fallback', () => {
      beforeEach(() => {
        vi.mocked(isCacheEnabled).mockReturnValue(true);
        vi.mocked(getCacheMode).mockReturnValue('fallback');
      });

      it('serves upstream directly on success, without consulting the cache first', async () => {
        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.1'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('MISS');
        expect(readCacheEntry).not.toHaveBeenCalled();
        expect(enqueuePopulateJob).toHaveBeenCalledWith(
          'https://zenodo.org/file.pdf',
          expect.any(String),
          'populate'
        );
      });

      it('serves the cached copy when upstream returns a non-ok status', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response('Service Unavailable', { status: 503 }));
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-cached-copy'));

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.2'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('FALLBACK');
        expect(await res.text()).toBe('%PDF-cached-copy');
      });

      it('serves the cached copy when upstream throws (network error)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Connection reset by peer'));
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-cached-copy'));

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.3'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('FALLBACK');
      });

      it('serves the cached copy on an upstream timeout (AbortError)', async () => {
        const abortError = new Error('The user aborted a request.');
        abortError.name = 'AbortError';
        global.fetch = vi.fn().mockRejectedValue(abortError);
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-cached-copy'));

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.4'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('FALLBACK');
      });

      it('falls back to the original error when upstream fails and the cache also misses', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response('Service Unavailable', { status: 503 }));
        vi.mocked(readCacheEntry).mockResolvedValue(null);

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.5'));

        expect(res.status).toBe(503);
        expect(res.headers.get('X-Pdf-Cache')).toBeNull();
      });

      it('serves the cached copy when the upstream content-type is wrong', async () => {
        global.fetch = vi.fn().mockResolvedValue(
          new Response('<html>captcha</html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
        );
        vi.mocked(readCacheEntry).mockResolvedValue(fakeCacheEntry('%PDF-cached-copy'));

        const { GET } = await import('../route');
        const res = await GET(makeRequest('https://zenodo.org/file.pdf', '10.0.1.6'));

        expect(res.status).toBe(200);
        expect(res.headers.get('X-Pdf-Cache')).toBe('FALLBACK');
      });
    });
  });
});
