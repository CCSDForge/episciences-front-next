import { describe, it, expect, vi } from 'vitest';
import {
  generateBreadcrumbJsonLd as _generateBreadcrumbJsonLd,
  generateCollectionPageJsonLd as _generateCollectionPageJsonLd,
  generateHomepageJsonLd as _generateHomepageJsonLd,
  generateScholarlyArticleJsonLd as _generateScholarlyArticleJsonLd,
  generateWebPageJsonLd as _generateWebPageJsonLd,
  getWebSiteId,
  getPeriodicalId,
  getWebPageId,
  getArticleId,
} from '../schema';
import type { IArticle } from '@/types/article';
import type { IJournal } from '@/types/journal';
import type { IVolume } from '@/types/volume';

const generateBreadcrumbJsonLd = (...args: Parameters<typeof _generateBreadcrumbJsonLd>) =>
  _generateBreadcrumbJsonLd(...args) as any;
const generateCollectionPageJsonLd = (...args: Parameters<typeof _generateCollectionPageJsonLd>) =>
  _generateCollectionPageJsonLd(...args) as any;
const generateHomepageJsonLd = (...args: Parameters<typeof _generateHomepageJsonLd>) =>
  _generateHomepageJsonLd(...args) as any;
const generateScholarlyArticleJsonLd = (...args: Parameters<typeof _generateScholarlyArticleJsonLd>) =>
  _generateScholarlyArticleJsonLd(...args) as any;
const generateWebPageJsonLd = (...args: Parameters<typeof _generateWebPageJsonLd>) =>
  _generateWebPageJsonLd(...args) as any;


vi.mock('@/utils/signposting', () => ({
  getJournalBaseUrl: (id: string) => `https://${id}.episciences.org`,
}));

vi.mock('@/utils/language-utils', () => ({
  getLocalizedPath: (path: string, lang: string) => `/${lang}${path}`,
}));

const BASE = 'https://test-journal.episciences.org';

// --- generateHomepageJsonLd ---

const makeJournal = (overrides: Partial<IJournal> = {}): IJournal => ({
  id: 1,
  name: 'Test Journal',
  code: 'test-journal',
  settings: [],
  title: { en: 'Test Journal', fr: 'Journal de test' } as any,
  ...overrides,
});

describe('generateHomepageJsonLd', () => {
  const graph = (result: ReturnType<typeof generateHomepageJsonLd>) =>
    result['@graph'] as Array<Record<string, unknown>>;

  it('returns @context and @graph', () => {
    const result = generateHomepageJsonLd(makeJournal(), 'test-journal', 'en');
    expect(result['@context']).toBe('https://schema.org');
    expect(Array.isArray(graph(result))).toBe(true);
    expect(graph(result)).toHaveLength(3);
  });

  it('includes Organization for Episciences publisher with stable @id', () => {
    const [org] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe('https://www.episciences.org/#publisher');
    expect(org['name']).toBe('Episciences.org');
  });

  it('includes WebSite with language-agnostic @id', () => {
    const [, website] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect(website['@type']).toBe('WebSite');
    expect(website['@id']).toBe(`${BASE}/#website`);
    expect(website['url']).toBe(`${BASE}/`);
    expect(website['name']).toBe('Test Journal');
  });

  it('WebSite references publisher by @id only', () => {
    const [, website] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect((website['publisher'] as any)['@id']).toBe('https://www.episciences.org/#publisher');
    expect((website['publisher'] as any)['name']).toBeUndefined();
  });

  it('includes Periodical with language-agnostic @id', () => {
    const [,, periodical] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect(periodical['@type']).toBe('Periodical');
    expect(periodical['@id']).toBe(`${BASE}/#periodical`);
    expect(periodical['name']).toBe('Test Journal');
  });

  it('includes issn from journal.issn field', () => {
    const [,, periodical] = graph(
      generateHomepageJsonLd(makeJournal({ issn: '1234-5678' }), 'test-journal', 'en')
    );
    expect(periodical['issn']).toBe('1234-5678');
  });

  it('falls back to ISSN from settings when journal.issn is absent', () => {
    const journal = makeJournal({
      settings: [{ setting: 'ISSN', value: '9876-5432' }],
    });
    const [,, periodical] = graph(generateHomepageJsonLd(journal, 'test-journal', 'en'));
    expect(periodical['issn']).toBe('9876-5432');
  });

  it('returns issn as array when both issn and eissn are present', () => {
    const journal = makeJournal({ issn: '1234-5678', eissn: '8765-4321' });
    const [,, periodical] = graph(generateHomepageJsonLd(journal, 'test-journal', 'en'));
    expect(Array.isArray(periodical['issn'])).toBe(true);
    expect(periodical['issn']).toContain('1234-5678');
    expect(periodical['issn']).toContain('8765-4321');
  });

  it('omits issn field when neither issn nor eissn are present', () => {
    const [,, periodical] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect(periodical['issn']).toBeUndefined();
  });

  it('includes alternateName from subtitle when present', () => {
    const [,, periodical] = graph(
      generateHomepageJsonLd(makeJournal({ subtitle: 'A Subtitle' }), 'test-journal', 'en')
    );
    expect(periodical['alternateName']).toBe('A Subtitle');
  });

  it('omits alternateName when subtitle is absent', () => {
    const [,, periodical] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect(periodical['alternateName']).toBeUndefined();
  });

  it('includes lang-aware publishingPrinciples', () => {
    const [,, periodical] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'fr'));
    const principles = periodical['publishingPrinciples'] as string[];
    expect(principles).toContain(`${BASE}/fr/ethical-charter`);
    expect(principles).toContain(`${BASE}/fr/for-authors`);
  });

  it('Periodical references publisher by @id only', () => {
    const [,, periodical] = graph(generateHomepageJsonLd(makeJournal(), 'test-journal', 'en'));
    expect((periodical['publisher'] as any)['@id']).toBe('https://www.episciences.org/#publisher');
    expect((periodical['publisher'] as any)['name']).toBeUndefined();
  });
});

