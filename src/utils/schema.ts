import type { IArticle, IArticleAbstracts, IArticleAuthor } from '@/types/article';
import type { IJournal } from '@/types/journal';
import type { IVolume } from '@/types/volume';
import { getJournalBaseUrl } from './signposting';
import { getLocalizedPath } from './language-utils';

export type SchemaOrgEntity = {
  '@type': string | string[];
  '@id'?: string;
  [key: string]: unknown;
};

export type SchemaOrgThing =
  | ({ '@context': 'https://schema.org'; '@graph': SchemaOrgEntity[] })
  | ({ '@context': 'https://schema.org' } & SchemaOrgEntity);

// --- Stable @id helpers (language-agnostic for journal-level entities) ---

export function getWebSiteId(journalId: string): string {
  return `${getJournalBaseUrl(journalId)}/#website`;
}

export function getPeriodicalId(journalId: string): string {
  return `${getJournalBaseUrl(journalId)}/#periodical`;
}

// WebPage @id includes lang since it is a localised resource
export function getWebPageId(journalId: string, lang: string, route: string): string {
  const cleanRoute = route === '/' ? '' : route.startsWith('/') ? route : `/${route}`;
  return `${getJournalBaseUrl(journalId)}/${lang}${cleanRoute}#webpage`;
}

export function getArticleId(journalId: string, lang: string, articleId: string): string {
  return `${getJournalBaseUrl(journalId)}/${lang}/articles/${articleId}#article`;
}

// --- Homepage (@graph: Organization + WebSite + Periodical) ---

const EPISCIENCES_PUBLISHER: SchemaOrgEntity = {
  '@type': 'Organization',
  '@id': 'https://www.episciences.org/#publisher',
  name: 'Episciences.org',
  url: 'https://www.episciences.org',
};

function getIssnList(journal: IJournal): string[] {
  const issn =
    journal.issn || journal.settings?.find(s => s.setting === 'ISSN')?.value;
  const eissn =
    journal.eissn || journal.settings?.find(s => s.setting === 'EISSN')?.value;
  return [issn, eissn].filter((v): v is string => Boolean(v));
}

export function generateHomepageJsonLd(
  journal: IJournal,
  journalId: string,
  lang: string
): SchemaOrgThing {
  const baseUrl = getJournalBaseUrl(journalId);
  const journalUrl = `${baseUrl}/`;
  const issnList = getIssnList(journal);
  const publisherRef = { '@id': 'https://www.episciences.org/#publisher' };

  const periodical: SchemaOrgEntity = {
    '@type': 'Periodical',
    '@id': getPeriodicalId(journalId),
    name: journal.name,
    ...(journal.subtitle && { alternateName: journal.subtitle }),
    url: journalUrl,
    ...(issnList.length === 1 && { issn: issnList[0] }),
    ...(issnList.length > 1 && { issn: issnList }),
    publisher: publisherRef,
    publishingPrinciples: [
      `${baseUrl}/${lang}/ethical-charter`,
      `${baseUrl}/${lang}/for-authors`,
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      EPISCIENCES_PUBLISHER,
      {
        '@type': 'WebSite',
        '@id': getWebSiteId(journalId),
        url: journalUrl,
        name: journal.name,
        publisher: publisherRef,
      },
      periodical,
    ],
  };
}

// --- ScholarlyArticle ---

function extractAbstract(abstract: string | IArticleAbstracts | undefined, lang: string): string {
  if (!abstract) return '';
  if (typeof abstract === 'string') return abstract;
  return (abstract as Record<string, string>)[lang] || Object.values(abstract)[0] || '';
}

function toAbsoluteUrl(value: string, prefix: string): string {
  return value.startsWith('http') ? value : `${prefix}${value}`;
}

function buildAuthorJsonLd(author: IArticleAuthor): SchemaOrgEntity {
  const person: SchemaOrgEntity = { '@type': 'Person', name: author.fullname };

  if (author.orcid) {
    person.sameAs = toAbsoluteUrl(author.orcid, 'https://orcid.org/');
  }

  if (author.institutions && author.institutions.length > 0) {
    const affiliations = author.institutions.map(inst => ({
      '@type': 'Organization',
      name: inst.name,
      ...(inst.rorId && { sameAs: toAbsoluteUrl(inst.rorId, 'https://ror.org/') }),
    }));
    person.affiliation = affiliations.length === 1 ? affiliations[0] : affiliations;
  }

  return person;
}

