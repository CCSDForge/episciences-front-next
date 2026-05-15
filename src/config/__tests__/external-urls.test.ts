import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadModule = async () => {
  const mod = await import('../external-urls');
  return mod;
};

describe('external-urls', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('fallback values (no env vars set)', () => {
    it('ORCID_URL falls back to https://orcid.org', async () => {
      vi.stubEnv('NEXT_PUBLIC_ORCID_HOMEPAGE', '');
      const { ORCID_URL } = await loadModule();
      expect(ORCID_URL).toBe('https://orcid.org');
    });

    it('DOI_URL falls back to https://doi.org', async () => {
      vi.stubEnv('NEXT_PUBLIC_DOI_HOMEPAGE', '');
      const { DOI_URL } = await loadModule();
      expect(DOI_URL).toBe('https://doi.org');
    });

    it('ARXIV_URL falls back to https://arxiv.org', async () => {
      vi.stubEnv('NEXT_PUBLIC_ARXIV_HOMEPAGE', '');
      const { ARXIV_URL } = await loadModule();
      expect(ARXIV_URL).toBe('https://arxiv.org');
    });

    it('HAL_URL falls back to https://hal.science', async () => {
      vi.stubEnv('NEXT_PUBLIC_HAL_HOMEPAGE', '');
      const { HAL_URL } = await loadModule();
      expect(HAL_URL).toBe('https://hal.science');
    });

    it('SOFTWARE_HERITAGE_URL falls back to https://archive.softwareheritage.org', async () => {
      vi.stubEnv('NEXT_PUBLIC_ARCHIVE_SOFTWARE_HERITAGE_HOMEPAGE', '');
      const { SOFTWARE_HERITAGE_URL } = await loadModule();
      expect(SOFTWARE_HERITAGE_URL).toBe('https://archive.softwareheritage.org');
    });

    it('TWITTER_URL falls back to https://x.com', async () => {
      vi.stubEnv('NEXT_PUBLIC_TWITTER_HOMEPAGE', '');
      const { TWITTER_URL } = await loadModule();
      expect(TWITTER_URL).toBe('https://x.com');
    });

    it('MATHJAX_URL falls back to cdnjs URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_MATHJAX_HOMEPAGE', '');
      const { MATHJAX_URL } = await loadModule();
      expect(MATHJAX_URL).toBe('https://cdnjs.cloudflare.com/ajax/libs/mathjax');
    });
  });

  describe('env var overrides', () => {
    it('ORCID_URL uses NEXT_PUBLIC_ORCID_HOMEPAGE (not VITE_ prefix)', async () => {
      vi.stubEnv('NEXT_PUBLIC_ORCID_HOMEPAGE', 'https://orcid.example.org');
      const { ORCID_URL } = await loadModule();
      expect(ORCID_URL).toBe('https://orcid.example.org');
    });

    it('DOI_URL uses NEXT_PUBLIC_DOI_HOMEPAGE (not VITE_ prefix)', async () => {
      vi.stubEnv('NEXT_PUBLIC_DOI_HOMEPAGE', 'https://doi.example.org');
      const { DOI_URL } = await loadModule();
      expect(DOI_URL).toBe('https://doi.example.org');
    });

    it('ARXIV_URL uses NEXT_PUBLIC_ARXIV_HOMEPAGE', async () => {
      vi.stubEnv('NEXT_PUBLIC_ARXIV_HOMEPAGE', 'https://arxiv.example.org');
      const { ARXIV_URL } = await loadModule();
      expect(ARXIV_URL).toBe('https://arxiv.example.org');
    });

    it('HAL_URL uses NEXT_PUBLIC_HAL_HOMEPAGE', async () => {
      vi.stubEnv('NEXT_PUBLIC_HAL_HOMEPAGE', 'https://hal.example.fr');
      const { HAL_URL } = await loadModule();
      expect(HAL_URL).toBe('https://hal.example.fr');
    });

    it('SOFTWARE_HERITAGE_URL uses NEXT_PUBLIC_ARCHIVE_SOFTWARE_HERITAGE_HOMEPAGE', async () => {
      vi.stubEnv('NEXT_PUBLIC_ARCHIVE_SOFTWARE_HERITAGE_HOMEPAGE', 'https://swh.example.org');
      const { SOFTWARE_HERITAGE_URL } = await loadModule();
      expect(SOFTWARE_HERITAGE_URL).toBe('https://swh.example.org');
    });

    it('TWITTER_URL uses NEXT_PUBLIC_TWITTER_HOMEPAGE', async () => {
      vi.stubEnv('NEXT_PUBLIC_TWITTER_HOMEPAGE', 'https://twitter.example.com');
      const { TWITTER_URL } = await loadModule();
      expect(TWITTER_URL).toBe('https://twitter.example.com');
    });

    it('MATHJAX_URL uses NEXT_PUBLIC_MATHJAX_HOMEPAGE', async () => {
      vi.stubEnv('NEXT_PUBLIC_MATHJAX_HOMEPAGE', 'https://mathjax.example.org');
      const { MATHJAX_URL } = await loadModule();
      expect(MATHJAX_URL).toBe('https://mathjax.example.org');
    });
  });

  describe('buildDoiUrl', () => {
    it('prepends DOI_URL when given a bare identifier', async () => {
      vi.stubEnv('NEXT_PUBLIC_DOI_HOMEPAGE', 'https://doi.org');
      const { buildDoiUrl } = await loadModule();
      expect(buildDoiUrl('10.1080/13504622.2024.2390627')).toBe(
        'https://doi.org/10.1080/13504622.2024.2390627'
      );
    });

    it('returns the value as-is when it is already a full URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_DOI_HOMEPAGE', 'https://doi.org');
      const { buildDoiUrl } = await loadModule();
      expect(buildDoiUrl('https://doi.org/10.1080/13504622.2024.2390627')).toBe(
        'https://doi.org/10.1080/13504622.2024.2390627'
      );
    });

    it('uses the fallback base URL when env var is empty', async () => {
      vi.stubEnv('NEXT_PUBLIC_DOI_HOMEPAGE', '');
      const { buildDoiUrl } = await loadModule();
      expect(buildDoiUrl('10.1234/test')).toBe('https://doi.org/10.1234/test');
    });
  });

  describe('buildOrcidUrl', () => {
    it('prepends ORCID_URL when given a bare identifier', async () => {
      vi.stubEnv('NEXT_PUBLIC_ORCID_HOMEPAGE', 'https://orcid.org');
      const { buildOrcidUrl } = await loadModule();
      expect(buildOrcidUrl('0000-0002-3053-3946')).toBe('https://orcid.org/0000-0002-3053-3946');
    });

    it('returns the value as-is when it is already a full URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_ORCID_HOMEPAGE', 'https://orcid.org');
      const { buildOrcidUrl } = await loadModule();
      expect(buildOrcidUrl('https://orcid.org/0000-0002-3053-3946')).toBe(
        'https://orcid.org/0000-0002-3053-3946'
      );
    });

    it('uses the fallback base URL when env var is empty', async () => {
      vi.stubEnv('NEXT_PUBLIC_ORCID_HOMEPAGE', '');
      const { buildOrcidUrl } = await loadModule();
      expect(buildOrcidUrl('0000-0001-2345-6789')).toBe('https://orcid.org/0000-0001-2345-6789');
    });
  });
});