// --- @id helpers ---

describe('getWebSiteId', () => {
  it('returns a language-agnostic URI', () => {
    expect(getWebSiteId('test-journal')).toBe(`${BASE}/#website`);
  });
});

describe('getPeriodicalId', () => {
  it('returns a language-agnostic URI', () => {
    expect(getPeriodicalId('test-journal')).toBe(`${BASE}/#periodical`);
  });
});

describe('getWebPageId', () => {
  it('includes lang and route', () => {
    expect(getWebPageId('test-journal', 'en', '/about')).toBe(`${BASE}/en/about#webpage`);
  });

  it('handles root route without trailing slash in @id', () => {
    expect(getWebPageId('test-journal', 'en', '/')).toBe(`${BASE}/en#webpage`);
  });

  it('adds leading slash when missing', () => {
    expect(getWebPageId('test-journal', 'fr', 'volumes')).toBe(`${BASE}/fr/volumes#webpage`);
  });
});

describe('getArticleId', () => {
  it('includes lang and articleId', () => {
    expect(getArticleId('test-journal', 'en', '42')).toBe(`${BASE}/en/articles/42#article`);
  });
});

// --- generateBreadcrumbJsonLd ---

describe('generateBreadcrumbJsonLd', () => {
  const parents = [{ path: '/', label: 'Home >' }];

  it('sets @context and @type correctly', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('BreadcrumbList');
  });

  it('sets @id from pathname', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    expect(result['@id']).toBe(`${BASE}/en/volumes#breadcrumb`);
  });

  it('omits @id when pathname is null', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', null);
    expect(result['@id']).toBeUndefined();
  });

  it('assigns sequential 1-based positions', () => {
    const multiParents = [
      { path: '/', label: 'Home >' },
      { path: '/volumes', label: 'Volumes >' },
    ];
    const result = generateBreadcrumbJsonLd(multiParents, 'Vol. 1', 'en', 'test-journal', '/en/volumes/1');
    const items = result['itemListElement'] as Array<{ position: number }>;
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[2].position).toBe(3);
  });

  it('positions remain sequential even when # parents are filtered', () => {
    const withHash = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];
    const result = generateBreadcrumbJsonLd(withHash, 'For Authors', 'en', 'test-journal', '/en/for-authors');
    const items = result['itemListElement'] as Array<{ position: number; name: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
  });

  it('filters out items with path === "#"', () => {
    const withHash = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];
    const result = generateBreadcrumbJsonLd(withHash, 'For Authors', 'en', 'test-journal', '/en/for-authors');
    const items = result['itemListElement'] as Array<{ name: string }>;
    const names = items.map(i => i.name);
    expect(names).not.toContain('Publish >');
    expect(names).not.toContain('Publish');
  });

  it('strips trailing " >" from parent labels', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    const items = result['itemListElement'] as Array<{ name: string }>;
    expect(items[0].name).toBe('Home');
  });

  it('preserves crumbLabel as-is for the last item', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    const items = result['itemListElement'] as Array<{ name: string }>;
    expect(items[items.length - 1].name).toBe('Volumes');
  });

  it('builds the last item URL from pathname', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    const items = result['itemListElement'] as Array<{ item?: string }>;
    expect(items[items.length - 1].item).toBe(`${BASE}/en/volumes`);
  });

  it('omits item URL for last item when pathname is null', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', null);
    const items = result['itemListElement'] as Array<{ item?: string }>;
    expect(items[items.length - 1].item).toBeUndefined();
  });

  it('builds parent item URL using getLocalizedPath for relative paths', () => {
    const result = generateBreadcrumbJsonLd(parents, 'Volumes', 'en', 'test-journal', '/en/volumes');
    const items = result['itemListElement'] as Array<{ item?: string }>;
    expect(items[0].item).toBe(`${BASE}/en/`);
  });

  it('keeps absolute URLs as-is for parent items', () => {
    const absoluteParents = [{ path: 'https://external.org/home', label: 'External >' }];
    const result = generateBreadcrumbJsonLd(absoluteParents, 'Page', 'en', 'test-journal', '/en/page');
    const items = result['itemListElement'] as Array<{ item?: string }>;
    expect(items[0].item).toBe('https://external.org/home');
  });
});

