import { defaultLanguage } from '@/utils/language-utils';

/**
 * Resolve localized content: requestedLang -> defaultLanguage -> empty
 */
export function getLocalizedContent(
  contentMap: Record<string, string> | undefined | null,
  requestedLang: string,
  fallbackLang: string = defaultLanguage
): { value: string; isOriginalLanguage: boolean; isAvailable: boolean } {
  if (!contentMap) return { value: '', isOriginalLanguage: false, isAvailable: false };

  const requested = contentMap[requestedLang];
  if (requested?.trim()) return { value: requested, isOriginalLanguage: true, isAvailable: true };

  if (fallbackLang !== requestedLang) {
    const fallback = contentMap[fallbackLang];
    if (fallback?.trim()) return { value: fallback, isOriginalLanguage: false, isAvailable: true };
  }

  return { value: '', isOriginalLanguage: false, isAvailable: false };
}
