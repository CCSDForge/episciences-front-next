import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock validation (sanitizeIp)
vi.mock('@/utils/validation', () => ({
  sanitizeIp: vi.fn((raw: string | null) => {
    const first = raw?.split(',')[0]?.trim() ?? '';
    return /^[\d.:a-fA-F]+$/.test(first) ? first : 'unknown';
  }),
  sanitizeForLog: vi.fn((value: string | null | undefined) => String(value ?? '').slice(0, 200)),
}));

// Helper to create a NextRequest for the revalidate endpoint
function makeRequest(body: object, token: string | null, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token !== null ? { 'x-episciences-token': token } : {}),
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate', () => {
  const SECRET = 'super-secret-token';

  beforeEach(() => {
    vi.resetModules();
    process.env.REVALIDATION_SECRET = SECRET;
    delete process.env.ALLOWED_IPS;
  });

  afterEach(() => {
    delete process.env.REVALIDATION_SECRET;
    delete process.env.ALLOWED_IPS;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication — token matching
  // ─────────────────────────────────────────────────────────────────────────
  describe('authentication', () => {
    it('returns 401 when no token header is provided', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, null));
      expect(res.status).toBe(401);
    });

    it('returns 401 when token does not match the global secret', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, 'wrong-token'));
      expect(res.status).toBe(401);
    });

    it('returns 200 when token matches the global secret', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, SECRET));
      expect(res.status).toBe(200);
    });

    it('rejects a token with the same length but different content (timing-safe)', async () => {
      // Build a token that differs only in one character but has same length
      const wrongToken = SECRET.slice(0, -1) + 'X';
      expect(wrongToken.length).toBe(SECRET.length);
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, wrongToken));
      expect(res.status).toBe(401);
    });

    it('returns 200 with a journal-specific token', async () => {
      process.env['REVALIDATION_TOKEN_MYJRNL'] = 'journal-token-abc';
      const { POST } = await import('../route');
      const res = await POST(
        makeRequest({ tag: 'pages', journalId: 'myjrnl' }, 'journal-token-abc')
      );
      expect(res.status).toBe(200);
      delete process.env['REVALIDATION_TOKEN_MYJRNL'];
    });

    it('falls back to global secret when journal-specific token exists but does not match', async () => {
      process.env['REVALIDATION_TOKEN_MYJRNL'] = 'journal-specific-secret';
      const { POST } = await import('../route');
      // Using global secret, not the journal-specific one — should still be authorized
      const res = await POST(makeRequest({ tag: 'pages', journalId: 'myjrnl' }, SECRET));
      expect(res.status).toBe(200);
      delete process.env['REVALIDATION_TOKEN_MYJRNL'];
    });

    it('converts hyphenated journalId to underscore env var key', async () => {
      process.env['REVALIDATION_TOKEN_MY_JOURNAL'] = 'hyphen-token';
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages', journalId: 'my-journal' }, 'hyphen-token'));
      expect(res.status).toBe(200);
      delete process.env['REVALIDATION_TOKEN_MY_JOURNAL'];
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Request validation
  // ─────────────────────────────────────────────────────────────────────────
  describe('request validation', () => {
    it('returns 400 when neither tag nor path is provided', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({}, SECRET));
      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid path format', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ path: '../../etc/passwd' }, SECRET));
      expect(res.status).toBe(400);
    });

    it('returns 200 for a valid path', async () => {
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ path: '/sites/epijinfo/en/home' }, SECRET));
      expect(res.status).toBe(200);
    });

    it('returns 400 when path journalId does not match body journalId', async () => {
      const { POST } = await import('../route');
      const res = await POST(
        makeRequest({ path: '/sites/epijinfo/en/home', journalId: 'other-journal' }, SECRET)
      );
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // IP whitelisting
  // ─────────────────────────────────────────────────────────────────────────
  describe('IP whitelisting', () => {
    it('returns 403 when client IP is not in the whitelist', async () => {
      process.env.ALLOWED_IPS = '10.0.0.1';
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, SECRET, '192.168.1.99'));
      expect(res.status).toBe(403);
    });

    it('returns 200 when client IP is in the whitelist', async () => {
      process.env.ALLOWED_IPS = '127.0.0.1';
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ tag: 'pages' }, SECRET, '127.0.0.1'));
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rate limiting
  // ─────────────────────────────────────────────────────────────────────────
  describe('rate limiting', () => {
    it('returns 429 when the same IP exceeds the rate limit', async () => {
      process.env.REVALIDATE_RATE_LIMIT = '2';
      const { POST } = await import('../route');
      const ip = '10.0.0.99';

      await POST(makeRequest({ tag: 'pages' }, SECRET, ip));
      await POST(makeRequest({ tag: 'pages' }, SECRET, ip));
      const res = await POST(makeRequest({ tag: 'pages' }, SECRET, ip));

      expect(res.status).toBe(429);
      delete process.env.REVALIDATE_RATE_LIMIT;
    });

    it('does not rate-limit requests from different IPs', async () => {
      process.env.REVALIDATE_RATE_LIMIT = '1';
      const { POST } = await import('../route');

      const res1 = await POST(makeRequest({ tag: 'pages' }, SECRET, '10.0.0.1'));
      const res2 = await POST(makeRequest({ tag: 'pages' }, SECRET, '10.0.0.2'));

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      delete process.env.REVALIDATE_RATE_LIMIT;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET endpoint
  // ─────────────────────────────────────────────────────────────────────────
  describe('GET /api/revalidate', () => {
    it('returns 200 with a usage message', async () => {
      const { GET } = await import('../route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('message');
    });
  });
});