// --- generateScholarlyArticleJsonLd ---

const makeArticle = (overrides: Partial<IArticle> = {}): IArticle => ({
  id: 42,
  title: 'A Great Paper',
  authors: [
    {
      fullname: 'Jane Doe',
      orcid: '0000-0001-2345-6789',
      institutions: [{ name: 'MIT', rorId: '042nb2s44' }],
    },
  ],
  publicationDate: '2024-03-15',
  doi: '10.1234/test',
  repositoryName: 'arXiv',
  repositoryIdentifier: 'arXiv:2401.00001',
  ...overrides,
});

const makeVolume = (overrides: Partial<IVolume> = {}): IVolume => ({
  id: 1,
  num: '3',
  articles: [],
  downloadLink: '',
  ...overrides,
});

describe('generateScholarlyArticleJsonLd', () => {
  it('sets @context, @type, @id and url correctly', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('ScholarlyArticle');
    expect(result['@id']).toBe(`${BASE}/en/articles/42#article`);
    expect(result['url']).toBe(`${BASE}/en/articles/42`);
  });

  it('maps headline from article.title', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    expect(result['headline']).toBe('A Great Paper');
  });

  it('includes string abstract as description', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ abstract: 'Short abstract.' }),
      'test-journal',
      'en'
    );
    expect(result['description']).toBe('Short abstract.');
  });

  it('extracts description from multilingual abstract using lang', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ abstract: { en: 'English abstract', fr: 'Résumé français' } as any }),
      'test-journal',
      'en'
    );
    expect(result['description']).toBe('English abstract');
  });

  it('falls back to first available abstract when lang is missing', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ abstract: { fr: 'Résumé' } as any }),
      'test-journal',
      'en'
    );
    expect(result['description']).toBe('Résumé');
  });

  it('omits description when abstract is absent', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle({ abstract: undefined }), 'test-journal', 'en');
    expect(result['description']).toBeUndefined();
  });

  it('sets datePublished from article.publicationDate', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    expect(result['datePublished']).toBe('2024-03-15');
  });

  it('includes dateModified when present', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ modificationDate: '2024-04-01' }),
      'test-journal',
      'en'
    );
    expect(result['dateModified']).toBe('2024-04-01');
  });

  it('omits dateModified when absent', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle({ modificationDate: undefined }), 'test-journal', 'en');
    expect(result['dateModified']).toBeUndefined();
  });

  it('includes dateCreated from submissionDate when present', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ submissionDate: '2023-11-01' }),
      'test-journal',
      'en'
    );
    expect(result['dateCreated']).toBe('2023-11-01');
  });

  it('includes license when present', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ license: 'https://creativecommons.org/licenses/by/4.0/' }),
      'test-journal',
      'en'
    );
    expect(result['license']).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it('maps authors with fullname', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const authors = result['author'] as Array<{ name: string }>;
    expect(authors[0].name).toBe('Jane Doe');
  });

  it('prefixes bare ORCID with https://orcid.org/', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const authors = result['author'] as Array<{ sameAs?: string }>;
    expect(authors[0].sameAs).toBe('https://orcid.org/0000-0001-2345-6789');
  });

  it('keeps full ORCID URL as-is', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ authors: [{ fullname: 'A', orcid: 'https://orcid.org/0000-0001-2345-6789' }] }),
      'test-journal',
      'en'
    );
    const authors = result['author'] as Array<{ sameAs?: string }>;
    expect(authors[0].sameAs).toBe('https://orcid.org/0000-0001-2345-6789');
  });

  it('omits sameAs on author when orcid is absent', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ authors: [{ fullname: 'B' }] }),
      'test-journal',
      'en'
    );
    const authors = result['author'] as Array<{ sameAs?: string }>;
    expect(authors[0].sameAs).toBeUndefined();
  });

  it('maps institution with prefixed ROR id', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const authors = result['author'] as Array<{ affiliation?: { sameAs?: string } }>;
    expect(authors[0].affiliation?.sameAs).toBe('https://ror.org/042nb2s44');
  });

  it('uses array affiliation when author has multiple institutions', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({
        authors: [{
          fullname: 'C',
          institutions: [{ name: 'MIT' }, { name: 'Harvard' }],
        }],
      }),
      'test-journal',
      'en'
    );
    const authors = result['author'] as Array<{ affiliation?: unknown }>;
    expect(Array.isArray(authors[0].affiliation)).toBe(true);
  });

  it('uses single object affiliation when author has one institution', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const authors = result['author'] as Array<{ affiliation?: unknown }>;
    expect(Array.isArray(authors[0].affiliation)).toBe(false);
    expect(typeof authors[0].affiliation).toBe('object');
  });

  it('prefixes doi with https://doi.org/', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const sameAs = result['sameAs'] as string[];
    expect(sameAs).toContain('https://doi.org/10.1234/test');
  });

  it('keeps full DOI URL as-is', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ doi: 'https://doi.org/10.1234/test' }),
      'test-journal',
      'en'
    );
    const sameAs = result['sameAs'] as string[];
    expect(sameAs).toContain('https://doi.org/10.1234/test');
    expect(sameAs.filter(s => s.startsWith('https://doi.org/')).length).toBe(1);
  });

  it('includes docLink in sameAs', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ docLink: 'https://arxiv.org/abs/2401.00001' }),
      'test-journal',
      'en'
    );
    const sameAs = result['sameAs'] as string[];
    expect(sameAs).toContain('https://arxiv.org/abs/2401.00001');
  });

  it('omits sameAs when doi and docLink are both absent', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ doi: '', docLink: undefined }),
      'test-journal',
      'en'
    );
    expect(result['sameAs']).toBeUndefined();
  });

  it('sets isPartOf to Periodical @id when no volume', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    expect((result['isPartOf'] as any)['@id']).toBe(`${BASE}/#periodical`);
  });

  it('wraps isPartOf in PublicationVolume when volume is provided', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en', makeVolume());
    const isPartOf = result['isPartOf'] as any;
    expect(isPartOf['@type']).toBe('PublicationVolume');
    expect(isPartOf['volumeNumber']).toBe('3');
    expect(isPartOf['isPartOf']['@id']).toBe(`${BASE}/#periodical`);
  });

  it('includes funders when present', () => {
    const result = generateScholarlyArticleJsonLd(
      makeArticle({ fundings: ['ANR', 'ERC'] }),
      'test-journal',
      'en'
    );
    const funder = result['funder'] as Array<{ name: string }>;
    expect(funder).toHaveLength(2);
    expect(funder[0].name).toBe('ANR');
    expect(funder[1].name).toBe('ERC');
  });

  it('omits funder when fundings is absent', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle({ fundings: undefined }), 'test-journal', 'en');
    expect(result['funder']).toBeUndefined();
  });

  it('sets publisher to Episciences.org with stable @id', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle(), 'test-journal', 'en');
    const publisher = result['publisher'] as any;
    expect(publisher['@type']).toBe('Organization');
    expect(publisher['@id']).toBe('https://www.episciences.org/#publisher');
    expect(publisher['name']).toBe('Episciences.org');
  });

  it('handles article with no authors', () => {
    const result = generateScholarlyArticleJsonLd(makeArticle({ authors: [] }), 'test-journal', 'en');
    expect(result['author']).toEqual([]);
  });
});

