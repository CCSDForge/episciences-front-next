import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVolumes, fetchVolume, formatVolume, formatVolumeMetadata, VOLUME_TYPE, volumeTypes } from '../volume';

// Mock dependencies
vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.episciences.org`),
}));

vi.mock('../journal', () => ({
  getJournalCode: vi.fn(() => 'test-journal'),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('volume service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatVolumeMetadata', () => {
    it('should format raw volume metadata correctly', () => {
      const rawMetadata = {
        id: 1,
        titles: { en: 'Test Title', fr: 'Titre Test' },
        content: { en: 'Content EN', fr: 'Contenu FR' },
        file: 'test.pdf',
        date_creation: '2024-01-01',
        date_updated: '2024-01-15',
      };

      const result = formatVolumeMetadata(rawMetadata);

      expect(result).toEqual({
        ...rawMetadata,
        title: { en: 'Test Title', fr: 'Titre Test' },
        content: { en: 'Content EN', fr: 'Contenu FR' },
        file: 'test.pdf',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
      });
    });

    it('should handle metadata with minimal fields', () => {
      const rawMetadata = {
        id: 2,
        titles: {},
      };

      const result = formatVolumeMetadata(rawMetadata);

      expect(result.title).toEqual({});
      expect(result.file).toBeUndefined();
    });
  });

  describe('formatVolume', () => {
    it('should format a complete volume correctly', () => {
      const rawVolume = {
        vid: 123,
        vol_num: '1',
        titles: { en: 'Volume Title', fr: 'Titre Volume' },
        descriptions: { en: 'Description EN', fr: 'Description FR' },
        vol_year: 2024,
        vol_type: ['special_issue'],
        papers: [{ id: 1 }, { id: 2 }],
        metadata: [],
        settings_proceeding: [],
      };

      const result = formatVolume('testjournal', 'en', rawVolume);

      expect(result.id).toBe(123);
      expect(result.num).toBe('1');
      expect(result.title).toEqual({ en: 'Volume Title', fr: 'Titre Volume' });
      expect(result.year).toBe(2024);
      expect(result.types).toEqual(['special_issue']);
      expect(result.articles).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.downloadLink).toBe('https://testjournal.episciences.org/volumes-full/123/123.pdf');
    });

    it('should extract tile image URL from metadata', () => {
      const rawVolume = {
        vid: 456,
        vol_num: '2',
        titles: {},
        descriptions: {},
        vol_year: 2024,
        vol_type: [],
        papers: [],
        metadata: [
          {
            id: 1,
            titles: { en: 'tile', fr: 'tuile' },
            file: 'cover.jpg',
          },
        ],
        settings_proceeding: [],
      };

      const result = formatVolume('myjournal', 'en', rawVolume);

      expect(result.tileImageURL).toBe('https://myjournal.episciences.org/public/volumes/456/cover.jpg');
    });

    it('should not set tile URL if title does not match "tile"', () => {
      const rawVolume = {
        vid: 789,
        vol_num: '3',
        titles: {},
        descriptions: {},
        vol_year: 2024,
        vol_type: [],
        papers: [],
        metadata: [
          {
            id: 1,
            titles: { en: 'Not a tile', fr: 'Pas une tuile' },
            file: 'cover.jpg',
          },
        ],
        settings_proceeding: [],
      };

      const result = formatVolume('myjournal', 'en', rawVolume);

      expect(result.tileImageURL).toBeUndefined();
    });

    it('should handle volume without metadata', () => {
      const rawVolume = {
        vid: 100,
        vol_num: '1',
        titles: {},
        descriptions: {},
        vol_year: 2024,
        vol_type: [],
        papers: [],
      };

      const result = formatVolume('testjournal', 'fr', rawVolume);

      expect(result.metadatas).toEqual([]);
      expect(result.tileImageURL).toBeUndefined();
    });

    it('should handle settings_proceeding correctly', () => {
      const settingsProceeding = [
        { id: 1, title: 'Setting 1' },
        { id: 2, title: 'Setting 2' },
      ];

      const rawVolume = {
        vid: 200,
        vol_num: '1',
        titles: {},
        descriptions: {},
        vol_year: 2024,
        vol_type: [],
        papers: [],
        settings_proceeding: settingsProceeding,
      };

      const result = formatVolume('testjournal', 'fr', rawVolume);

      expect(result.settingsProceeding).toEqual(settingsProceeding);
    });
  });

  describe('fetchVolumes', () => {
    it('should fetch volumes with correct parameters', async () => {
      const mockResponse = {
        'hydra:member': [
          { vid: 1, vol_num: '1', titles: {}, descriptions: {}, vol_year: 2024, vol_type: [], papers: [] },
        ],
        'hydra:totalItems': 1,
        'hydra:totalPublishedArticles': 10,
        'hydra:range': { types: ['special_issue'], years: [2024, 2023] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchVolumes({
        rvcode: 'testjournal',
        language: 'en',
        page: 1,
        itemsPerPage: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('testjournal'),
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
      );
      expect(result.data).toHaveLength(1);
      expect(result.totalItems).toBe(1);
      expect(result.articlesCount).toBe(10);
      expect(result.range?.types).toEqual(['special_issue']);
      expect(result.range?.years).toEqual([2024, 2023]);
    });

    it('should include type and year filters in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'hydra:member': [], 'hydra:totalItems': 0 }),
      });

      await fetchVolumes({
        rvcode: 'testjournal',
        page: 1,
        itemsPerPage: 10,
        types: [VOLUME_TYPE.SPECIAL_ISSUE, VOLUME_TYPE.PROCEEDINGS],
        years: [2024, 2023],
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('type%5B%5D=special_issue');
      expect(calledUrl).toContain('type%5B%5D=proceedings');
      expect(calledUrl).toContain('year%5B%5D=2024');
      expect(calledUrl).toContain('year%5B%5D=2023');
    });

    it('should return empty data on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchVolumes({
        rvcode: 'testjournal',
        page: 1,
        itemsPerPage: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.articlesCount).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchVolumes({
        rvcode: 'testjournal',
        page: 1,
        itemsPerPage: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should handle array response format', async () => {
      const mockResponse = [
        { vid: 1, vol_num: '1', titles: {}, descriptions: {}, vol_year: 2024, vol_type: [], papers: [] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchVolumes({
        rvcode: 'testjournal',
        page: 1,
        itemsPerPage: 10,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should handle hydra:range with alternative field names', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
        'hydra:range': { type: ['special_issue'], year: [2024] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchVolumes({
        rvcode: 'testjournal',
        page: 1,
        itemsPerPage: 10,
      });

      expect(result.range?.types).toEqual(['special_issue']);
      expect(result.range?.years).toEqual([2024]);
    });
  });

  describe('fetchVolume', () => {
    it('should fetch a single volume by id', async () => {
      const mockVolume = {
        vid: 123,
        vol_num: '1',
        titles: { en: 'Test Volume' },
        descriptions: {},
        vol_year: 2024,
        vol_type: [],
        papers: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVolume),
      });

      const result = await fetchVolume('testjournal', 123, 'en');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/volumes/123'),
        expect.any(Object)
      );
      expect(result?.id).toBe(123);
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchVolume('testjournal', 999, 'en');

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should use default language if not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vid: 1, vol_num: '1', titles: {}, descriptions: {}, vol_year: 2024, vol_type: [], papers: [] }),
      });

      await fetchVolume('testjournal', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('language=fr'),
        expect.any(Object)
      );
    });
  });

  describe('VOLUME_TYPE enum', () => {
    it('should have correct values', () => {
      expect(VOLUME_TYPE.SPECIAL_ISSUE).toBe('special_issue');
      expect(VOLUME_TYPE.PROCEEDINGS).toBe('proceedings');
    });
  });

  describe('volumeTypes', () => {
    it('should have correct structure', () => {
      expect(volumeTypes).toHaveLength(2);
      expect(volumeTypes[0]).toHaveProperty('labelPath');
      expect(volumeTypes[0]).toHaveProperty('value');
      expect(volumeTypes.map(t => t.value)).toContain(VOLUME_TYPE.SPECIAL_ISSUE);
      expect(volumeTypes.map(t => t.value)).toContain(VOLUME_TYPE.PROCEEDINGS);
    });
  });
});
