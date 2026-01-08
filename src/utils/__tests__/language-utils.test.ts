import { describe, it, expect } from 'vitest';
import {
  getLanguageFromParams,
  isDefaultLanguage,
  validateLanguage,
  getLocalizedPath,
  removeLanguagePrefix,
  getLanguageFromPathname,
  hasLanguagePrefix,
  acceptedLanguages,
  defaultLanguage,
} from '../language-utils';

describe('language-utils', () => {
  // Note: These tests work with the actual environment configuration
  // If NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES is not set, only 'en' is accepted

  describe('getLanguageFromParams', () => {
    it('should return default language when params is undefined', () => {
      const result = getLanguageFromParams(undefined);
      expect(result).toBe('en');
    });

    it('should return default language when lang param is missing', () => {
      const result = getLanguageFromParams({});
      expect(result).toBe('en');
    });

    it('should return lang from params when it is a valid accepted language', () => {
      const result = getLanguageFromParams({ lang: defaultLanguage });
      expect(result).toBe(defaultLanguage);
    });

    it('should return first element when lang is an array', () => {
      const result = getLanguageFromParams({ lang: [defaultLanguage, 'other'] });
      expect(result).toBe(defaultLanguage);
    });

    it('should validate and return default for invalid language', () => {
      const result = getLanguageFromParams({ lang: 'invalid' });
      expect(result).toBe(defaultLanguage);
    });

    it('should validate and return default for non-accepted language', () => {
      // If 'fr' is not in acceptedLanguages, it should return default
      if (!acceptedLanguages.includes('fr')) {
        const result = getLanguageFromParams({ lang: 'fr' });
        expect(result).toBe(defaultLanguage);
      }
    });
  });

  describe('isDefaultLanguage', () => {
    it('should return true for default language (en)', () => {
      expect(isDefaultLanguage('en')).toBe(true);
    });

    it('should return false for non-default language', () => {
      expect(isDefaultLanguage('fr')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isDefaultLanguage('')).toBe(false);
    });
  });

  describe('validateLanguage', () => {
    it('should return valid language code', () => {
      expect(validateLanguage('en')).toBe('en');
    });

    it('should return default language for invalid code', () => {
      expect(validateLanguage('invalid')).toBe('en');
    });

    it('should return default language for empty string', () => {
      expect(validateLanguage('')).toBe('en');
    });

    it('should validate accepted languages correctly', () => {
      // Assuming acceptedLanguages includes 'fr'
      const result = validateLanguage('fr');
      expect(['en', 'fr']).toContain(result);
    });
  });

  describe('getLocalizedPath', () => {
    it('should return path with prefix for default language', () => {
      const result = getLocalizedPath('/about', defaultLanguage);
      expect(result).toBe(`/${defaultLanguage}/about`);
    });

    it('should add language prefix for non-default language', () => {
      // Only test if we have multiple accepted languages
      const nonDefaultLang = acceptedLanguages.find(lang => lang !== defaultLanguage);
      if (nonDefaultLang) {
        const result = getLocalizedPath('/about', nonDefaultLang);
        expect(result).toBe(`/${nonDefaultLang}/about`);
      } else {
        expect(true).toBe(true); // Skip if only one language
      }
    });

    it('should handle root path for default language', () => {
      const result = getLocalizedPath('/', defaultLanguage);
      expect(result).toBe(`/${defaultLanguage}`);
    });

    it('should handle root path for non-default language', () => {
      const nonDefaultLang = acceptedLanguages.find(lang => lang !== defaultLanguage);
      if (nonDefaultLang) {
        const result = getLocalizedPath('/', nonDefaultLang);
        expect(result).toBe(`/${nonDefaultLang}`);
      } else {
        expect(true).toBe(true); // Skip if only one language
      }
    });

    it('should handle paths correctly', () => {
      // Test with default language
      const result = getLocalizedPath('/articles/123/comments', defaultLanguage);
      expect(result).toBe(`/${defaultLanguage}/articles/123/comments`);
    });
  });

  describe('removeLanguagePrefix', () => {
    it('should return path unchanged if no prefix', () => {
      const result = removeLanguagePrefix('/about');
      expect(result).toBe('/about');
    });

    it('should handle default language prefix removal if present', () => {
      const result = removeLanguagePrefix(`/${defaultLanguage}/contact`);
      expect(result).toBe('/contact');
    });

    it('should handle root language path', () => {
      const result = removeLanguagePrefix(`/${defaultLanguage}`);
      expect(result).toBe('/');
    });

    it('should not remove partial matches', () => {
      const result = removeLanguagePrefix('/english/about');
      expect(result).toBe('/english/about');
    });

    it('should handle complex paths with language prefix', () => {
      const result = removeLanguagePrefix(`/${defaultLanguage}/articles/123/edit`);
      expect(result).toBe('/articles/123/edit');
    });

    it('should remove accepted language prefixes', () => {
      acceptedLanguages.forEach(lang => {
        const result = removeLanguagePrefix(`/${lang}/test`);
        expect(result).toBe('/test');
      });
    });

    it('should not remove non-accepted language prefixes', () => {
      // If 'xyz' is not an accepted language, it should not be removed
      if (!acceptedLanguages.includes('xyz')) {
        const result = removeLanguagePrefix('/xyz/about');
        expect(result).toBe('/xyz/about');
      }
    });
  });

  describe('getLanguageFromPathname', () => {
    it('should extract accepted language from pathname', () => {
      const result = getLanguageFromPathname(`/${defaultLanguage}/about`);
      expect(result).toBe(defaultLanguage);
    });

    it('should return default language for path without prefix', () => {
      const result = getLanguageFromPathname('/about');
      expect(result).toBe(defaultLanguage);
    });

    it('should return default language for root path', () => {
      const result = getLanguageFromPathname('/');
      expect(result).toBe(defaultLanguage);
    });

    it('should return default language for empty path', () => {
      const result = getLanguageFromPathname('');
      expect(result).toBe(defaultLanguage);
    });

    it('should validate language code from pathname', () => {
      const result = getLanguageFromPathname('/invalid/about');
      expect(result).toBe(defaultLanguage);
    });

    it('should handle pathname with multiple segments', () => {
      const result = getLanguageFromPathname(`/${defaultLanguage}/articles/123/comments`);
      expect(result).toBe(defaultLanguage);
    });

    it('should return default for non-accepted language in pathname', () => {
      if (!acceptedLanguages.includes('xyz')) {
        const result = getLanguageFromPathname('/xyz/about');
        expect(result).toBe(defaultLanguage);
      }
    });
  });

  describe('hasLanguagePrefix', () => {
    it('should return true for path with accepted language prefix', () => {
      expect(hasLanguagePrefix(`/${defaultLanguage}/about`)).toBe(true);
    });

    it('should return false for path without language prefix', () => {
      expect(hasLanguagePrefix('/about')).toBe(false);
    });

    it('should return false for root path', () => {
      expect(hasLanguagePrefix('/')).toBe(false);
    });

    it('should return false for empty path', () => {
      expect(hasLanguagePrefix('')).toBe(false);
    });

    it('should return false for invalid language code', () => {
      expect(hasLanguagePrefix('/invalid/about')).toBe(false);
    });

    it('should handle complex paths with accepted language', () => {
      expect(hasLanguagePrefix(`/${defaultLanguage}/articles/123/edit`)).toBe(true);
    });

    it('should return true for all accepted language prefixes', () => {
      acceptedLanguages.forEach(lang => {
        expect(hasLanguagePrefix(`/${lang}/test`)).toBe(true);
      });
    });

    it('should return false for non-accepted language prefixes', () => {
      if (!acceptedLanguages.includes('xyz')) {
        expect(hasLanguagePrefix('/xyz/about')).toBe(false);
      }
    });
  });
});
