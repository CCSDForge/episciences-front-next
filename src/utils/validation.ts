/**
 * Validation utilities for journal IDs and other inputs
 *
 * This module provides validation functions to ensure user inputs
 * meet security requirements and prevent path traversal or injection attacks.
 */

/**
 * Validate journal ID format
 *
 * Journal IDs must consist only of lowercase letters, digits, and hyphens
 * to prevent path traversal and injection attacks.
 *
 * @param journalId - The journal ID to validate
 * @returns true if journal ID is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidJournalId('epijinfo') // true
 * isValidJournalId('my-journal-2024') // true
 * isValidJournalId('../../../etc/passwd') // false
 * isValidJournalId('Journal123') // false (uppercase not allowed)
 * ```
 */
export function isValidJournalId(journalId: string): boolean {
  if (!journalId || typeof journalId !== 'string') {
    return false;
  }

  // Only allow lowercase letters, digits, and hyphens
  // Minimum length: 2 characters, Maximum length: 50 characters
  const pattern = /^[a-z0-9-]{2,50}$/;
  return pattern.test(journalId);
}

/**
 * Validate language code format
 *
 * Language codes must be exactly 2 lowercase letters (ISO 639-1 format).
 *
 * @param lang - The language code to validate
 * @returns true if language code is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidLanguageCode('en') // true
 * isValidLanguageCode('fr') // true
 * isValidLanguageCode('eng') // false (too long)
 * isValidLanguageCode('EN') // false (uppercase)
 * ```
 */
export function isValidLanguageCode(lang: string): boolean {
  if (!lang || typeof lang !== 'string') {
    return false;
  }

  // Exactly 2 lowercase letters
  const pattern = /^[a-z]{2}$/;
  return pattern.test(lang);
}

/**
 * Sanitize a string by removing potentially dangerous characters
 *
 * This function removes characters that could be used in path traversal
 * or injection attacks.
 *
 * @param input - The string to sanitize
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * sanitizeInput('hello-world') // 'hello-world'
 * sanitizeInput('../../../etc') // 'etc'
 * sanitizeInput('test<script>') // 'testscript'
 * ```
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove dangerous characters
  return input
    .replace(/[<>\"'`]/g, '') // Remove HTML/script chars
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '') // Remove path separators
    .trim();
}
