import { describe, it, expect } from 'vitest';
import { generateArticleMetadata } from '../ArticleMeta';
import type { IArticle } from '@/types/article';
import type { IJournal } from '@/types/journal';
import type { IVolume } from '@/types/volume';

const baseArticle: IArticle = {
  id: 42,
  title: 'Test Article',
  abstract: 'A test abstract',
  authors: [
    { fullname: 'Jane Doe', orcid: '0000-0001-2345-6789', institutions: [{ name: 'MIT' }] },
    { fullname: 'John Smith', orcid: undefined, institutions: [] },
    { fullname: 'Alice Lee', orcid: '0000-0002-9876-5432', institutions: undefined },
  ],
  publicationDate: '2024-03-15',
  doi: '10.1234/test',
  pdfLink: 'https://example.com/article.pdf',
  docLink: 'https://example.com/article',
  repositoryName: 'arXiv',
  repositoryIdentifier: 'arXiv:2403.12345',
  volumeId: 7,
};

const baseJournal: IJournal = {
  id: 1,
  name: 'Journal of Tests',
  code: 'jot',
  settings: [{ setting: 'ISSN', value: '1234-5678' }],
} as unknown as IJournal;

const baseVolume: IVolume = {
  id: 7,
  num: '12',
  articles: [],
  downloadLink: '',
};

describe('generateArticleMetadata', () => {
  describe('citation_publication_date', () => {
    it('should format date as YYYY/MM/DD', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: baseArticle.authors,
      });
      expect((result.other as Record<string, unknown>)['citation_publication_date']).toBe(
        '2024/03/15'
      );
    });

    it('should return empty string when publicationDate is missing', () => {
      const article = { ...baseArticle, publicationDate: '' } as IArticle;
      const result = generateArticleMetadata({
        language: 'en',
        article,
        currentJournal: baseJournal,
        keywords: [],
        authors: [],
      });
      expect((result.other as Record<string, unknown>)['citation_publication_date']).toBe('');
    });
  });

  describe('DC.date', () => {
    it('should format DC.date as YYYY/MM/DD', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: baseArticle.authors,
      });
      expect((result.other as Record<string, unknown>)['DC.date']).toBe('2024/03/15');
    });
  });

  describe('citation_volume', () => {
    it('should include citation_volume when relatedVolume is provided', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: [],
        relatedVolume: baseVolume,
      });
      expect((result.other as Record<string, unknown>)['citation_volume']).toBe('12');
    });

    it('should set citation_volume to empty string when relatedVolume is absent', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: [],
      });
      expect((result.other as Record<string, unknown>)['citation_volume']).toBe('');
    });

    it('should set citation_volume to empty string when relatedVolume is null', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: [],
        relatedVolume: null,
      });
      expect((result.other as Record<string, unknown>)['citation_volume']).toBe('');
    });
  });

  describe('citation_author_institution', () => {
    it('should include institution for authors that have one', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: baseArticle.authors,
      });
      const institutions = (result.other as Record<string, unknown>)[
        'citation_author_institution'
      ] as string[];
      expect(institutions).toContain('MIT');
    });

    it('should not include empty strings for authors without institutions', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: baseArticle.authors,
      });
      const institutions = (result.other as Record<string, unknown>)[
        'citation_author_institution'
      ] as string[];
      expect(institutions.every(i => i.length > 0)).toBe(true);
    });

    it('should return empty array when no author has an institution', () => {
      const authors = [
        { fullname: 'No Affiliation', orcid: undefined, institutions: [] },
      ];
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors,
      });
      expect(
        (result.other as Record<string, unknown>)['citation_author_institution']
      ).toEqual([]);
    });
  });

  describe('citation_author_orcid', () => {
    it('should only include authors that have an ORCID', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: baseArticle,
        currentJournal: baseJournal,
        keywords: [],
        authors: baseArticle.authors,
      });
      const orcids = (result.other as Record<string, unknown>)[
        'citation_author_orcid'
      ] as string[];
      expect(orcids).toEqual(['0000-0001-2345-6789', '0000-0002-9876-5432']);
    });
  });

  describe('missing article', () => {
    it('should return empty metadata fields when article is undefined', () => {
      const result = generateArticleMetadata({
        language: 'en',
        article: undefined,
        currentJournal: baseJournal,
        keywords: [],
        authors: [],
      });
      expect((result.other as Record<string, unknown>)['citation_title']).toBe('');
      expect((result.other as Record<string, unknown>)['citation_publication_date']).toBe('');
      expect((result.other as Record<string, unknown>)['citation_volume']).toBe('');
    });
  });
});
