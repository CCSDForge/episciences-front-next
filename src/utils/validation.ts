/**
 * Validation utilities for journal IDs and other inputs
 *
 * This module provides validation functions to ensure user inputs
 * meet security requirements and prevent path traversal or injection attacks.
 */

/**
 * Pure-JS IP validator (no Node.js built-ins) — safe for middleware/edge bundling.
 * Returns true for structurally valid IPv4 or IPv6 addresses.
 */
function isValidIp(ip: string): boolean {
  // IPv4: exactly 4 decimal octets 0-255, no leading zeros (except "0")
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ipv4.exec(ip);
  if (m) {
    return m.slice(1, 5).every(oct => {
      const n = Number(oct);
      return n >= 0 && n <= 255 && String(n) === oct;
    });
  }

  // IPv6: only hex digits and colons, at least one colon
  if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
  if (!ip.includes(':')) return false;
  // At most one '::' (zero-compression) allowed
  if ((ip.match(/::/g) ?? []).length > 1) return false;

  const parts = ip.split(':');
  // Without '::': exactly 8 groups; with '::': fewer allowed (creates empty strings)
  if (!ip.includes('::') && parts.length !== 8) return false;
  if (parts.length > 9) return false;

  return parts.every(p => /^[0-9a-fA-F]{0,4}$/.test(p));
}

/**
 * Sanitize an IP address from request headers to prevent IP spoofing bypasses in rate limiting.
 * Takes the first IP from a potentially comma-separated x-forwarded-for value and validates its
 * structure (IPv4 or IPv6) using a pure-JS regex validator compatible with edge/middleware bundles.
 *
 * @param raw - Raw header value (may be null or comma-separated list)
 * @returns A structurally valid IP string or 'unknown'
 */
export function sanitizeIp(raw: string | null): string {
  const first = raw?.split(',')[0]?.trim() ?? '';
  return isValidIp(first) ? first : 'unknown';
}

/**
 * Sanitize a value for safe logging (prevents log injection via newlines/control chars)
 *
 * @param value - Raw user-controlled value to sanitize
 * @param maxLength - Maximum length to truncate to (default 200)
 * @returns Sanitized string safe for log output
 */
export function sanitizeForLog(value: string | null | undefined, maxLength = 200): string {
  if (value == null) return '(null)';
  return value.replace(/[\r\n\t]/g, ' ').slice(0, maxLength);
}

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
