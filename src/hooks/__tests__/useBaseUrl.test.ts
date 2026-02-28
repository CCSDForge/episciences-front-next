import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBaseUrl } from '../useBaseUrl';

describe('useBaseUrl', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset env and window before each test
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('development mode', () => {
    it('returns localhost URL in development', () => {
      process.env.NODE_ENV = 'development';

      const result = useBaseUrl();

      expect(result).toBe('http://localhost:3000/');
    });

    it('returns localhost regardless of NEXT_PUBLIC_SITE_URL in dev', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://production.example.com';

      const result = useBaseUrl();

      expect(result).toBe('http://localhost:3000/');
    });
  });

  describe('production mode with NEXT_PUBLIC_SITE_URL', () => {
    it('returns NEXT_PUBLIC_SITE_URL when set in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://episciences.org/';

      const result = useBaseUrl();

      expect(result).toBe('https://episciences.org/');
    });

    it('returns NEXT_PUBLIC_SITE_URL with trailing slash', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://episciences.org/';

      const result = useBaseUrl();

      expect(result).toBe('https://episciences.org/');
    });
  });

  describe('production mode without NEXT_PUBLIC_SITE_URL', () => {
    it('returns window origin URL when window is available', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SITE_URL;

      vi.stubGlobal('window', {
        location: {
          href: 'https://myjournal.episciences.org/fr/home',
        },
      });

      // URL constructor uses the href from location
      const result = useBaseUrl();

      expect(result).toBe('https://myjournal.episciences.org/');
    });

    it('returns "/" fallback during SSR (no window)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SITE_URL;

      // Simulate SSR: window is undefined
      vi.stubGlobal('window', undefined);

      const result = useBaseUrl();

      expect(result).toBe('/');
    });
  });

  describe('test mode (vitest environment)', () => {
    it('does not throw when called', () => {
      expect(() => useBaseUrl()).not.toThrow();
    });

    it('returns a string', () => {
      const result = useBaseUrl();
      expect(typeof result).toBe('string');
    });
  });
});
