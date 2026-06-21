import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/config/journals-generated', () => ({
  journals: ['epijinfo', 'jtam', 'test-journal', 'pspa'],
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => {
        const headers = new Map();
        return {
          headers: {
            set: vi.fn((k, v) => headers.set(k, v)),
            append: vi.fn((k, v) => headers.set(k, v)),
            get: (k: string) => headers.get(k),
          },
        };
      }),
      rewrite: vi.fn(() => {
        const headers = new Map();
        return {
          headers: {
            set: vi.fn((k, v) => headers.set(k, v)),
            append: vi.fn((k, v) => headers.set(k, v)),
            get: (k: string) => headers.get(k),
          },
        };
      }),
      redirect: vi.fn(() => {
        const headers = new Map();
        return {
          headers: {
            set: vi.fn((k, v) => headers.set(k, v)),
            append: vi.fn((k, v) => headers.set(k, v)),
            get: (k: string) => headers.get(k),
          },
        };
      }),
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
  return typeof arg === 'string' ? arg : ((arg as URL).pathname ?? String(arg));
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

  // -------------------------------------------------------------------------
  // robots.txt bypass
  // -------------------------------------------------------------------------

  it('bypasses rewrite for /robots.txt request', async () => {
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('epijinfo.episciences.org', '/robots.txt'));
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.rewrite).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // detectJournalId — fallback cases
  // -------------------------------------------------------------------------

  it('falls back to DEFAULT_JOURNAL for plain localhost hostname', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    const { middleware } = await import('../middleware');
    await middleware(makeRequest('localhost'));
    expect(lastRewritePath()).toContain('/sites/epijinfo/');
  });

  it('falls back to DEFAULT_JOURNAL when production hostname has invalid journalId format', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    const { middleware } = await import('../middleware');
    // underscore is not allowed in journalId pattern [a-z0-9-]
    await middleware(makeRequest('invalid_code.episciences.org'));
    expect(lastRewritePath()).toContain('/sites/epijinfo/');
  });

  it('falls back to DEFAULT_JOURNAL when dev subdomain has invalid journalId format', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    const { middleware } = await import('../middleware');
    // underscore is not allowed in journalId pattern [a-z0-9-]
    await middleware(makeRequest('bad_name.localhost'));
    expect(lastRewritePath()).toContain('/sites/epijinfo/');
  });

  // -------------------------------------------------------------------------
  // FAIRiCat & Signposting headers
  // -------------------------------------------------------------------------

  it('adds api-catalog discovery header on home page', async () => {
    const { middleware } = await import('../middleware');
    const response = await middleware(makeRequest('epijinfo.episciences.org', '/'));
    expect(response.headers.append).toHaveBeenCalledWith(
      'Link',
      expect.stringContaining('rel="api-catalog"')
    );
    expect(response.headers.append).toHaveBeenCalledWith(
      'Link',
      expect.stringContaining('profile="https://signposting.org/FAIRiCat/"')
    );
  });

  it('adds Signposting headers on article landing pages', async () => {
    const { middleware } = await import('../middleware');
    const response = await middleware(makeRequest('epijinfo.episciences.org', '/articles/1234'));
    expect(response.headers.set).toHaveBeenCalledWith(
      'Link',
      expect.stringContaining('rel="linkset"')
    );
    expect(response.headers.append).toHaveBeenCalledWith(
      'Link',
      expect.stringContaining('rel="http://www.w3.org/ns/ldp#inbox"')
    );
  });
});

// ---------------------------------------------------------------------------
// Language rejection — non-accepted language prefix
// ---------------------------------------------------------------------------

describe('middleware — non-accepted language prefix redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES;
    delete process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE;
    delete process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;
    delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES;
    delete process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE;
  });

  it('redirects /en/about to /fr/about when journal only accepts fr', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES = 'fr';
    process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE = 'fr';

    vi.doMock('@/utils/language-utils', () => ({
      acceptedLanguages: ['fr'],
      defaultLanguage: 'fr',
      allSupportedLanguages: ['en', 'fr', 'es'],
      getLanguageFromPathname: (p: string) =>
        p.startsWith('/en') ? 'en' : p.startsWith('/fr') ? 'fr' : 'fr',
      hasLanguagePrefix: (p: string) => /^\/(en|fr|es)(\/|$)/.test(p),
      removeLanguagePrefix: (p: string) => p.replace(/^\/(en|fr|es)/, '') || '/',
      isDefaultLanguage: (l: string) => l === 'fr',
      validateLanguage: (l: string) => (['en', 'fr', 'es'].includes(l) ? l : 'fr'),
      getLocalizedPath: (p: string, l: string) => `/${l}${p}`,
    }));

    const { middleware } = await import('../middleware');
    await middleware(makeRequest('pspa.episciences.org', '/en/about'));

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/fr/about' }),
      expect.objectContaining({ status: 302 })
    );
  });

  it('does not redirect /fr/about when journal accepts fr', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES = 'fr';
    process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE = 'fr';

    vi.doMock('@/utils/language-utils', () => ({
      acceptedLanguages: ['fr'],
      defaultLanguage: 'fr',
      allSupportedLanguages: ['en', 'fr', 'es'],
      getLanguageFromPathname: (p: string) =>
        p.startsWith('/fr') ? 'fr' : p.startsWith('/en') ? 'en' : 'fr',
      hasLanguagePrefix: (p: string) => /^\/(en|fr|es)(\/|$)/.test(p),
      removeLanguagePrefix: (p: string) => p.replace(/^\/(en|fr|es)/, '') || '/',
      isDefaultLanguage: (l: string) => l === 'fr',
      validateLanguage: (l: string) => (['en', 'fr', 'es'].includes(l) ? l : 'fr'),
      getLocalizedPath: (p: string, l: string) => `/${l}${p}`,
    }));

    const { middleware } = await import('../middleware');
    await middleware(makeRequest('pspa.episciences.org', '/fr/about'));

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.rewrite).toHaveBeenCalled();
  });
});
