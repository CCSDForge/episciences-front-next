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
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
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
  });
});

describe('POST /api/proxy/[...path]', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ created: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
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

    it('returns proxied response when rvcode is valid in POST', async () => {
      const { POST } = await import('../route');
      const context = { params: Promise.resolve({ path: ['papers'] }) };
      const res = await POST(makePostRequest('papers', '?rvcode=epijinfo'), context);
      expect(res.status).toBe(201);
    });
  });
});
