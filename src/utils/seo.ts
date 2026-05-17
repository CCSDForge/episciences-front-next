import { Metadata } from 'next';
import { getJournalBaseUrl } from './signposting';
import { acceptedLanguages } from './language-utils';

/**
 * Generates SEO alternates (canonical and language variants) for Next.js Metadata
 * @param journalId - The journal code
 * @param currentLang - The current language
 * @param pathWithoutLang - The path without language prefix (e.g., '/volumes/123')
 * @returns Metadata['alternates'] object
 */
export function generateSeoAlternates(
  journalId: string,
  currentLang: string,
  pathWithoutLang: string
): Metadata['alternates'] {
  const baseUrl = getJournalBaseUrl(journalId);
  const cleanPath = pathWithoutLang.startsWith('/') ? pathWithoutLang : `/${pathWithoutLang}`;

  const canonicalUrl = `${baseUrl}/${currentLang}${cleanPath === '/' ? '' : cleanPath}`;

  const alternateLanguages: Record<string, string> = {};
  acceptedLanguages.forEach(lang => {
    alternateLanguages[lang] = `${baseUrl}/${lang}${cleanPath === '/' ? '' : cleanPath}`;
  });

  return {
    canonical: canonicalUrl,
    languages: alternateLanguages,
  };
}
