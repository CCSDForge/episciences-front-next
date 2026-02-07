/**
 * Language utilities for i18n routing
 *
 * This module provides helper functions for managing language prefixes in URLs.
 * - Default language (EN): URLs without prefix (e.g., /about, /articles/123)
 * - Other languages: URLs with prefix (e.g., /fr/about, /fr/articles/123)
 */

export const defaultLanguage: string = process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE || 'en';

// All interface languages the platform supports (superset used for URL routing)
export const allSupportedLanguages: string[] = ['en', 'fr', 'es'];

// Languages accepted by the current journal (env-driven, may be a subset)
export const acceptedLanguages: string[] = process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES
  ? process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES.split(',').map(lang => lang.trim())
  : ['en', 'fr'];

export type AvailableLanguage = (typeof acceptedLanguages)[number];

/**
 * Extract language from route params
 * @param params - Route params object that may contain a 'lang' property
 * @returns The language code or default language if not found
 */
export function getLanguageFromParams(params: { lang?: string | string[] } | undefined): string {
  if (!params || !params.lang) {
    return defaultLanguage;
  }

  const lang = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  return validateLanguage(lang);
}

/**
 * Check if a language is the default language
 * @param lang - Language code to check
 * @returns true if it's the default language
 */
export function isDefaultLanguage(lang: string): boolean {
  return lang === defaultLanguage;
}

/**
 * Validate a language code against accepted languages
 * @param lang - Language code to validate
 * @returns The language if valid, otherwise the default language
 */
export function validateLanguage(lang: string): string {
  return allSupportedLanguages.includes(lang) ? lang : defaultLanguage;
}

// Configuration: Always show language prefix for better multi-tenant SEO and robot differentiation
const ALWAYS_USE_PREFIX = true;

/**
 * Get a localized path by adding or removing language prefix
 * @param path - The base path (e.g., '/about', '/articles/123')
 * @param lang - Target language code
 * @returns Localized path with language prefix (unless root)
 */
export function getLocalizedPath(path: string, lang: string): string {
  // Remove any existing language prefix from the path
  const cleanPath = removeLanguagePrefix(path);

  // If we are at root ('/'), we might want to keep it simple or redirect,
  // but generally links to specific pages should have the lang.

  // If explicitly disabled (e.g. for single-lang sites), use old logic
  if (!ALWAYS_USE_PREFIX && isDefaultLanguage(lang)) {
    return cleanPath;
  }

  // Always add the language prefix
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Remove language prefix from a path if present
 * @param path - Path that may have a language prefix
 * @returns Path without language prefix
 */
export function removeLanguagePrefix(path: string): string {
  // Handle paths like /fr/about or /en/articles/123
  for (const lang of allSupportedLanguages) {
    if (path.startsWith(`/${lang}/`) || path === `/${lang}`) {
      return path.substring(lang.length + 1) || '/';
    }
  }

  return path;
}

/**
 * Extract language from URL pathname
 * @param pathname - Full URL pathname
 * @returns Language code if found in path, otherwise default language
 */
export function getLanguageFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return defaultLanguage;
  }

  const potentialLang = segments[0];
  return allSupportedLanguages.includes(potentialLang) ? potentialLang : defaultLanguage;
}

/**
 * Check if a path has a language prefix
 * @param path - Path to check
 * @returns true if path starts with a valid language code
 */
export function hasLanguagePrefix(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  return allSupportedLanguages.includes(segments[0]);
}
