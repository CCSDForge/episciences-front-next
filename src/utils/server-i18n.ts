import { promises as fs } from 'node:fs';
import path from 'path';
import { serviceLogger } from '@/lib/logger';

const log = serviceLogger.child({ service: 'server-i18n' });

export const defaultLanguage: string = process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE || 'en';

export const availableLanguages = process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES
  ? process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES.split(',')
  : ['en', 'fr'];

export type AvailableLanguage = (typeof availableLanguages)[number];

export type Translations = Record<string, any>;

/**
 * Load translations from the public/locales directory for server-side rendering
 * This function reads translation files at build time for static generation
 */
export async function getServerTranslations(
  locale: string = defaultLanguage
): Promise<Translations> {
  try {
    const translationPath = path.join(
      process.cwd(),
      'public',
      'locales',
      locale,
      'translation.json'
    );
    const fileContents = await fs.readFile(translationPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    log.error({ error, locale }, 'Failed to load translations');
    // Fallback to default language if specified locale fails
    if (locale !== defaultLanguage) {
      try {
        const fallbackPath = path.join(
          process.cwd(),
          'public',
          'locales',
          defaultLanguage,
          'translation.json'
        );
        const fileContents = await fs.readFile(fallbackPath, 'utf8');
        return JSON.parse(fileContents);
      } catch (fallbackError) {
        log.error({ error: fallbackError }, 'Failed to load fallback translations');
        return {};
      }
    }
    return {};
  }
}

/**
 * Get a translated string from the translations object
 * Supports nested keys using dot notation (e.g., 'pages.articleDetails.title')
 */
export function t(
  key: string,
  translations: Translations,
  params?: Record<string, string>
): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      log.warn({ key }, 'Translation key not found');
      return key;
    }
  }

  if (typeof value !== 'string') {
    log.warn({ key }, 'Translation key does not resolve to a string');
    return key;
  }

  // Replace parameters in the translation string (e.g., {{name}})
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match: string, paramKey: string) => {
      return params[paramKey] || match;
    });
  }

  return value;
}

/**
 * Check if multiple languages are configured
 */
export function hasMultipleLanguages(): boolean {
  return availableLanguages.length > 1;
}

/**
 * Get all locale paths to generate for static export
 * If only one language, returns empty array (no locale prefix)
 * If multiple languages, returns all languages including default
 */
export function getLocalePaths(): string[] {
  if (!hasMultipleLanguages()) {
    return [];
  }
  return availableLanguages;
}
