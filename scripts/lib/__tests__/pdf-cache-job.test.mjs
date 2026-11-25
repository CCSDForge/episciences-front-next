import { describe, it, expect } from 'vitest';
import { parsePopulateMessage, shouldSkipPopulate } from '../pdf-cache-job.mjs';

const URL = 'https://zenodo.org/a.pdf';
const KEY = 'a'.repeat(64);

describe('pdf-cache-job', () => {
  describe('parsePopulateMessage', () => {
    it('parses a well-formed message', () => {
      expect(parsePopulateMessage(JSON.stringify({ url: URL, key: KEY, reason: 'refresh' }))).toEqual({
        url: URL,
        key: KEY,
        reason: 'refresh',
      });
    });

    it('defaults an unknown or missing reason to populate', () => {
      expect(parsePopulateMessage(JSON.stringify({ url: URL, key: KEY })).reason).toBe('populate');
      expect(parsePopulateMessage(JSON.stringify({ url: URL, key: KEY, reason: 'x' })).reason).toBe('populate');
    });

    it.each([
      'not json',
      'null',
      '42',
      '"a string"',
      '[]',
      '{}',
      JSON.stringify({ url: URL }),
      JSON.stringify({ key: KEY }),
      JSON.stringify({ url: 123, key: KEY }),
      JSON.stringify({ url: URL, key: { $ne: 1 } }),
      JSON.stringify({ url: '', key: KEY }),
    ])('rejects %s without throwing', message => {
      expect(parsePopulateMessage(message)).toBeNull();
    });
  });

  describe('shouldSkipPopulate', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    const maxAge = 3600;
    const fetchedSecondsAgo = s => ({ fetchedAt: new Date(now - s * 1000).toISOString() });

    it('skips a populate for an entry younger than maxAge', () => {
      expect(shouldSkipPopulate({ reason: 'populate' }, fetchedSecondsAgo(60), maxAge, now)).toBe(true);
    });

    it('does not skip a populate for an entry older than maxAge', () => {
      expect(shouldSkipPopulate({ reason: 'populate' }, fetchedSecondsAgo(7200), maxAge, now)).toBe(false);
    });

    it('never skips a populate for an unversioned arXiv URL', () => {
      const job = { reason: 'populate', url: 'https://arxiv.org/pdf/2101.00001' };
      expect(shouldSkipPopulate(job, fetchedSecondsAgo(60), maxAge, now)).toBe(false);
    });

    it('still skips a fresh populate for a versioned arXiv URL', () => {
      const job = { reason: 'populate', url: 'https://arxiv.org/pdf/2101.00001v2' };
      expect(shouldSkipPopulate(job, fetchedSecondsAgo(60), maxAge, now)).toBe(true);
    });

    it('never skips a refresh', () => {
      expect(shouldSkipPopulate({ reason: 'refresh' }, fetchedSecondsAgo(60), maxAge, now)).toBe(false);
    });

    it('does not skip when there is no complete entry', () => {
      expect(shouldSkipPopulate({ reason: 'populate' }, null, maxAge, now)).toBe(false);
    });

    it('does not skip when fetchedAt is unparseable', () => {
      expect(shouldSkipPopulate({ reason: 'populate' }, { fetchedAt: 'garbage' }, maxAge, now)).toBe(false);
    });
  });
});
