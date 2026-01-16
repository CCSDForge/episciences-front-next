import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getJournalCode, getJournal, fetchJournalWithoutCode, getJournalByCode, fetchJournal } from '../journal';

// Mock dependencies
vi.mock('@/config/api', () => ({
  API_URL: 'https://api.episciences.org',
}));

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.episciences.org`),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('journal service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getJournalCode', () => {
    it('should return the journal code from environment variable', () => {
      process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'testjournal';

      const result = getJournalCode();

      expect(result).toBe('testjournal');
    });

    it('should throw error if environment variable is not set', () => {
      delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

      expect(() => getJournalCode()).toThrow('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
    });
  });

  describe('getJournal', () => {
    it('should fetch journal data using journal code from env', async () => {
      process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'myjournal';

      const mockJournalData = {
        rvid: 123,
        code: 'myjournal',
        name: 'My Journal',
        description: 'A test journal',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJournalData),
      });

      const result = await getJournal();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/journals/myjournal')
      );
      expect(result).toEqual(mockJournalData);
    });

    it('should throw error if fetch fails', async () => {
      process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'badjournal';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getJournal()).rejects.toThrow('Failed to fetch journal with code badjournal');
    });
  });

  describe('fetchJournalWithoutCode', () => {
    it('should return null on error', async () => {
      process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'testjournal';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchJournalWithoutCode();

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should return journal data on success', async () => {
      process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'testjournal';

      const mockJournalData = {
        rvid: 1,
        code: 'testjournal',
        name: 'Test Journal',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJournalData),
      });

      const result = await fetchJournalWithoutCode();

      expect(result).toEqual(mockJournalData);
    });
  });

  describe('getJournalByCode', () => {
    it('should fetch journal by rvcode and transform response', async () => {
      const mockJournalData = {
        rvid: 456,
        code: 'customjournal',
        name: 'Custom Journal',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJournalData),
      });

      const result = await getJournalByCode('customjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/journals/customjournal'),
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
      expect(result.id).toBe(456);
      expect(result.code).toBe('customjournal');
    });

    it('should throw error if response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getJournalByCode('nonexistent')).rejects.toThrow(
        'Failed to fetch journal with code nonexistent'
      );
    });
  });

  describe('fetchJournal', () => {
    it('should fetch journal and return transformed data', async () => {
      const mockJournalData = {
        rvid: 789,
        code: 'anotherjournal',
        name: 'Another Journal',
        settings: { theme: 'dark' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJournalData),
      });

      const result = await fetchJournal('anotherjournal');

      expect(result.id).toBe(789);
      expect(result.code).toBe('anotherjournal');
      expect(result.settings).toEqual({ theme: 'dark' });
    });

    it('should throw and log error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(fetchJournal('badjournal')).rejects.toThrow(
        'Failed to fetch journal with code badjournal'
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use correct API URL based on rvcode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rvid: 1 }),
      });

      await fetchJournal('specificjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.specificjournal.episciences.org'),
        expect.any(Object)
      );
    });
  });
});
