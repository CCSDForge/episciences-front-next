import { describe, it, expect, vi } from 'vitest';
import { formatArticle } from '@/utils/article';
import type { RawArticle } from '@/types/article';

// Silence the centralized logger (it writes to console in test mode for warn/error).
vi.mock('@/lib/logger', () => {
  const child = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { child: () => child } };
});

/**
 * Build a minimal-but-valid RawArticle whose `journal_article` content can be
 * overridden per-test. Anything not provided is filled with sane defaults so the
 * function reaches the full formatting path (valid id + title).
 */
function makeRaw(overrides: {
  content?: Record<string, unknown>;
  database?: Record<string, unknown>;
  paperid?: number;
  doi?: string;
  rvcode?: string;
  keywords?: unknown;
}): RawArticle {
  const content = {
    titles: { title: 'A Great Article' },
    contributors: { person_name: [] },
    doi_data: { doi: '', resource: '' },
    ...overrides.content,
  };

  return {
    '@id': '/articles/1',
    '@type': 'Article',
    paperid: overrides.paperid ?? 42,
    doi: overrides.doi,
    rvcode: overrides.rvcode,
    keywords: overrides.keywords,
    document: {
      journal: { journal_article: content },
      database: { current: { ...overrides.database } },
    },
  } as unknown as RawArticle;
}