// --- generateWebPageJsonLd ---

describe('generateWebPageJsonLd', () => {
  it('sets @context, @type, @id and url for WebPage', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'en', '/for-authors');
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('WebPage');
    expect(result['@id']).toBe(`${BASE}/en/for-authors#webpage`);
    expect(result['url']).toBe(`${BASE}/en/for-authors`);
  });

  it('uses AboutPage type when specified', () => {
    const result = generateWebPageJsonLd('AboutPage', 'test-journal', 'en', '/about');
    expect(result['@type']).toBe('AboutPage');
  });

  it('sets inLanguage from lang param', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'fr', '/credits');
    expect(result['inLanguage']).toBe('fr');
  });

  it('references WebSite via isPartOf @id', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'en', '/boards');
    expect((result['isPartOf'] as any)['@id']).toBe(`${BASE}/#website`);
  });

  it('includes name when provided', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'en', '/indexing', {
      name: 'Indexing',
    });
    expect(result['name']).toBe('Indexing');
  });

  it('omits name when not provided', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'en', '/indexing');
    expect(result['name']).toBeUndefined();
  });

  it('includes lastReviewed when provided', () => {
    const result = generateWebPageJsonLd('AboutPage', 'test-journal', 'en', '/about', {
      lastReviewed: '2025-01-15',
    });
    expect(result['lastReviewed']).toBe('2025-01-15');
  });

  it('omits lastReviewed when not provided', () => {
    const result = generateWebPageJsonLd('AboutPage', 'test-journal', 'en', '/about');
    expect(result['lastReviewed']).toBeUndefined();
  });

  it('omits lastReviewed when value is undefined', () => {
    const result = generateWebPageJsonLd('AboutPage', 'test-journal', 'en', '/about', {
      lastReviewed: undefined,
    });
    expect(result['lastReviewed']).toBeUndefined();
  });

  it('adds leading slash to route when missing', () => {
    const result = generateWebPageJsonLd('WebPage', 'test-journal', 'en', 'statistics');
    expect(result['url']).toBe(`${BASE}/en/statistics`);
  });
});

