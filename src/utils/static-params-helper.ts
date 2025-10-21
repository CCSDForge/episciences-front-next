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
 * During targeted rebuilds (article, volume, section), this returns only the
 * default language to minimize static page generation while satisfying Next.js
 * export requirements (cannot return empty array).
 *
 * During static-page rebuilds, this returns all languages for the specified page.
 *
 * Returns:
 * - { lang: 'en' } for English (default)
 * - { lang: 'fr' } for French
 * - etc.
 * - Only { lang: defaultLanguage } during targeted resource rebuilds (minimal generation)
 * - All languages during static-page rebuilds
 */
export function generateLanguageParams() {
  // During static-page rebuilds, generate all languages for that page
  if (process.env.ONLY_BUILD_STATIC_PAGE) {
    return acceptedLanguages.map(lang => ({ lang }));
  }

  // During targeted resource rebuilds, only generate default language for static pages
  // This minimizes unnecessary generation while satisfying Next.js export requirement
  // (pages with generateStaticParams cannot return empty array in export mode)
  if (
    process.env.ONLY_BUILD_ARTICLE_ID ||
    process.env.ONLY_BUILD_VOLUME_ID ||
    process.env.ONLY_BUILD_SECTION_ID
  ) {
    // Return only default language to minimize generation
    return [{ lang: defaultLanguage }];
  }

  return acceptedLanguages.map(lang => ({ lang }));
}

/**
 * Generate language params for a specific static page
 *
 * This function checks if we're doing a targeted static-page rebuild.
 * If we are rebuilding a specific page and this is that page, return all languages.
 * If we are rebuilding a different page, return only default language to minimize build time.
 * If we're doing a full build, return all languages.
 *
 * @param pageName - The name/route of the page (e.g., 'about', 'home', 'news', 'credits')
 * @returns Array of language params
 */
export function generateLanguageParamsForPage(pageName: string) {
  const targetPage = process.env.ONLY_BUILD_STATIC_PAGE;

  // If targeting a specific static page
  if (targetPage) {
    // If this is the target page, generate all languages
    if (targetPage === pageName) {
      return acceptedLanguages.map(lang => ({ lang }));
    }
    // Otherwise, generate only default language to minimize build time
    return [{ lang: defaultLanguage }];
  }

  // During resource rebuilds (article/volume/section), minimize static page generation
  if (
    process.env.ONLY_BUILD_ARTICLE_ID ||
    process.env.ONLY_BUILD_VOLUME_ID ||
    process.env.ONLY_BUILD_SECTION_ID
  ) {
    return [{ lang: defaultLanguage }];
  }

  // Full build: generate all languages
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
