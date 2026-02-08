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
  if (!journalId) {
    return false;
  }

  // Only allow lowercase letters, digits, and hyphens
  // Minimum length: 2 characters, Maximum length: 50 characters
  const pattern = /^[a-z0-9-]{2,50}$/;
  return pattern.test(journalId);
}