// --- generateCollectionPageJsonLd ---

describe('generateCollectionPageJsonLd', () => {
  it('sets @context, @type, @id and url', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes');
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('CollectionPage');
    expect(result['@id']).toBe(`${BASE}/en/volumes#webpage`);
    expect(result['url']).toBe(`${BASE}/en/volumes`);
  });

  it('sets inLanguage from lang param', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'fr', '/articles');
    expect(result['inLanguage']).toBe('fr');
  });

  it('references WebSite via isPartOf @id', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes');
    expect((result['isPartOf'] as any)['@id']).toBe(`${BASE}/#website`);
  });

  it('includes name when provided', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes', {
      name: 'Volumes',
    });
    expect(result['name']).toBe('Volumes');
  });

  it('omits name when not provided', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes');
    expect(result['name']).toBeUndefined();
  });

  it('includes mainEntity ItemList with numberOfItems when provided', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes', {
      numberOfItems: 42,
    });
    const mainEntity = result['mainEntity'] as any;
    expect(mainEntity['@type']).toBe('ItemList');
    expect(mainEntity['numberOfItems']).toBe(42);
  });

  it('omits mainEntity when numberOfItems is not provided', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/volumes');
    expect(result['mainEntity']).toBeUndefined();
  });

  it('includes mainEntity when numberOfItems is 0', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', '/articles', {
      numberOfItems: 0,
    });
    const mainEntity = result['mainEntity'] as any;
    expect(mainEntity).toBeDefined();
    expect(mainEntity['numberOfItems']).toBe(0);
  });

  it('adds leading slash to route when missing', () => {
    const result = generateCollectionPageJsonLd('test-journal', 'en', 'articles');
    expect(result['url']).toBe(`${BASE}/en/articles`);
  });
});
