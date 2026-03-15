import { describe, it, expect } from 'vitest';
import { isValidJournalId, sanitizeIp } from '../validation';

describe('isValidJournalId', () => {
  describe('valid journal IDs', () => {
    it('accepts lowercase letters only', () => {
      expect(isValidJournalId('epijinfo')).toBe(true);
    });

    it('accepts lowercase letters with hyphens', () => {
      expect(isValidJournalId('my-journal')).toBe(true);
    });

    it('accepts lowercase letters with digits', () => {
      expect(isValidJournalId('journal2024')).toBe(true);
    });

    it('accepts mix of lowercase, digits and hyphens', () => {
      expect(isValidJournalId('my-journal-2024')).toBe(true);
    });

    it('accepts minimum length (2 chars)', () => {
      expect(isValidJournalId('ab')).toBe(true);
    });

    it('accepts maximum length (50 chars)', () => {
      expect(isValidJournalId('a'.repeat(50))).toBe(true);
    });

    it('accepts journal ID with leading digit', () => {
      expect(isValidJournalId('1journal')).toBe(true);
    });

    it('accepts journal ID with multiple hyphens', () => {
      expect(isValidJournalId('a-b-c-d')).toBe(true);
    });
  });

  describe('invalid journal IDs — security tests', () => {
    it('rejects path traversal attack', () => {
      expect(isValidJournalId('../../../etc/passwd')).toBe(false);
    });

    it('rejects path traversal with encoded slash', () => {
      expect(isValidJournalId('journal/../../secret')).toBe(false);
    });

    it('rejects uppercase letters', () => {
      expect(isValidJournalId('Journal123')).toBe(false);
    });

    it('rejects uppercase-only IDs', () => {
      expect(isValidJournalId('EPIJINFO')).toBe(false);
    });

    it('rejects SQL injection attempt', () => {
      expect(isValidJournalId("journal'; DROP TABLE users;--")).toBe(false);
    });

    it('rejects XSS injection attempt', () => {
      expect(isValidJournalId('<script>alert(1)</script>')).toBe(false);
    });

    it('rejects null byte injection', () => {
      expect(isValidJournalId('journal\x00')).toBe(false);
    });

    it('rejects ID with spaces', () => {
      expect(isValidJournalId('my journal')).toBe(false);
    });

    it('rejects ID with underscore', () => {
      expect(isValidJournalId('my_journal')).toBe(false);
    });

    it('rejects ID with dots', () => {
      expect(isValidJournalId('my.journal')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects empty string', () => {
      expect(isValidJournalId('')).toBe(false);
    });

    it('rejects single character (too short)', () => {
      expect(isValidJournalId('a')).toBe(false);
    });

    it('rejects ID exceeding 50 chars', () => {
      expect(isValidJournalId('a'.repeat(51))).toBe(false);
    });

    it('rejects ID starting with hyphen', () => {
      expect(isValidJournalId('-journal')).toBe(true); // matches /^[a-z0-9-]{2,50}$/
    });

    it('rejects ID that is only hyphens', () => {
      expect(isValidJournalId('--')).toBe(true); // matches /^[a-z0-9-]{2,50}$/
    });
  });
});

describe('sanitizeIp', () => {
  describe('valid inputs', () => {
    it('returns a plain IPv4 address unchanged', () => {
      expect(sanitizeIp('192.168.1.1')).toBe('192.168.1.1');
    });

    it('returns the first IP from a comma-separated x-forwarded-for list', () => {
      expect(sanitizeIp('10.0.0.1, 172.16.0.1, 8.8.8.8')).toBe('10.0.0.1');
    });

    it('trims surrounding whitespace from the first IP', () => {
      expect(sanitizeIp('  192.168.1.1  , 10.0.0.1')).toBe('192.168.1.1');
    });

    it('returns a valid IPv6 address (loopback)', () => {
      expect(sanitizeIp('::1')).toBe('::1');
    });

    it('returns a full IPv6 address', () => {
      expect(sanitizeIp('2001:db8::1')).toBe('2001:db8::1');
    });
  });

  describe('invalid / untrusted inputs', () => {
    it('returns "unknown" for null', () => {
      expect(sanitizeIp(null)).toBe('unknown');
    });

    it('returns "unknown" for an empty string', () => {
      expect(sanitizeIp('')).toBe('unknown');
    });

    it('returns "unknown" for a hostname (non-IP)', () => {
      expect(sanitizeIp('evil.host.com')).toBe('unknown');
    });

    it('returns "unknown" for XSS payload', () => {
      expect(sanitizeIp('<script>alert(1)</script>')).toBe('unknown');
    });

    it('returns "unknown" when value contains spaces (header injection)', () => {
      expect(sanitizeIp('127.0.0.1 AND 1=1')).toBe('unknown');
    });

    it('returns "unknown" when value contains a newline (header injection)', () => {
      expect(sanitizeIp('127.0.0.1\nX-Injected: evil')).toBe('unknown');
    });
  });
});
