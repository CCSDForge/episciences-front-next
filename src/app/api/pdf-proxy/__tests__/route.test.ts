import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/validation', () => ({
  sanitizeIp: vi.fn((raw: string | null) => {
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
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

    it('returns 403 when domain is not whitelisted', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://evil.com/file.pdf'));
      expect(res.status).toBe(403);
    });

    it('returns 403 for domain that contains whitelisted name as substring (bypass attempt)', async () => {
      const { GET } = await import('../route');
      // "evilzenodo.org" contains "zenodo.org" — must be rejected
      const res = await GET(makeRequest('https://evilzenodo.org/file.pdf'));
      expect(res.status).toBe(403);
    });

    it('returns 403 for domain that appends whitelisted name (bypass attempt)', async () => {
      const { GET } = await import('../route');
      // "zenodo.org.evil.com" contains "zenodo.org" — must be rejected
      const res = await GET(makeRequest('https://zenodo.org.evil.com/file.pdf'));
      expect(res.status).toBe(403);
    });

    it('returns 403 for HTTP (non-HTTPS) URL', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('http://zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(403);
    });

    it('returns 200 for a whitelisted domain (zenodo.org)', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(200);
    });

    it('returns 200 for a subdomain of a whitelisted domain', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://data.zenodo.org/record/123/files/paper.pdf'));
      expect(res.status).toBe(200);
    });

    it('returns 200 for a whitelisted domain (arxiv.org)', async () => {
      const { GET } = await import('../route');
      const res = await GET(makeRequest('https://arxiv.org/pdf/2301.00001.pdf'));
      expect(res.status).toBe(200);
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
});
