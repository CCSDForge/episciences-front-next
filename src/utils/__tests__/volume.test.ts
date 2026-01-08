import { describe, it, expect } from 'vitest';
import { formatVolumeMetadata, formatVolume, VOLUME_TYPE, volumeTypes } from '../volume';
import { RawVolumeMetadata, RawVolume } from '../../types/volume';

describe('volume utilities', () => {
  describe('formatVolumeMetadata', () => {
    it('should format complete volume metadata', () => {
      const metadata: RawVolumeMetadata = {
        file: 'cover.pdf',
        title: { en: 'Cover Page', fr: 'Page de couverture' },
        content: 'PDF content description',
        date_creation: '2024-01-01',
        date_updated: '2024-01-15',
      };

      const result = formatVolumeMetadata(metadata);

      expect(result).toEqual({
        file: 'cover.pdf',
        title: { en: 'Cover Page', fr: 'Page de couverture' },
        content: 'PDF content description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
      });
    });

    it('should handle metadata with minimal fields', () => {
      const metadata: RawVolumeMetadata = {
        file: 'document.pdf',
        title: { en: 'Document' },
        content: '',
        date_creation: '2024-01-01',
        date_updated: '2024-01-01',
      };

      const result = formatVolumeMetadata(metadata);

      expect(result.file).toBe('document.pdf');
      expect(result.title).toEqual({ en: 'Document' });
      expect(result.createdAt).toBe('2024-01-01');
      expect(result.updatedAt).toBe('2024-01-01');
    });

    it('should preserve all metadata fields correctly', () => {
      const metadata: RawVolumeMetadata = {
        file: 'abstract.pdf',
        title: { en: 'Abstract', fr: 'Résumé', es: 'Resumen' },
        content: 'Multi-language abstract',
        date_creation: '2023-12-01',
        date_updated: '2024-02-01',
      };

      const result = formatVolumeMetadata(metadata);

      expect(result.title).toHaveProperty('en');
      expect(result.title).toHaveProperty('fr');
      expect(result.title).toHaveProperty('es');
    });
  });

  describe('formatVolume', () => {
    const baseVolume: RawVolume = {
      vid: 123,
      vol_num: '1',
      titles: { en: 'Volume 1', fr: 'Tome 1' },
      descriptions: { en: 'First volume', fr: 'Premier tome' },
      vol_year: 2024,
      vol_type: VOLUME_TYPE.SPECIAL_ISSUE,
      papers: [],
      metadata: [],
      settings_proceeding: [],
      date_creation: '2024-01-01',
      date_updated: '2024-01-15',
    };

    it('should format complete volume without metadata', () => {
      const result = formatVolume('testjournal', 'en', baseVolume);

      expect(result.id).toBe(123);
      expect(result.num).toBe('1');
      expect(result.title).toEqual({ en: 'Volume 1', fr: 'Tome 1' });
      expect(result.description).toEqual({ en: 'First volume', fr: 'Premier tome' });
      expect(result.year).toBe(2024);
      expect(result.types).toBe(VOLUME_TYPE.SPECIAL_ISSUE);
      expect(result.articles).toEqual([]);
      expect(result.metadatas).toEqual([]);
      expect(result.downloadLink).toBe(
        'https://testjournal.episciences.org/volumes-full/123/123.pdf'
      );
      expect(result.tileImageURL).toBeUndefined();
      expect(result.settingsProceeding).toEqual([]);
    });

    it('should generate correct download link URL', () => {
      const result = formatVolume('epiderminfo', 'en', baseVolume);

      expect(result.downloadLink).toBe(
        'https://epiderminfo.episciences.org/volumes-full/123/123.pdf'
      );
    });

    it('should format volume with metadata but no tile image', () => {
      const volumeWithMetadata: RawVolume = {
        ...baseVolume,
        metadata: [
          {
            file: 'cover.pdf',
            title: { en: 'Cover', fr: 'Couverture' },
            content: 'Cover page',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
        ],
      };

      const result = formatVolume('journal', 'en', volumeWithMetadata);

      expect(result.metadatas).toHaveLength(1);
      expect(result.metadatas[0].file).toBe('cover.pdf');
      expect(result.tileImageURL).toBeUndefined();
    });

    it('should generate tile image URL when tile metadata exists', () => {
      const volumeWithTile: RawVolume = {
        ...baseVolume,
        metadata: [
          {
            file: 'tile.png',
            title: { en: 'tile', fr: 'tile' },
            content: 'Tile image',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
        ],
      };

      const result = formatVolume('journal', 'en', volumeWithTile);

      expect(result.tileImageURL).toBe(
        'https://journal.episciences.org/public/volumes/123/tile.png'
      );
    });

    it('should use language-specific tile title', () => {
      const volumeWithTileFr: RawVolume = {
        ...baseVolume,
        metadata: [
          {
            file: 'tuile.png',
            title: { en: 'cover', fr: 'tile' },
            content: 'Tile in French',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
        ],
      };

      const result = formatVolume('journal', 'fr', volumeWithTileFr);

      expect(result.tileImageURL).toBe(
        'https://journal.episciences.org/public/volumes/123/tuile.png'
      );
    });

    it('should not set tile URL if title does not match "tile"', () => {
      const volumeWithNonTile: RawVolume = {
        ...baseVolume,
        metadata: [
          {
            file: 'cover.png',
            title: { en: 'cover', fr: 'couverture' },
            content: 'Not a tile',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
        ],
      };

      const result = formatVolume('journal', 'en', volumeWithNonTile);

      expect(result.tileImageURL).toBeUndefined();
    });

    it('should handle multiple metadata entries and find tile', () => {
      const volumeWithMultipleMeta: RawVolume = {
        ...baseVolume,
        metadata: [
          {
            file: 'cover.pdf',
            title: { en: 'Cover', fr: 'Couverture' },
            content: 'Cover',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
          {
            file: 'abstract.pdf',
            title: { en: 'Abstract', fr: 'Résumé' },
            content: 'Abstract',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
          {
            file: 'thumbnail.png',
            title: { en: 'tile', fr: 'tile' },
            content: 'Tile',
            date_creation: '2024-01-01',
            date_updated: '2024-01-01',
          },
        ],
      };

      const result = formatVolume('journal', 'en', volumeWithMultipleMeta);

      expect(result.metadatas).toHaveLength(3);
      expect(result.tileImageURL).toBe(
        'https://journal.episciences.org/public/volumes/123/thumbnail.png'
      );
    });

    it('should handle settings proceeding', () => {
      const volumeWithProceedings: RawVolume = {
        ...baseVolume,
        vol_type: VOLUME_TYPE.PROCEEDINGS,
        settings_proceeding: [
          { key: 'conference', value: 'ICML 2024' },
          { key: 'location', value: 'Vienna' },
        ] as any,
      };

      const result = formatVolume('journal', 'en', volumeWithProceedings);

      expect(result.settingsProceeding).toHaveLength(2);
      expect(result.types).toBe(VOLUME_TYPE.PROCEEDINGS);
    });

    it('should handle empty settings proceeding', () => {
      const result = formatVolume('journal', 'en', baseVolume);

      expect(result.settingsProceeding).toEqual([]);
    });

    it('should handle volume with articles', () => {
      const volumeWithArticles: RawVolume = {
        ...baseVolume,
        papers: [1, 2, 3, 4, 5] as any,
      };

      const result = formatVolume('journal', 'en', volumeWithArticles);

      expect(result.articles).toHaveLength(5);
    });

    it('should preserve all original volume properties', () => {
      const result = formatVolume('journal', 'en', baseVolume);

      // Check that original raw properties are preserved
      expect(result).toHaveProperty('vid');
      expect(result).toHaveProperty('vol_num');
      expect(result).toHaveProperty('titles');
      expect(result).toHaveProperty('descriptions');
      expect(result).toHaveProperty('vol_year');
      expect(result).toHaveProperty('vol_type');
      expect(result).toHaveProperty('papers');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('settings_proceeding');
    });
  });

  describe('VOLUME_TYPE enum', () => {
    it('should have correct volume type values', () => {
      expect(VOLUME_TYPE.SPECIAL_ISSUE).toBe('special_issue');
      expect(VOLUME_TYPE.PROCEEDINGS).toBe('proceedings');
    });
  });

  describe('volumeTypes array', () => {
    it('should contain all volume types with labels', () => {
      expect(volumeTypes).toHaveLength(2);

      const specialIssue = volumeTypes.find(vt => vt.value === VOLUME_TYPE.SPECIAL_ISSUE);
      expect(specialIssue).toBeDefined();
      expect(specialIssue?.labelPath).toBe('pages.volumes.types.specialIssues');

      const proceedings = volumeTypes.find(vt => vt.value === VOLUME_TYPE.PROCEEDINGS);
      expect(proceedings).toBeDefined();
      expect(proceedings?.labelPath).toBe('pages.volumes.types.proceedings');
    });

    it('should have correct structure for each volume type', () => {
      volumeTypes.forEach(vt => {
        expect(vt).toHaveProperty('labelPath');
        expect(vt).toHaveProperty('value');
        expect(typeof vt.labelPath).toBe('string');
        expect(typeof vt.value).toBe('string');
      });
    });
  });
});
