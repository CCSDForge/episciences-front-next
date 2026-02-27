import { describe, it, expect, vi } from 'vitest';
import { getLocalizedContent } from '../content-fallback';

vi.mock('@/utils/language-utils', () => ({
  defaultLanguage: 'en',
}));

describe('getLocalizedContent', () => {
  describe('when content is found in requested language', () => {
    it('should return value with isOriginalLanguage=true', () => {
      const result = getLocalizedContent({ en: 'Hello', fr: 'Bonjour' }, 'fr');
      expect(result).toEqual({ value: 'Bonjour', isOriginalLanguage: true, isAvailable: true });
    });

    it('should return the exact requested language value', () => {
      const result = getLocalizedContent({ en: 'English', fr: 'French', es: 'Spanish' }, 'es');
      expect(result).toEqual({ value: 'Spanish', isOriginalLanguage: true, isAvailable: true });
    });
  });

  describe('when content is not in requested language but available in default', () => {
    it('should fall back to default language with isOriginalLanguage=false', () => {
      const result = getLocalizedContent({ en: 'Hello' }, 'fr');
      expect(result).toEqual({ value: 'Hello', isOriginalLanguage: false, isAvailable: true });
    });

    it('should use explicit fallbackLang when provided', () => {
      const result = getLocalizedContent({ fr: 'Bonjour' }, 'es', 'fr');
      expect(result).toEqual({ value: 'Bonjour', isOriginalLanguage: false, isAvailable: true });
    });
  });

  describe('when content is not available in any language', () => {
    it('should return empty value with isAvailable=false', () => {
      const result = getLocalizedContent({ de: 'Hallo' }, 'fr');
      expect(result).toEqual({ value: '', isOriginalLanguage: false, isAvailable: false });
    });

    it('should return empty value when content map is empty', () => {
      const result = getLocalizedContent({}, 'en');
      expect(result).toEqual({ value: '', isOriginalLanguage: false, isAvailable: false });
    });
  });

  describe('edge cases', () => {
    it('should return empty fallback when contentMap is null', () => {
      const result = getLocalizedContent(null, 'en');
      expect(result).toEqual({ value: '', isOriginalLanguage: false, isAvailable: false });
    });

    it('should return empty fallback when contentMap is undefined', () => {
      const result = getLocalizedContent(undefined, 'en');
      expect(result).toEqual({ value: '', isOriginalLanguage: false, isAvailable: false });
    });

    it('should ignore whitespace-only values', () => {
      const result = getLocalizedContent({ fr: '   ', en: 'Hello' }, 'fr');
      expect(result).toEqual({ value: 'Hello', isOriginalLanguage: false, isAvailable: true });
    });

    it('should not double-fall-back when requestedLang equals fallbackLang', () => {
      const result = getLocalizedContent({ fr: 'Bonjour' }, 'en', 'en');
      expect(result).toEqual({ value: '', isOriginalLanguage: false, isAvailable: false });
    });
  });
});
