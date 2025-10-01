/**
 * Helper functions for generating static params with language support
 *
 * These functions help generate all combinations of route params across languages
 */

import { acceptedLanguages, defaultLanguage } from './language-utils';

/**
 * Generate language params for all accepted languages
 *
 * For static export compatibility, we generate all languages including the default.
 * The middleware will redirect /en/... to /... for the default language.
 *
 * Returns:
 * - { lang: 'en' } for English (default)
 * - { lang: 'fr' } for French
 * - etc.
 */
export function generateLanguageParams() {
  return acceptedLanguages.map(lang => ({ lang }));
}

/**
 * Combine language params with other params (like id, slug, etc.)
 *
 * Example:
 * Input: [{ id: '123' }, { id: '456' }]
 * Output: [
 *   { lang: undefined, id: '123' },
 *   { lang: 'fr', id: '123' },
 *   { lang: undefined, id: '456' },
 *   { lang: 'fr', id: '456' }
 * ]
 */
export function combineWithLanguageParams<T extends Record<string, any>>(
  params: T[]
): Array<T & { lang?: string }> {
  const languageParams = generateLanguageParams();
  const combined: Array<T & { lang?: string }> = [];

  for (const param of params) {
    for (const langParam of languageParams) {
      combined.push({ ...param, ...langParam });
    }
  }

  return combined;
}
