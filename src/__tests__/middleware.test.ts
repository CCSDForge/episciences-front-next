import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/config/journals-generated', () => ({
  journals: ['epijinfo', 'jtam', 'test-journal'],
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({ headers: { set: vi.fn() } })),
      rewrite: vi.fn(() => ({ headers: { set: vi.fn() } })),
      redirect: vi.fn(() => ({ headers: { set: vi.fn() } })),
    },
  };
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(host: string, pathname = '/en') {
  return {
    headers: { get: (key: string) => (key === 'host' ? host : null) },
    nextUrl: { pathname, search: '', searchParams: new URLSearchParams() },
    url: `https://${host}${pathname}`,
  } as any;
}

/** Returns the rewrite target URL string from the last NextResponse.rewrite call */
function lastRewritePath(): string {
  const calls = vi.mocked(NextResponse.rewrite).mock.calls;
  const arg = calls[calls.length - 1]?.[0];
  return typeof arg === 'string' ? arg : (arg as URL).pathname ?? String(arg);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('middleware — hostname detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;
    delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;
  });

  // -------------------------------------------------------------------------
  // Production domain — valid journals
  // -------------------------------------------------------------------------

  it('extracts journalId from exact production subdomain (epijinfo.episciences.org)', async () => {
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('epijinfo.episciences.org'));
    expect(lastRewritePath()).toContain('/sites/epijinfo/');
  });

  it('extracts journalId from nested subdomain (epijinfo.preprod.episciences.org)', async () => {
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('epijinfo.preprod.episciences.org'));
    expect(lastRewritePath()).toContain('/sites/epijinfo/');
  });

  // -------------------------------------------------------------------------
  // Security: bypass attempts must NOT be treated as production hosts
  // -------------------------------------------------------------------------

  it('does not treat "evilepisciences.org" as production host (substring bypass)', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('evilepisciences.org'));
    // Must NOT route as if "evilepisciences" were a valid journal from the hostname
    expect(lastRewritePath()).not.toContain('/sites/evilepisciences/');
  });

  it('does not treat "episciences.org.attacker.com" as production host (append bypass)', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('episciences.org.attacker.com'));
    // First segment would be "episciences" — must NOT be used as journalId
    expect(lastRewritePath()).not.toContain('/sites/episciences/');
  });

  // -------------------------------------------------------------------------
  // Custom domain via env var
  // -------------------------------------------------------------------------

  it('respects NEXT_PUBLIC_EPISCIENCES_DOMAIN env var', async () => {
    process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN = 'custom-domain.fr';
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('jtam.custom-domain.fr'));
    expect(lastRewritePath()).toContain('/sites/jtam/');
  });
});