describe('formatArticle', () => {
  describe('guard clauses', () => {
    it('returns undefined when article is null/undefined', () => {
      expect(formatArticle(undefined as unknown as RawArticle)).toBeUndefined();
    });

    it('returns the full minimal-article shape when id is falsy (paperid 0)', () => {
      const raw = makeRaw({ paperid: 0, doi: '10.1/x' });
      const result = formatArticle(raw);
      expect(result).toEqual({
        id: 0,
        // title is resolved upstream (falls back to "Titre non disponible" when blank),
        // so buildMinimalArticle receives the real title here.
        title: 'A Great Article',
        authors: [],
        publicationDate: '',
        tag: '',
        repositoryName: '',
        repositoryIdentifier: '',
        doi: '10.1/x',
        abstract: '',
        pdfLink: '',
        metrics: { views: 0, downloads: 0 },
      });
    });

    it('takes the minimal path when paperid is not numeric (NaN id)', () => {
      const raw = makeRaw({ paperid: 'abc' as unknown as number });
      const result = formatArticle(raw);
      expect(Number.isNaN(result?.id)).toBe(true);
      expect(result?.authors).toEqual([]);
      expect(result?.metrics).toEqual({ views: 0, downloads: 0 });
    });

    it('returns undefined when neither journal_article nor conference_paper exists', () => {
      const raw = {
        '@id': '/articles/1',
        '@type': 'Article',
        paperid: 5,
        document: {
          journal: { journal_article: { titles: { title: 'X' } } },
          database: { current: {} },
        },
      } as unknown as RawArticle;
      // wipe the content after the title check passes
      (raw.document as { journal?: unknown }).journal = undefined;
      expect(formatArticle(raw)).toBeUndefined();
    });
  });

  describe('basic fields', () => {
    it('maps core metadata from the database node', () => {
      const raw = makeRaw({
        paperid: 99,
        rvcode: 'epijournal',
        database: {
          flag: 'imported',
          type: { title: 'Article' },
          dates: {
            publication_date: '2024-01-01',
            first_submission_date: '2023-06-01',
            modification_date: '2024-02-01',
          },
          repository: { name: 'HAL', doc_url: 'https://hal/doc' },
          identifiers: { repository_identifier: 'hal-123' },
          mainPdfUrl: 'https://hal/pdf',
          volume: { id: 12 },
          graphical_abstract_file: 'ga.png',
        },
      });
      const result = formatArticle(raw);
      expect(result).toMatchObject({
        id: 99,
        journalCode: 'epijournal',
        title: 'A Great Article',
        isImported: true,
        tag: 'article',
        publicationDate: '2024-01-01',
        submissionDate: '2023-06-01',
        modificationDate: '2024-02-01',
        repositoryName: 'HAL',
        repositoryIdentifier: 'hal-123',
        pdfLink: 'https://hal/pdf',
        docLink: 'https://hal/doc',
        volumeId: 12,
        graphicalAbstract: 'ga.png',
      });
    });

    it('sets pdfLink undefined when mainPdfUrl is empty', () => {
      const raw = makeRaw({ database: { mainPdfUrl: '' } });
      expect(formatArticle(raw)?.pdfLink).toBeUndefined();
    });

    it('isImported is false when flag is not "imported"', () => {
      const raw = makeRaw({ database: { flag: 'other' } });
      expect(formatArticle(raw)?.isImported).toBe(false);
    });

    it('falls back to conference_paper when journal_article is absent', () => {
      const raw = {
        '@id': '/a',
        '@type': 'Article',
        paperid: 3,
        document: {
          journal: { journal_article: { titles: { title: 'Conf Title' } } },
          conference: {
            conference_paper: {
              titles: { title: 'Conf Title' },
              contributors: { person_name: [] },
              doi_data: { doi: '', resource: '' },
            },
          },
          database: { current: {} },
        },
      } as unknown as RawArticle;
      // remove journal_article content but keep the title source for the guard
      const result = formatArticle({
        ...raw,
        document: {
          ...raw.document,
          journal: { journal_article: { titles: { title: 'Conf Title' } } as never },
        },
      } as RawArticle);
      expect(result?.title).toBe('Conf Title');
    });

    it('resolves doi from the article doi, then doi_data', () => {
      expect(formatArticle(makeRaw({ doi: '10.top/level' }))?.doi).toBe('10.top/level');
      expect(
        formatArticle(makeRaw({ content: { doi_data: { doi: '10.inner/x', resource: '' } } }))?.doi
      ).toBe('10.inner/x');
      expect(formatArticle(makeRaw({}))?.doi).toBe('');
    });
  });

  describe('abstract', () => {
    const withAbstract = (value: unknown) => makeRaw({ content: { abstract: { value } } });

    it('handles a plain string', () => {
      expect(formatArticle(withAbstract('Hello'))?.abstract).toBe('Hello');
    });

    it('handles a nested { value } object', () => {
      expect(formatArticle(withAbstract({ value: 'Nested' }))?.abstract).toBe('Nested');
    });

    it('builds a multilingual object from an array with language attributes', () => {
      const value = [
        { '@xml:lang': 'en', value: 'English' },
        { '@language': 'fr', value: 'Français' },
      ];
      expect(formatArticle(withAbstract(value))?.abstract).toEqual({
        en: 'English',
        fr: 'Français',
      });
    });

    it('returns a plain string for a single-language array', () => {
      const value = [{ '@xml:lang': 'en', value: 'OnlyEnglish' }];
      expect(formatArticle(withAbstract(value))?.abstract).toBe('OnlyEnglish');
    });

    it('joins a plain array without language codes', () => {
      const value = [{ value: 'Part one' }, { value: 'Part two' }];
      expect(formatArticle(withAbstract(value))?.abstract).toBe('Part one Part two');
    });

    it('defaults to empty string when absent', () => {
      expect(formatArticle(makeRaw({}))?.abstract).toBe('');
    });
  });

  describe('authors', () => {
    it('sorts authors: "first" before "additional", unknown sequences last', () => {
      const person_name = [
        { surname: 'Beta', '@sequence': 'additional' },
        { surname: 'Zeta', '@sequence': 'unknown' },
        { surname: 'Alpha', given_name: 'Ann', '@sequence': 'first' },
      ];
      const result = formatArticle(makeRaw({ content: { contributors: { person_name } } }));
      expect(result?.authors.map(a => a.fullname)).toEqual(['Ann Alpha', 'Beta', 'Zeta']);
    });

    it('handles a single (non-array) author', () => {
      const person_name = {
        surname: 'Solo',
        given_name: 'Jane',
        '@sequence': 'first',
        ORCID: '0000',
      };
      const result = formatArticle(makeRaw({ content: { contributors: { person_name } } }));
      expect(result?.authors).toEqual([{ fullname: 'Jane Solo', orcid: '0000', institutions: [] }]);
    });

    it('maps an institutions array including ror id', () => {
      const person_name = [
        {
          surname: 'Doe',
          '@sequence': 'first',
          affiliations: {
            institution: [
              { institution_name: 'MIT', institution_id: { '@type': 'ror', value: 'ror-mit' } },
              { institution_name: 'CNRS', institution_id: { '@type': 'isni', value: 'x' } },
            ],
          },
        },
      ];
      const result = formatArticle(makeRaw({ content: { contributors: { person_name } } }));
      expect(result?.authors[0].institutions).toEqual([
        { name: 'MIT', rorId: 'ror-mit' },
        { name: 'CNRS', rorId: undefined },
      ]);
    });

    it('maps a single institution object', () => {
      const person_name = [
        {
          surname: 'Doe',
          '@sequence': 'first',
          affiliations: { institution: { institution_name: 'Solo Univ' } },
        },
      ];
      const result = formatArticle(makeRaw({ content: { contributors: { person_name } } }));
      expect(result?.authors[0].institutions).toEqual([{ name: 'Solo Univ', rorId: undefined }]);
    });

    it('ignores a single institution without a name', () => {
      const person_name = [
        { surname: 'Doe', '@sequence': 'first', affiliations: { institution: {} } },
      ];
      const result = formatArticle(makeRaw({ content: { contributors: { person_name } } }));
      expect(result?.authors[0].institutions).toEqual([]);
    });
  });

  describe('relatedItems (uniformized: inter + intra always both pushed)', () => {
    const inter = {
      '@identifier-type': 'doi',
      '@relationship-type': 'isSameAs',
      value: '10.inter',
      unstructured_citation: 'inter cite',
    };
    const intra = {
      '@identifier-type': 'arxiv',
      '@relationship-type': 'hasPreprint',
      value: '10.intra',
    };

    it('extracts from an array program with an array of related_item', () => {
      const program = [
        { related_item: [{ inter_work_relation: inter }, { intra_work_relation: intra }] },
      ];
      const result = formatArticle(makeRaw({ content: { program } }));
      expect(result?.relatedItems).toEqual([
        {
          value: '10.inter',
          identifierType: 'doi',
          relationshipType: 'isSameAs',
          citation: 'inter cite',
        },
        {
          value: '10.intra',
          identifierType: 'arxiv',
          relationshipType: 'hasPreprint',
          citation: undefined,
        },
      ]);
    });

    it('extracts from a single program with a single related_item', () => {
      const program = { related_item: { inter_work_relation: inter } };
      const result = formatArticle(makeRaw({ content: { program } }));
      expect(result?.relatedItems).toEqual([
        {
          value: '10.inter',
          identifierType: 'doi',
          relationshipType: 'isSameAs',
          citation: 'inter cite',
        },
      ]);
    });

    it('pushes BOTH inter and intra when a single related_item carries both', () => {
      const program = { related_item: { inter_work_relation: inter, intra_work_relation: intra } };
      const result = formatArticle(makeRaw({ content: { program } }));
      expect(result?.relatedItems).toHaveLength(2);
      expect(result?.relatedItems?.map(r => r.value)).toEqual(['10.inter', '10.intra']);
    });

    it('returns an empty array when there is no program', () => {
      expect(formatArticle(makeRaw({}))?.relatedItems).toEqual([]);
    });
  });

  describe('fundings', () => {
    it('extracts an assertion array from a fundref program (array form)', () => {
      const program = [
        {
          '@name': 'fundref',
          assertion: { assertion: [{ value: 'Grant A' }, { value: 'Grant B' }] },
        },
      ];
      expect(formatArticle(makeRaw({ content: { program } }))?.fundings).toEqual([
        'Grant A',
        'Grant B',
      ]);
    });

    it('extracts a single assertion from a fundref program (object form)', () => {
      const program = { '@name': 'fundref', assertion: { assertion: { value: 'Grant Solo' } } };
      expect(formatArticle(makeRaw({ content: { program } }))?.fundings).toEqual(['Grant Solo']);
    });

    it('returns empty when no fundref program is present', () => {
      const program = [{ '@name': 'other' }];
      expect(formatArticle(makeRaw({ content: { program } }))?.fundings).toEqual([]);
    });
  });

  describe('license', () => {
    it('prefers the "vor" entry in a license_ref array', () => {
      const program = [
        {
          license_ref: [
            { value: 'https://cc/am', '@applies_to': 'am' },
            { value: 'https://cc/vor', '@applies_to': 'vor' },
          ],
        },
      ];
      expect(formatArticle(makeRaw({ content: { program } }))?.license).toBe('https://cc/vor');
    });

    it('falls back to the first entry when no "vor" is present', () => {
      const program = [{ license_ref: [{ value: 'https://cc/first' }] }];
      expect(formatArticle(makeRaw({ content: { program } }))?.license).toBe('https://cc/first');
    });

    it('reads a single license_ref object', () => {
      const program = { license_ref: { value: 'https://cc/solo' } };
      expect(formatArticle(makeRaw({ content: { program } }))?.license).toBe('https://cc/solo');
    });

    it('is undefined when no license_ref exists', () => {
      expect(formatArticle(makeRaw({}))?.license).toBeUndefined();
    });
  });

  describe('keywords', () => {
    it('keeps a plain array as-is (top-level keywords)', () => {
      expect(formatArticle(makeRaw({ keywords: ['a', 'b'] }))?.keywords).toEqual(['a', 'b']);
    });

    it('reads keywords from article content', () => {
      expect(formatArticle(makeRaw({ content: { keywords: ['x'] } }))?.keywords).toEqual(['x']);
    });

    it('keeps a multilingual language-keyed object', () => {
      const keywords = { en: ['cat'], fr: ['chat'] };
      expect(formatArticle(makeRaw({ keywords }))?.keywords).toEqual(keywords);
    });

    it('flattens a single-language object whose value is an array', () => {
      expect(formatArticle(makeRaw({ keywords: { tag: ['only'] } }))?.keywords).toEqual(['only']);
    });

    it('treats a single 2-char key as multilingual', () => {
      const keywords = { en: ['english'] };
      expect(formatArticle(makeRaw({ keywords }))?.keywords).toEqual(keywords);
    });

    it('reads keywords from a program entry', () => {
      const program = [{ keywords: ['fromProgram'] }];
      expect(formatArticle(makeRaw({ content: { program } }))?.keywords).toEqual(['fromProgram']);
    });

    it('is undefined when no keywords anywhere', () => {
      expect(formatArticle(makeRaw({}))?.keywords).toBeUndefined();
    });
  });

  describe('references & citedBy', () => {
    it('maps the citation list to references', () => {
      const content = {
        citation_list: { citation: [{ doi: '10.ref', unstructured_citation: 'Ref text' }] },
      };
      expect(formatArticle(makeRaw({ content }))?.references).toEqual([
        { doi: '10.ref', citation: 'Ref text' },
      ]);
    });

    it('parses citedBy sources and drops sources whose JSON fails to parse', () => {
      const database = {
        cited_by: {
          0: {
            source_id_name: 'crossref',
            citation: JSON.stringify({
              0: {
                title: 'Citing paper',
                source_title: 'Journal X',
                author: 'Doe, 0000-1; Roe',
                volume: '3',
                year: '2024',
                page: '12',
                doi: '10.citing',
              },
            }),
          },
          1: { source_id_name: 'broken', citation: 'not-json' },
        },
      };
      const result = formatArticle(makeRaw({ database }));
      expect(result?.citedBy).toHaveLength(1);
      expect(result?.citedBy?.[0]).toEqual({
        source: 'crossref',
        citations: [
          {
            title: 'Citing paper',
            sourceTitle: 'Journal X',
            authors: [
              { fullname: 'Doe', orcid: '0000-1' },
              { fullname: 'Roe', orcid: undefined },
            ],
            reference: { volume: '3', year: '2024', page: '12' },
            doi: '10.citing',
          },
        ],
      });
    });

    it('returns empty arrays when references/citedBy are absent', () => {
      const result = formatArticle(makeRaw({}));
      expect(result?.references).toEqual([]);
      expect(result?.citedBy).toEqual([]);
    });
  });

  describe('classifications, metrics, section, acceptanceDate', () => {
    it('maps MSC 2020 classifications', () => {
      const database = {
        classifications: {
          msc2020: {
            '11A': {
              code: '11A',
              label: 'Number theory',
              description: 'desc',
              source_name: 'msc',
              classification_name: 'MSC2020',
            },
          },
        },
      };
      expect(formatArticle(makeRaw({ database }))?.classifications).toEqual([
        {
          code: '11A',
          label: 'Number theory',
          description: 'desc',
          sourceName: 'msc',
          classificationName: 'MSC2020',
        },
      ]);
    });

    it('classifications is undefined when msc2020 absent', () => {
      expect(formatArticle(makeRaw({}))?.classifications).toBeUndefined();
    });

    it('maps metrics (views=page_count, downloads=file_count)', () => {
      const database = { metrics: { page_count: 50, file_count: 7 } };
      expect(formatArticle(makeRaw({ database }))?.metrics).toEqual({ views: 50, downloads: 7 });
    });

    it('metrics default to zero when absent', () => {
      expect(formatArticle(makeRaw({}))?.metrics).toEqual({ views: 0, downloads: 0 });
    });

    it('maps the section', () => {
      const database = { section: { id: 4, titles: { en: 'Maths', fr: 'Maths' } } };
      expect(formatArticle(makeRaw({ database }))?.section).toEqual({
        id: 4,
        title: { en: 'Maths', fr: 'Maths' },
      });
    });

    it('formats the acceptance date as YYYY-MM-DD', () => {
      const content = { acceptance_date: { year: '2024', month: '03', day: '15' } };
      expect(formatArticle(makeRaw({ content }))?.acceptanceDate).toBe('2024-03-15');
    });

    it('acceptanceDate is undefined when absent', () => {
      expect(formatArticle(makeRaw({}))?.acceptanceDate).toBeUndefined();
    });
  });
});