export function generateScholarlyArticleJsonLd(
  article: IArticle,
  journalId: string,
  lang: string,
  volume?: IVolume | null
): SchemaOrgThing {
  const baseUrl = getJournalBaseUrl(journalId);
  const articleUrl = `${baseUrl}/${lang}/articles/${article.id}`;
  const abstractStr = extractAbstract(article.abstract, lang);

  const periodicalRef = { '@id': getPeriodicalId(journalId) };
  const isPartOf = volume
    ? { '@type': 'PublicationVolume', volumeNumber: volume.num, isPartOf: periodicalRef }
    : periodicalRef;

  const sameAs = [
    article.doi ? toAbsoluteUrl(article.doi, 'https://doi.org/') : null,
    article.docLink || null,
  ].filter((v): v is string => v !== null && v !== '');

  const funders = (article.fundings ?? []).map(name => ({ '@type': 'Organization', name }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    '@id': getArticleId(journalId, lang, String(article.id)),
    url: articleUrl,
    headline: article.title,
    ...(abstractStr && { description: abstractStr }),
    inLanguage: lang,
    datePublished: article.publicationDate,
    ...(article.modificationDate && { dateModified: article.modificationDate }),
    ...(article.submissionDate && { dateCreated: article.submissionDate }),
    ...(article.license && { license: article.license }),
    author: article.authors.map(buildAuthorJsonLd),
    ...(funders.length > 0 && { funder: funders }),
    isPartOf,
    ...(sameAs.length > 0 && { sameAs }),
    publisher: {
      '@type': 'Organization',
      '@id': 'https://www.episciences.org/#publisher',
      name: 'Episciences.org',
      url: 'https://www.episciences.org',
    },
  };
}

// --- WebPage / AboutPage ---

export function generateWebPageJsonLd(
  type: 'AboutPage' | 'WebPage',
  journalId: string,
  lang: string,
  route: string,
  options?: { name?: string; lastReviewed?: string }
): SchemaOrgThing {
  const baseUrl = getJournalBaseUrl(journalId);
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;

  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': getWebPageId(journalId, lang, route),
    url: `${baseUrl}/${lang}${cleanRoute}`,
    inLanguage: lang,
    ...(options?.name && { name: options.name }),
    ...(options?.lastReviewed && { lastReviewed: options.lastReviewed }),
    isPartOf: { '@id': getWebSiteId(journalId) },
  };
}

// --- CollectionPage ---

export function generateCollectionPageJsonLd(
  journalId: string,
  lang: string,
  route: string,
  options?: { name?: string; numberOfItems?: number }
): SchemaOrgThing {
  const baseUrl = getJournalBaseUrl(journalId);
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': getWebPageId(journalId, lang, route),
    url: `${baseUrl}/${lang}${cleanRoute}`,
    inLanguage: lang,
    ...(options?.name && { name: options.name }),
    isPartOf: { '@id': getWebSiteId(journalId) },
    ...(options?.numberOfItems !== undefined && {
      mainEntity: { '@type': 'ItemList', numberOfItems: options.numberOfItems },
    }),
  };
}

// --- BreadcrumbList ---

export interface BreadcrumbParent {
  path: string;
  label: string;
}

export function generateBreadcrumbJsonLd(
  parents: BreadcrumbParent[],
  crumbLabel: string,
  lang: string,
  journalId: string,
  pathname: string | null
): SchemaOrgThing {
  const baseUrl = getJournalBaseUrl(journalId);

  const parentItems = parents
    .filter(parent => parent.path !== '#')
    .map(parent => ({
      '@type': 'ListItem' as const,
      name: parent.label.replace(/\s*>\s*$/, '').trim(),
      item: parent.path.startsWith('http')
        ? parent.path
        : `${baseUrl}${getLocalizedPath(parent.path, lang)}`,
    }));

  const currentItem = {
    '@type': 'ListItem' as const,
    name: crumbLabel,
    ...(pathname !== null && { item: `${baseUrl}${pathname}` }),
  };

  const itemListElement = [...parentItems, currentItem].map((item, idx) => ({
    ...item,
    position: idx + 1,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    ...(pathname !== null && { '@id': `${baseUrl}${pathname}#breadcrumb` }),
    itemListElement,
  };
}
