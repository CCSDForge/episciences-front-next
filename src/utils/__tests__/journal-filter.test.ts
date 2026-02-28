import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

// vi.hoisted() ensures state is created before vi.mock() factories run.
// We use a getter so journal-filter.ts reads from state.journals each call
// (live binding semantics, no stale captures).
const state = vi.hoisted(() => ({
  journals: [] as string[],
}));

vi.mock('@/config/journals-generated', () => ({
  get journals() {
    return state.journals;
  },
}));

// Default test data covering both prod and preprod scenarios
const DEFAULT_JOURNALS = [
  'journal-a',
  'journal-b',
  'epijinfo',
  'journal-c-preprod',
  'test-preprod-journal',
  'journal-d',
];

import { getFilteredJournals } from '../journal-filter';

// --- Tests ---

describe('getFilteredJournals', () => {
  beforeEach(() => {
    state.journals = [...DEFAULT_JOURNALS];
  });

  afterEach(() => {
    delete process.env.BUILD_ENV;
  });

  describe('prod environment (default)', () => {
    it('returns only non-preprod journals when BUILD_ENV is prod', () => {
      process.env.BUILD_ENV = 'prod';
      expect(getFilteredJournals()).toEqual(['journal-a', 'journal-b', 'journal-d']);
    });

    it('excludes epijinfo in prod mode', () => {
      process.env.BUILD_ENV = 'prod';
      expect(getFilteredJournals()).not.toContain('epijinfo');
    });

    it('excludes all journals containing -preprod in prod mode', () => {
      process.env.BUILD_ENV = 'prod';
      for (const id of getFilteredJournals()) {
        expect(id.includes('-preprod')).toBe(false);
        expect(id).not.toBe('epijinfo');
      }
    });

    it('defaults to prod behavior when BUILD_ENV is not set', () => {
      delete process.env.BUILD_ENV;
      expect(getFilteredJournals()).toEqual(['journal-a', 'journal-b', 'journal-d']);
    });
  });

  describe('preprod environment', () => {
    beforeEach(() => {
      process.env.BUILD_ENV = 'preprod';
    });

    it('returns only preprod journals and epijinfo', () => {
      expect(getFilteredJournals()).toEqual([
        'epijinfo',
        'journal-c-preprod',
        'test-preprod-journal',
      ]);
    });

    it('includes epijinfo', () => {
      expect(getFilteredJournals()).toContain('epijinfo');
    });

    it('includes journals whose ID contains -preprod', () => {
      const result = getFilteredJournals();
      expect(result).toContain('journal-c-preprod');
      expect(result).toContain('test-preprod-journal');
    });

    it('excludes standard (non-preprod) journals', () => {
      const result = getFilteredJournals();
      expect(result).not.toContain('journal-a');
      expect(result).not.toContain('journal-b');
      expect(result).not.toContain('journal-d');
    });
  });

  describe('edge cases', () => {
    it('returns empty array when the journals list is empty', () => {
      state.journals = [];
      expect(getFilteredJournals()).toEqual([]);
    });

    it('returns all journals when all are preprod and BUILD_ENV=preprod', () => {
      state.journals = ['a-preprod', 'b-preprod', 'epijinfo'];
      process.env.BUILD_ENV = 'preprod';
      expect(getFilteredJournals()).toEqual(['a-preprod', 'b-preprod', 'epijinfo']);
    });

    it('returns empty array when all journals are preprod and BUILD_ENV=prod', () => {
      state.journals = ['a-preprod', 'epijinfo'];
      process.env.BUILD_ENV = 'prod';
      expect(getFilteredJournals()).toEqual([]);
    });

    it('returns all journals when none are preprod and BUILD_ENV=prod', () => {
      state.journals = ['journal-x', 'journal-y', 'journal-z'];
      process.env.BUILD_ENV = 'prod';
      expect(getFilteredJournals()).toEqual(['journal-x', 'journal-y', 'journal-z']);
    });

    it('matches -preprod as a substring, not just a suffix', () => {
      state.journals = ['preprod-journal', 'journal-preprod-v2'];
      process.env.BUILD_ENV = 'preprod';
      // both contain '-preprod'? Let's check: 'preprod-journal'.includes('-preprod') = false
      // 'journal-preprod-v2'.includes('-preprod') = true
      expect(getFilteredJournals()).toContain('journal-preprod-v2');
      expect(getFilteredJournals()).not.toContain('preprod-journal');
    });
  });
});
