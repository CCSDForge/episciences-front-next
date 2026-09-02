import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getJournalBaseUrl, SIGNPOSTING_FORMATS } from '../signposting';
import { METADATA_TYPE } from '../article';

describe('signposting', () => {
  const originalDomain = process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;
  });

  afterEach(() => {
    if (originalDomain !== undefined) {
      process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN = originalDomain;
    } else {
      delete process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN;
    }
  });

  describe('getJournalBaseUrl', () => {
    it('returns baseUrl with default episciences.org domain', () => {
      expect(getJournalBaseUrl('epijinfo')).toBe('https://epijinfo.episciences.org');
    });

    it('uses NEXT_PUBLIC_EPISCIENCES_DOMAIN when set', () => {
      process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN = 'custom.episciences.org';
      expect(getJournalBaseUrl('slovo')).toBe('https://slovo.custom.episciences.org');
    });
  });

  describe('SIGNPOSTING_FORMATS', () => {
    it('includes all supported metadata formats', () => {
      const formats = SIGNPOSTING_FORMATS.map(f => f.format);
      expect(formats).toContain(METADATA_TYPE.TEI);
      expect(formats).toContain(METADATA_TYPE.DC);
      expect(formats).toContain(METADATA_TYPE.CROSSREF);
      expect(formats).toContain(METADATA_TYPE.ZBJATS);
      expect(formats).toContain(METADATA_TYPE.DOAJ);
      expect(formats).toContain(METADATA_TYPE.BIBTEX);
      expect(formats).toContain(METADATA_TYPE.CSL);
      expect(formats).toContain(METADATA_TYPE.OPENAIRE);
      expect(formats).toContain(METADATA_TYPE.JSON);
    });

    it('defines correct profiles for formats with standards', () => {
      const tei = SIGNPOSTING_FORMATS.find(f => f.format === METADATA_TYPE.TEI);
      expect(tei?.profile).toBe('http://www.tei-c.org/ns/1.0');
      expect(tei?.type).toBe('application/xml');

      const dc = SIGNPOSTING_FORMATS.find(f => f.format === METADATA_TYPE.DC);
      expect(dc?.profile).toBe('http://purl.org/dc/elements/1.1/');

      const openaire = SIGNPOSTING_FORMATS.find(f => f.format === METADATA_TYPE.OPENAIRE);
      expect(openaire?.profile).toBe('http://namespace.openaire.eu/schema/oaire/');
    });
  });
});
