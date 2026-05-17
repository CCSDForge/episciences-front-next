import { describe, it, expect, vi } from 'vitest';
import { generateSeoAlternates } from '../seo';

vi.mock('../signposting', () => ({
  getJournalBaseUrl: (id: string) => `https://${id}.episciences.org`,
}));

vi.mock('../language-utils', () => ({
  acceptedLanguages: ['en', 'fr'],
}));

describe('generateSeoAlternates', () => {
  describe('canonical URL', () => {
    it('builds canonical with language prefix and path', () => {
      const result = generateSeoAlternates('myjournal', 'en', '/volumes');
      expect(result?.canonical).toBe('https://myjournal.episciences.org/en/volumes');
    });

    it('adds leading slash when path has none', () => {
      const result = generateSeoAlternates('myjournal', 'fr', 'articles');
      expect(result?.canonical).toBe('https://myjournal.episciences.org/fr/articles');
    });

    it('handles root path without double slash', () => {
      const result = generateSeoAlternates('myjournal', 'en', '/');
      expect(result?.canonical).toBe('https://myjournal.episciences.org/en');
    });

    it('uses current language in canonical URL', () => {
      const resultEn = generateSeoAlternates('myjournal', 'en', '/about');
      const resultFr = generateSeoAlternates('myjournal', 'fr', '/about');
      expect(resultEn?.canonical).toContain('/en/');
      expect(resultFr?.canonical).toContain('/fr/');
    });
  });

  describe('alternate languages', () => {
    it('generates alternates for all accepted languages', () => {
      const result = generateSeoAlternates('myjournal', 'en', '/about');
      const languages = result?.languages as Record<string, string>;
      expect(Object.keys(languages)).toEqual(['en', 'fr']);
    });

    it('builds correct URL for each language', () => {
      const result = generateSeoAlternates('myjournal', 'en', '/about');
      const languages = result?.languages as Record<string, string>;
      expect(languages['en']).toBe('https://myjournal.episciences.org/en/about');
      expect(languages['fr']).toBe('https://myjournal.episciences.org/fr/about');
    });

    it('handles root path in language alternates without double slash', () => {
      const result = generateSeoAlternates('myjournal', 'en', '/');
      const languages = result?.languages as Record<string, string>;
      expect(languages['en']).toBe('https://myjournal.episciences.org/en');
      expect(languages['fr']).toBe('https://myjournal.episciences.org/fr');
    });

    it('uses journal-specific base URL', () => {
      const result = generateSeoAlternates('diamond', 'en', '/volumes');
      const languages = result?.languages as Record<string, string>;
      expect(languages['en']).toContain('diamond.episciences.org');
    });
  });
});
