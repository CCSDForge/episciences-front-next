import { describe, it, expect, afterEach } from 'vitest';
import { getFormattedSiteTitle } from '../metadata';

describe('getFormattedSiteTitle', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_NAME;
  });

  it('should format title with NEXT_PUBLIC_SITE_NAME when set', () => {
    process.env.NEXT_PUBLIC_SITE_NAME = 'My Journal';

    const result = getFormattedSiteTitle('About');

    expect(result).toBe('About | My Journal');
  });

  it('should use Episciences as fallback when NEXT_PUBLIC_SITE_NAME is not set', () => {
    delete process.env.NEXT_PUBLIC_SITE_NAME;

    const result = getFormattedSiteTitle('Home');

    expect(result).toBe('Home | Episciences');
  });

  it('should work with empty page title', () => {
    process.env.NEXT_PUBLIC_SITE_NAME = 'Test Journal';

    const result = getFormattedSiteTitle('');

    expect(result).toBe(' | Test Journal');
  });

  it('should preserve special characters in title', () => {
    process.env.NEXT_PUBLIC_SITE_NAME = 'Science & Society';

    const result = getFormattedSiteTitle('Numéro spécial');

    expect(result).toBe('Numéro spécial | Science & Society');
  });
});
