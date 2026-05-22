import { describe, it, expect, vi, afterEach } from 'vitest';
import robots from '../robots';
import { ROBOTS_DISALLOW } from '@/config/robots';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === 'host' ? 'epijinfo.episciences.org' : null),
  }),
}));

describe('Robots.txt Generator', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should disallow /search and /api/', async () => {
    const result = await robots();

    expect((result.rules as any).disallow).toEqual(ROBOTS_DISALLOW);
    expect((result.rules as any).disallow).toContain('/search');
    expect((result.rules as any).disallow).toContain('/api/');
    expect((result.rules as any).disallow).toHaveLength(2);
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
});
