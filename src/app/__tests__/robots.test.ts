import { describe, it, expect, vi } from 'vitest';
import robots from '../robots';
import { ROBOTS_COMMON_DISALLOW } from '@/config/robots';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => {
      if (key === 'host') return 'epijinfo.episciences.org';
      return null;
    },
  }),
}));

describe('Robots.txt Generator', () => {
  it('should generate correct sitemap URL based on host', async () => {
    // Force NODE_ENV to production for this test to check https
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const result = await robots();

    expect(result.sitemap).toBe('https://epijinfo.episciences.org/sitemap.xml');

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });

  it('should include common disallow rules', async () => {
    const result = await robots();

    expect(result.rules).toEqual({
      userAgent: '*',
      disallow: ROBOTS_COMMON_DISALLOW,
    });

    // Check for critical security rule
    expect(result.rules.disallow).toContain('/login');
    expect(result.rules.disallow).toContain('*/json');
  });
});
