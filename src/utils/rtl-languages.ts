/**
 * RTL (Right-to-Left) Language Support Utilities
 *
 * This module provides utilities for detecting and handling RTL languages.
 * RTL languages include Arabic, Hebrew, Persian, Urdu, and others that are written from right to left.
 */

/**
 * List of ISO 639-1 language codes that use RTL (Right-to-Left) writing direction
 * Based on the comprehensive list of RTL languages
 */
export const RTL_LANGUAGE_CODES: readonly string[] = [
  'ar',  // Arabic - Used in many countries (Middle East and North Africa)
  'fa',  // Persian (Farsi) - Primary language of Iran
  'ur',  // Urdu - Primary language of Pakistan and widely used in India
  'he',  // Hebrew - Official language of Israel
  'yi',  // Yiddish - Germanic language written in Hebrew alphabet
  'sd',  // Sindhi - Regional language of Pakistan and India
  'ps',  // Pashto - Major language in Afghanistan and Pakistan
  'ks',  // Kashmiri - Can be written in Arabic or Devanagari depending on context
  'ug',  // Uyghur - Turkic language written in modified Arabic alphabet
  'ckb', // Kurdish (Sorani) - Kurdish variant written in Arabic alphabet
  'dv',  // Dhivehi (Maldivian) - Language of Maldives using Thaana alphabet
] as const;

/**
 * Check if a given language code represents an RTL language
 * @param langCode - ISO 639-1 language code (e.g., 'ar', 'en', 'fr')
 * @returns true if the language uses RTL writing direction
 *
 * @example
 * isRTLLanguage('ar') // returns true
 * isRTLLanguage('en') // returns false
 */
export function isRTLLanguage(langCode: string): boolean {
  if (!langCode) return false;

  // Normalize the language code to lowercase for comparison
  const normalizedCode = langCode.toLowerCase().trim();

  return RTL_LANGUAGE_CODES.includes(normalizedCode as any);
}

/**
 * Get the text direction (ltr or rtl) for a given language code
 * @param langCode - ISO 639-1 language code
 * @returns 'rtl' for right-to-left languages, 'ltr' for left-to-right languages
 *
 * @example
 * getTextDirection('ar') // returns 'rtl'
 * getTextDirection('en') // returns 'ltr'
 */
export function getTextDirection(langCode: string): 'ltr' | 'rtl' {
  return isRTLLanguage(langCode) ? 'rtl' : 'ltr';
}

/**
 * Get a human-readable label for a language code
 * Uses the browser's Intl.DisplayNames API when available
 * Falls back to returning the uppercase language code
 *
 * @param langCode - ISO 639-1 language code
 * @param displayLang - Language to display the name in (defaults to 'en')
 * @returns Human-readable language name
 *
 * @example
 * getLanguageLabel('ar', 'en') // returns 'Arabic'
 * getLanguageLabel('ar', 'fr') // returns 'arabe'
 */
export function getLanguageLabel(
  langCode: string,
  displayLang: string = 'en'
): string {
  if (!langCode) return '';

  try {
    // Use Intl.DisplayNames for native language name display
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const displayNames = new Intl.DisplayNames([displayLang], {
        type: 'language'
      });
      return displayNames.of(langCode) || langCode.toUpperCase();
    }
  } catch (error) {
    console.warn(`Failed to get display name for language ${langCode}:`, error);
  }

  // Fallback to uppercase code
  return langCode.toUpperCase();
}

/**
 * Type guard to check if a value is a valid RTL language code
 */
export type RTLLanguageCode = typeof RTL_LANGUAGE_CODES[number];

export function isRTLLanguageCode(code: string): code is RTLLanguageCode {
  return RTL_LANGUAGE_CODES.includes(code as any);
}
