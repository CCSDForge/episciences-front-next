import { describe, it, expect, vi, afterEach } from 'vitest';
import robots from '../robots';
import { ROBOTS_DISALLOW } from '@/config/robots';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === 'host' ? 'epijinfo.episciences.org' : null),
  }),
}));

vi.mock('@/utils/env-loader', () => ({
  loadJournalConfig: vi.fn().mockReturnValue({ code: 'epijinfo', env: {} }),
}));

vi.mock('@/utils/validation', () => ({
  isValidJournalId: vi.fn().mockReturnValue(true),
}));

import { loadJournalConfig } from '@/utils/env-loader';

describe('Robots.txt Generator', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(loadJournalConfig).mockReturnValue({ code: 'epijinfo', env: {} });
  });

  it('should disallow search, feed paths and /api/', async () => {
    const result = await robots();

    expect((result.rules as any).disallow).toEqual(ROBOTS_DISALLOW);
    expect((result.rules as any).disallow).toContain('/search');
    expect((result.rules as any).disallow).toContain('/fr/search');
    expect((result.rules as any).disallow).toContain('/en/search');
    expect((result.rules as any).disallow).toContain('/es/search');
    expect((result.rules as any).disallow).toContain('/feed');
    expect((result.rules as any).disallow).toContain('/fr/feed');
    expect((result.rules as any).disallow).toContain('/en/feed');
    expect((result.rules as any).disallow).toContain('/es/feed');
    expect((result.rules as any).disallow).toContain('/api/');
    expect((result.rules as any).disallow).toHaveLength(9);
  });

  it('should advertise the sitemap served by Nginx', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const result = await robots();

    expect(result.sitemap).toBe('https://epijinfo.episciences.org/sitemap.xml');
  });

  it('should use http protocol in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const result = await robots();

    expect(result.sitemap).toBe('http://epijinfo.episciences.org/sitemap.xml');
  });

  describe('when NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING=false in journal config', () => {
    it('should disallow all robots with disallow /', async () => {
      vi.mocked(loadJournalConfig).mockReturnValue({
        code: 'epijinfo',
        env: { NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING: 'false' },
      });

      const result = await robots();

      expect((result.rules as any).disallow).toBe('/');
    });

    it('should still advertise the sitemap', async () => {
      vi.mocked(loadJournalConfig).mockReturnValue({
        code: 'epijinfo',
        env: { NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING: 'false' },
      });
      vi.stubEnv('NODE_ENV', 'production');

      const result = await robots();

      expect(result.sitemap).toBe('https://epijinfo.episciences.org/sitemap.xml');
    });
  });

  describe('when NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING=true in journal config', () => {
    it('should use the standard disallow list', async () => {
      vi.mocked(loadJournalConfig).mockReturnValue({
        code: 'epijinfo',
        env: { NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING: 'true' },
      });

      const result = await robots();

      expect((result.rules as any).disallow).toEqual(ROBOTS_DISALLOW);
    });
  });
});
