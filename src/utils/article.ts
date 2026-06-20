import {
  IArticle,
  IArticleAbstracts,
  IArticleAuthor,
  IArticleCitedBy,
  IArticleCitedByCitation,
  IArticleKeywords,
  IArticleReference,
  IArticleRelatedItem,
  IClassificationItem,
  IInstitution,
  RawArticle,
} from '@/types/article';
import { TFunction } from 'i18next';
import { toastSuccess } from './toast';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'article-utils' });

export interface ICitation {
  key: CITATION_TEMPLATE;
  citation: string;
}

export enum CITATION_TEMPLATE {
  AMS = 'AMS',
  APA = 'APA',
  BIBTEX = 'BibTeX',
  IEEE = 'IEEE',
  MLA = 'MLA',
  VANCOUVER = 'Vancouver',
}

export enum METADATA_TYPE {
  BIBTEX = 'bibtex',
  RIS = 'ris',
  DUBLIN_CORE = 'dublin-core',
  JSON_LD = 'json-ld',
  TEI = 'tei',
  DC = 'dc',
  CROSSREF = 'crossref',
  ZBJATS = 'zbjats',
  DOAJ = 'doaj',
  CSL = 'csl',
  OPENAIRE = 'openaire',
  JSON = 'json',
}

export type FetchedArticle = IArticle | undefined;

// Type étendu pour ajouter le champ docid qui existe dans les réponses de l'API
// mais qui n'est pas officiellement dans le type RawArticle
interface ExtendedRawArticle extends RawArticle {
  docid?: number;
}

/**
 * Content of a paper, regardless of whether it comes from a journal article
 * or a conference paper. Both share the same `IRawArticleContent` shape.
 */
type RawArticleContent = NonNullable<RawArticle['document']['journal']>['journal_article'];
/** `document.database` node holding the runtime/derived metadata (`current`). */
type RawArticleDatabase = RawArticle['document']['database'];
/** A single CrossRef-style work relation (inter or intra). */
type WorkRelation = {
  '@identifier-type': string;
  '@relationship-type': string;
  value: string;
  unstructured_citation?: string;
};
/** A license reference entry as found in `program.license_ref`. */
type LicenseRefEntry = { value: string; '@applies_to'?: string };

/** Normalize a value that the API returns either as a single object or an array. */
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Minimal article returned when the source payload is missing a usable id/title,
 * so callers always receive a renderable object instead of throwing.
 */
function buildMinimalArticle(extendedArticle: ExtendedRawArticle, title: string): IArticle {
  return {
    id: Number(extendedArticle.paperid),
    title: title || 'Article sans titre',
    authors: [],
    publicationDate: '',
    tag: '',
    repositoryName: '',
    repositoryIdentifier: '',
    doi: extendedArticle.doi || '',
    abstract: '',
    pdfLink: '',
    metrics: { views: 0, downloads: 0 },
  };
}

type AbstractValue = NonNullable<RawArticleContent['abstract']>['value'];
type AbstractArray = Extract<AbstractValue, unknown[]>;

/** Build an abstract from a multilingual/plain array of abstract entries. */
function extractAbstractFromArray(values: AbstractArray): string | IArticleAbstracts {
  const join = (): string =>
    values.map(item => (typeof item === 'string' ? item : item.value)).join(' ');

  const hasLanguageAttribute = values.some(
    item =>
      typeof item === 'object' && item !== null && ('@xml:lang' in item || '@language' in item)
  );
  if (!hasLanguageAttribute) return join();

  const abstractsObj: Record<string, string> = {};
  values.forEach(item => {
    if (typeof item === 'object' && item !== null && 'value' in item) {
      // Support both @xml:lang (Zenodo) and @language attributes
      const lang = item['@xml:lang'] || item['@language'];
      if (lang && item.value) abstractsObj[lang] = item.value;
    }
  });

  const languages = Object.keys(abstractsObj);
  if (languages.length > 1) return abstractsObj as IArticleAbstracts;
  if (languages.length === 1) return abstractsObj[languages[0]];
  return join();
}

/** Extract the abstract as a plain string or a multilingual object. */
function extractAbstract(articleContent: RawArticleContent): string | IArticleAbstracts {
  const value = articleContent.abstract?.value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return extractAbstractFromArray(value);
  if (typeof (value as { value?: unknown })?.value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
}

/** Extract the bibliographic references list. */
function extractReferences(articleContent: RawArticleContent): IArticleReference[] {
  const citations = articleContent.citation_list?.citation;
  if (!citations) return [];
  return citations.map(c => ({ doi: c.doi, citation: c.unstructured_citation }));
}

/** Parse a single "cited by" citation record into our domain shape. */
function parseCitedByCitation(raw: unknown): IArticleCitedByCitation {
  const citation = raw as Record<string, string>;
  const authors = citation.author?.split(';') || [];
  return {
    title: citation.title || '',
    sourceTitle: citation.source_title || '',
    authors: authors.map(author => ({
      fullname: author.split(',')[0]?.trim() || '',
      orcid: author.split(',')[1]?.trim() || undefined,
    })),
    reference: {
      volume: citation.volume || '',
      year: citation.year || '',
      page: citation.page || '',
    },
    doi: citation.doi || '',
  };
}

/** Extract "cited by" sources, dropping any source whose citations failed to parse. */
function extractCitedBy(articleDB: RawArticleDatabase | undefined): IArticleCitedBy[] {
  const citedBy = articleDB?.current?.cited_by;
  if (!citedBy) return [];

  return Object.values(citedBy)
    .map(cb => {
      try {
        const parsed = JSON.parse(cb.citation as unknown as string);
        return {
          source: cb.source_id_name,
          citations: Object.values(parsed).map(parseCitedByCitation),
        };
      } catch (parseError) {
        log.error('[formatArticle] Error parsing citedBy citation:', parseError);
        return { source: cb.source_id_name, citations: [] };
      }
    })
    .filter(cb => cb.citations.length > 0);
}

/** Format the acceptance date as `YYYY-MM-DD`, or undefined when absent. */
function extractAcceptanceDate(articleContent: RawArticleContent): string | undefined {
  const date = articleContent.acceptance_date;
  if (!date) return undefined;
  return `${date.year}-${date.month}-${date.day}`;
}

type PersonName = Extract<RawArticleContent['contributors']['person_name'], unknown[]>[number];
type Affiliations = PersonName['affiliations'];

/** Map an author's affiliations into the domain institution list. */
function extractInstitutions(affiliations: Affiliations): IInstitution[] {
  const institution = affiliations?.institution;
  if (!institution) return [];

  const toInstitution = (inst: NonNullable<Affiliations>['institution']) => {
    const single = inst as Exclude<typeof inst, unknown[]>;
    return {
      name: single!.institution_name,
      rorId: single!.institution_id?.['@type'] === 'ror' ? single!.institution_id.value : undefined,
    };
  };

  if (Array.isArray(institution)) return institution.map(toInstitution);
  // Single institution: preserve original behavior of requiring a name.
  return institution.institution_name ? [toInstitution(institution)] : [];
}

/** Map a single contributor record into the domain author shape. */
function mapPersonToAuthor(person: PersonName): IArticleAuthor {
  const fullname = person.given_name
    ? `${person.given_name} ${person.surname}`.trim()
    : person.surname.trim();
  return { fullname, orcid: person.ORCID, institutions: extractInstitutions(person.affiliations) };
}

/** Extract authors, sorted so "first" contributors precede "additional" ones. */
function extractAuthors(articleContent: RawArticleContent): IArticleAuthor[] {
  const personName = articleContent.contributors?.person_name;
  if (Array.isArray(personName)) {
    const order: Record<string, number> = { first: 1, additional: 2 };
    return [...personName]
      .sort((a, b) => (order[a['@sequence']] ?? 999) - (order[b['@sequence']] ?? 999))
      .map(mapPersonToAuthor);
  }
  return personName ? [mapPersonToAuthor(personName)] : [];
}

/** Push a related item built from a work relation, if the relation exists. */
function addRelation(items: IArticleRelatedItem[], relation: WorkRelation | undefined): void {
  if (!relation) return;
  items.push({
    value: relation.value,
    identifierType: relation['@identifier-type'],
    relationshipType: relation['@relationship-type'],
    citation: relation.unstructured_citation,
  });
}

/** Extract related items across all program/related_item shapes (object or array). */
function extractRelatedItems(articleContent: RawArticleContent): IArticleRelatedItem[] {
  const items: IArticleRelatedItem[] = [];
  toArray(articleContent.program).forEach(prog => {
    toArray(prog?.related_item).forEach(item => {
      addRelation(items, item?.inter_work_relation);
      addRelation(items, item?.intra_work_relation);
    });
  });
  return items;
}

/** Extract funding statements from the `fundref` program block. */
function extractFundings(articleContent: RawArticleContent): string[] {
  const program = articleContent.program;
  const fundref = Array.isArray(program)
    ? program.find(p => p['@name'] === 'fundref')
    : program?.['@name'] === 'fundref'
      ? program
      : undefined;

  const assertion = fundref?.assertion?.assertion;
  if (Array.isArray(assertion)) return assertion.map(a => a.value);
  return assertion?.value ? [assertion.value] : [];
}

/** Pick the license URL from a license_ref, preferring the "vor" (version of record) entry. */
function extractLicenseValue(
  licenseRef: LicenseRefEntry | LicenseRefEntry[] | undefined
): string | undefined {
  if (!licenseRef) return undefined;
  if (Array.isArray(licenseRef)) {
    const vor = licenseRef.find(l => l['@applies_to'] === 'vor');
    return (vor || licenseRef[0])?.value;
  }
  return licenseRef.value;
}

/** Extract the article license URL from the program block. */
function extractLicense(articleContent: RawArticleContent): string | undefined {
  const program = articleContent.program;
  if (Array.isArray(program)) {
    return extractLicenseValue(program.find(p => p.license_ref)?.license_ref);
  }
  return extractLicenseValue(program?.license_ref);
}

/** Find a program entry that carries keywords (handles object/array program). */
function findKeywordProgram(
  program: RawArticleContent['program']
): { keywords?: unknown; '@language'?: string } | undefined {
  if (Array.isArray(program)) {
    return program.find(
      p => p && typeof p === 'object' && 'keywords' in p && !!(p as { keywords?: unknown }).keywords
    ) as { keywords?: unknown } | undefined;
  }
  const single = program as { keywords?: unknown } | undefined;
  return single?.keywords ? single : undefined;
}

/** Locate raw keywords from the various places the API may expose them. */
function findRawKeywords(
  extendedArticle: ExtendedRawArticle,
  articleContent: RawArticleContent
): unknown {
  if (extendedArticle.keywords) return extendedArticle.keywords;
  if (articleContent.keywords) return articleContent.keywords;
  return findKeywordProgram(articleContent.program)?.keywords;
}

/** Normalize a keyword object: keep it language-keyed when multilingual, else flatten. */
function structureKeywordObject(obj: Record<string, unknown>): string[] | IArticleKeywords {
  const keys = Object.keys(obj);
  // 2-char keys (e.g. "en", "fr") indicate a language-keyed object.
  const isMultilingual = keys.length > 1 || (keys.length === 1 && keys.some(k => k.length === 2));
  if (isMultilingual) return obj as IArticleKeywords;
  if (keys.length === 1 && Array.isArray(obj[keys[0]])) return obj[keys[0]] as string[];
  return obj as IArticleKeywords;
}

/** Extract keywords as a flat array or a language-keyed object. */
function extractKeywords(
  extendedArticle: ExtendedRawArticle,
  articleContent: RawArticleContent
): string[] | IArticleKeywords | undefined {
  const rawKeywords = findRawKeywords(extendedArticle, articleContent);
  if (!rawKeywords) return undefined;
  if (Array.isArray(rawKeywords)) return rawKeywords;
  if (typeof rawKeywords === 'object')
    return structureKeywordObject(rawKeywords as Record<string, unknown>);
  return undefined;
}

/** Extract MSC 2020 classifications. */
function extractClassifications(
  articleDB: RawArticleDatabase | undefined
): IClassificationItem[] | undefined {
  const msc2020 = articleDB?.current?.classifications?.msc2020;
  if (!msc2020) return undefined;
  const items = Object.values(msc2020);
  if (items.length === 0) return undefined;
  return items.map(item => ({
    code: item.code,
    label: item.label,
    description: item.description,
    sourceName: item.source_name,
    classificationName: item.classification_name,
  }));
}

/** Extract view/download metrics, defaulting to zero. */
function extractMetrics(articleDB: RawArticleDatabase | undefined): {
  views: number;
  downloads: number;
} {
  const metrics = articleDB?.current?.metrics;
  if (!metrics) return { views: 0, downloads: 0 };
  return { views: metrics.page_count, downloads: metrics.file_count };
}

/** Extract the journal section (id + localized titles). */
function extractSection(articleDB: RawArticleDatabase | undefined) {
  const section = articleDB?.current?.section;
  if (!section) return undefined;
  return { id: section.id, title: section.titles };
}

export function formatArticle(article: RawArticle): FetchedArticle {
  if (!article) {
    log.error('formatArticle: article is undefined');
    return undefined;
  }

  const extendedArticle = article as ExtendedRawArticle;

  try {
    const id = Number(extendedArticle.paperid);
    const title =
      extendedArticle.document?.journal?.journal_article?.titles?.title || 'Titre non disponible';

    // Guard against payloads missing a usable id/title: return a minimal article.
    if (!title || !id) return buildMinimalArticle(extendedArticle, title);

    const articleDB = extendedArticle.document?.database;
    const articleContent =
      extendedArticle.document?.journal?.journal_article ??
      extendedArticle.document?.conference?.conference_paper;

    if (!articleContent) return undefined;

    return {
      id,
      journalCode: extendedArticle.rvcode,
      title: articleContent.titles?.title,
      abstract: extractAbstract(articleContent),
      graphicalAbstract: articleDB?.current?.graphical_abstract_file,
      authors: extractAuthors(articleContent),
      publicationDate: articleDB?.current?.dates?.publication_date,
      acceptanceDate: extractAcceptanceDate(articleContent),
      submissionDate: articleDB?.current?.dates?.first_submission_date,
      modificationDate: articleDB?.current?.dates?.modification_date,
      isImported: articleDB?.current?.flag === 'imported',
      tag: articleDB?.current?.type?.title?.toLowerCase(),
      repositoryName: articleDB?.current?.repository?.name,
      repositoryIdentifier: articleDB?.current?.identifiers?.repository_identifier,
      pdfLink: articleDB?.current?.mainPdfUrl?.length ? articleDB?.current?.mainPdfUrl : undefined,
      docLink: articleDB?.current?.repository?.doc_url,
      keywords: extractKeywords(extendedArticle, articleContent),
      classifications: extractClassifications(articleDB),
      doi: extendedArticle.doi || articleContent.doi_data?.doi || '',
      volumeId: articleDB?.current?.volume?.id,
      section: extractSection(articleDB),
      references: extractReferences(articleContent),
      citedBy: extractCitedBy(articleDB),
      relatedItems: extractRelatedItems(articleContent),
      fundings: extractFundings(articleContent),
      license: extractLicense(articleContent),
      metrics: extractMetrics(articleDB),
    };
  } catch (error) {
    log.error('Error formatting article:', error);
    return undefined;
  }
}

export const copyToClipboardCitation = (
  citation: ICitation,
  t: TFunction<'translation', undefined>
): void => {
  navigator.clipboard.writeText(citation.citation);
  toastSuccess(t('common.citeSuccess', { template: citation.key }));
};

/**
 * Maps a license URL to its i18n path segments.
 * Returns { parent, key } where parent is a dot-separated path safe for t(),
 * and key is the final segment (may contain dots like "generic4.0").
 * Returns null if the URL doesn't match any known license pattern.
 */
export function getLicenseLabelInfo(licenseUrl: string): { parent: string; key: string } | null {
  if (!licenseUrl) return null;

  const CC_TYPE_MAP: Record<string, string> = {
    by: 'generic',
    'by-nc': 'nonCommercial',
    'by-nd': 'noDerivatives',
    'by-sa': 'shareAlike',
    'by-nc-nd': 'noDerivativesNonCommercial',
    'by-nc-sa': 'nonCommercialShareAlike',
    'by-nd-nc': 'noDerivativesNonCommercial',
  };

  // Creative Commons licenses: https://creativecommons.org/licenses/{type}/{version}/
  const ccMatch = licenseUrl.match(/creativecommons\.org\/licenses\/([\w-]+)\/([\d.]+)/);
  if (ccMatch) {
    const typeKey = CC_TYPE_MAP[ccMatch[1]];
    if (typeKey) {
      return {
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: `${typeKey}${ccMatch[2]}`,
      };
    }
  }

  // CC0: https://creativecommons.org/publicdomain/zero/{version}/
  const cc0Match = licenseUrl.match(/creativecommons\.org\/publicdomain\/zero\/([\d.]+)/);
  if (cc0Match) {
    return { parent: 'pages.articleDetails.licenses.creativeCommons', key: `zero${cc0Match[1]}` };
  }

  // arXiv licenses
  if (licenseUrl.includes('arxiv.org/licenses/assumed')) {
    return { parent: 'pages.articleDetails.licenses.arxiv', key: 'assumed' };
  }
  if (licenseUrl.includes('arxiv.org/licenses/nonexclusive-distrib')) {
    return { parent: 'pages.articleDetails.licenses.arxiv', key: 'nonExclusive' };
  }

  return null;
}

export const getMetadataTypes = (): { type: METADATA_TYPE; label: string }[] => [
  { type: METADATA_TYPE.TEI, label: 'TEI' },
  { type: METADATA_TYPE.DC, label: 'Dublin Core' },
  { type: METADATA_TYPE.CROSSREF, label: 'Crossref' },
  { type: METADATA_TYPE.ZBJATS, label: 'ZB Jats' },
  { type: METADATA_TYPE.DOAJ, label: 'DOAJ' },
  { type: METADATA_TYPE.BIBTEX, label: 'BibTeX' },
  { type: METADATA_TYPE.CSL, label: 'CSL' },
  { type: METADATA_TYPE.OPENAIRE, label: 'OpenAire' },
  { type: METADATA_TYPE.JSON, label: 'JSON' },
];

export enum ARTICLE_TYPE {
  ARTICLE = 'article',
  BOOK = 'book',
  BOOK_PART = 'bookpart',
  CONFERENCE = 'conferenceobject',
  LECTURE = 'lecture',
  OTHER = 'other',
  PRE_PRINT = 'preprint',
  REPORT = 'report',
  SOFTWARE = 'software',
}

export const articleTypes: { labelPath: string; value: string }[] = [
  { labelPath: 'pages.articles.types.article', value: ARTICLE_TYPE.ARTICLE },
  { labelPath: 'pages.articles.types.book', value: ARTICLE_TYPE.BOOK },
  { labelPath: 'pages.articles.types.bookpart', value: ARTICLE_TYPE.BOOK_PART },
  { labelPath: 'pages.articles.types.conference', value: ARTICLE_TYPE.CONFERENCE },
  { labelPath: 'pages.articles.types.lecture', value: ARTICLE_TYPE.LECTURE },
  { labelPath: 'pages.articles.types.other', value: ARTICLE_TYPE.OTHER },
  { labelPath: 'pages.articles.types.preprint', value: ARTICLE_TYPE.PRE_PRINT },
  { labelPath: 'pages.articles.types.report', value: ARTICLE_TYPE.REPORT },
  { labelPath: 'pages.articles.types.software', value: ARTICLE_TYPE.SOFTWARE },
];

export function getArticleTypeLabel(tag: string | undefined): string {
  if (!tag) return '';
  return articleTypes.find(type => type.value === tag)?.labelPath ?? '';
}

export const getCitations = async (csl?: string): Promise<ICitation[]> => {
  if (!csl || csl.trim() === '') {
    return [];
  }

  try {
    // Dynamically import citation-js only when needed (client-side)
    const citationModule = await import('citation-js');

    // Try different ways to access Cite - check if it's a valid constructor
    const Cite = citationModule.Cite || citationModule.default || citationModule;

    if (typeof Cite !== 'function') {
      log.error('[getCitations] citation-js module loaded incorrectly:', citationModule);
      throw new Error('Failed to load citation-js Cite constructor');
    }

    // Register plugins
    await import('@citation-js/plugin-csl');

    // Register custom CSL templates (IEEE and AMS are not bundled in plugin-csl)
    const [{ AMS_CSL, IEEE_CSL }, coreModule] = await Promise.all([
      import('@/config/csl-styles'),
      import('@citation-js/core') as Promise<any>,
    ]);
    const cslTemplates = coreModule.plugins?.config?.get('@csl')?.templates;
    if (cslTemplates) {
      if (!cslTemplates.has('ams')) cslTemplates.add('ams', AMS_CSL);
      if (!cslTemplates.has('ieee')) cslTemplates.add('ieee', IEEE_CSL);
    }

    // Parse CSL data - it might be a JSON string, so try to parse it
    let cslData = csl;
    try {
      cslData = JSON.parse(csl);
    } catch (parseError) {
      // If not JSON, use as is (already a string or object)
    }

    const cite = new Cite(cslData);
    const format = (template: string) =>
      cite.format('bibliography', { format: 'text', template, lang: 'en-US' });

    return [
      { key: CITATION_TEMPLATE.AMS, citation: format('ams') },
      { key: CITATION_TEMPLATE.APA, citation: format('apa') },
      { key: CITATION_TEMPLATE.BIBTEX, citation: '' }, // Empty initially, will be filled from metadataBibTeX API response
      { key: CITATION_TEMPLATE.IEEE, citation: format('ieee') },
      { key: CITATION_TEMPLATE.MLA, citation: format('mla') },
      { key: CITATION_TEMPLATE.VANCOUVER, citation: format('vancouver') },
    ];
  } catch (error) {
    log.error('[getCitations] Error formatting citations:', error);
    return [];
  }
};

export enum LINKED_PUBLICATION_IDENTIFIER_TYPE {
  URI = 'uri',
  ARXIV = 'arxiv',
  HAL = 'hal',
  DOI = 'doi',
  OTHER = 'other',
}

export enum INTER_WORK_RELATIONSHIP {
  IS_SAME_AS = 'isSameAs',
  HAS_PREPRINT = 'hasPreprint',
  IS_DERIVED_FROM = 'isDerivedFrom',
  HAS_DERIVATION = 'hasDerivation',
  IS_REVIEW_OF = 'isReviewOf',
  HAS_REVIEW = 'hasReview',
  IS_COMMENT_ON = 'isCommentOn',
  HAS_COMMENT = 'hasComment',
  IS_REPLY_TO = 'isReplyTo',
  HAS_REPLY = 'hasReply',
  BASED_ON_DATA = 'basedOnData',
  IS_DATA_BASIS_FOR = 'isDataBasisFor',
  HAS_RELATED_MATERIAL = 'hasRelatedMaterial',
  IS_RELATED_MATERIAL = 'isRelatedMaterial',
  IS_COMPILED_BY = 'isCompiledBy',
  COMPILES = 'compiles',
  IS_DOCUMENTED_BY = 'isDocumentedBy',
  DOCUMENTS = 'documents',
  IS_SUPPLEMENT_TO = 'isSupplementTo',
  IS_SUPPLEMENTED_BY = 'isSupplementedBy',
  IS_CONTINUED_BY = 'isContinuedBy',
  CONTINUES = 'continues',
  IS_PART_OF = 'isPartOf',
  HAS_PART = 'hasPart',
  REFERENCES = 'references',
  IS_REFERENCED_BY = 'isReferencedBy',
  IS_BASED_ON = 'isBasedOn',
  IS_BASIS_FOR = 'isBasisFor',
  REQUIRES = 'requires',
  IS_REQUIRED_BY = 'isRequiredBy',
  FINANCES = 'finances',
  IS_FINANCED_BY = 'isFinancedBy',
  IS_VERSION_OF = 'isVersionOf',
  IS_RELATED_TO = 'isRelatedTo',
}

export const interworkRelationShipTypes: any[] = [
  {
    value: INTER_WORK_RELATIONSHIP.IS_SAME_AS,
    labelPath: 'pages.articleDetails.relationships.isSameAs',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_PREPRINT,
    labelPath: 'pages.articleDetails.relationships.hasPreprint',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_DERIVED_FROM,
    labelPath: 'pages.articleDetails.relationships.isDerivedFrom',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_DERIVATION,
    labelPath: 'pages.articleDetails.relationships.hasDerivation',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_REVIEW_OF,
    labelPath: 'pages.articleDetails.relationships.isReviewOf',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_REVIEW,
    labelPath: 'pages.articleDetails.relationships.hasReview',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_COMMENT_ON,
    labelPath: 'pages.articleDetails.relationships.isCommentOn',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_COMMENT,
    labelPath: 'pages.articleDetails.relationships.hasComment',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_REPLY_TO,
    labelPath: 'pages.articleDetails.relationships.isReplyTo',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_REPLY,
    labelPath: 'pages.articleDetails.relationships.hasReply',
  },
  {
    value: INTER_WORK_RELATIONSHIP.BASED_ON_DATA,
    labelPath: 'pages.articleDetails.relationships.basedOnData',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_DATA_BASIS_FOR,
    labelPath: 'pages.articleDetails.relationships.isDataBasisFor',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_RELATED_MATERIAL,
    labelPath: 'pages.articleDetails.relationships.hasRelatedMaterial',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_RELATED_MATERIAL,
    labelPath: 'pages.articleDetails.relationships.isRelatedMaterial',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_COMPILED_BY,
    labelPath: 'pages.articleDetails.relationships.isCompiledBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.COMPILES,
    labelPath: 'pages.articleDetails.relationships.compiles',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_DOCUMENTED_BY,
    labelPath: 'pages.articleDetails.relationships.isDocumentedBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.DOCUMENTS,
    labelPath: 'pages.articleDetails.relationships.documents',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENT_TO,
    labelPath: 'pages.articleDetails.relationships.isSupplementTo',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENTED_BY,
    labelPath: 'pages.articleDetails.relationships.isSupplementedBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_CONTINUED_BY,
    labelPath: 'pages.articleDetails.relationships.isContinuedBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.CONTINUES,
    labelPath: 'pages.articleDetails.relationships.continues',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_PART_OF,
    labelPath: 'pages.articleDetails.relationships.isPartOf',
  },
  {
    value: INTER_WORK_RELATIONSHIP.HAS_PART,
    labelPath: 'pages.articleDetails.relationships.hasPart',
  },
  {
    value: INTER_WORK_RELATIONSHIP.REFERENCES,
    labelPath: 'pages.articleDetails.relationships.references',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_REFERENCED_BY,
    labelPath: 'pages.articleDetails.relationships.isReferencedBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_BASED_ON,
    labelPath: 'pages.articleDetails.relationships.isBasedOn',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_BASIS_FOR,
    labelPath: 'pages.articleDetails.relationships.isBasisFor',
  },
  {
    value: INTER_WORK_RELATIONSHIP.REQUIRES,
    labelPath: 'pages.articleDetails.relationships.requires',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_REQUIRED_BY,
    labelPath: 'pages.articleDetails.relationships.isRequiredBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.FINANCES,
    labelPath: 'pages.articleDetails.relationships.finances',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_FINANCED_BY,
    labelPath: 'pages.articleDetails.relationships.isFinancedBy',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_VERSION_OF,
    labelPath: 'pages.articleDetails.relationships.isVersionOf',
  },
  {
    value: INTER_WORK_RELATIONSHIP.IS_RELATED_TO,
    labelPath: 'pages.articleDetails.relationships.isRelatedTo',
  },
];

export const truncatedArticleAuthorsName = (article: FetchedArticle): string => {
  if (!article) return '';

  if (!article.authors || !Array.isArray(article.authors) || article.authors.length === 0) {
    return '';
  }

  const MAX_AUTHORS = 3;

  try {
    const authorNames = article.authors.map(author => author.fullname);

    if (authorNames.length === 0) {
      return '';
    }

    if (authorNames.length <= MAX_AUTHORS) {
      return authorNames.join(', ');
    }

    const truncatedAuthors = authorNames.slice(0, MAX_AUTHORS);
    return `${truncatedAuthors.join(', ')} et al.`;
  } catch (error) {
    log.error('Error formatting authors:', error);
    return '';
  }
};

/**
 * Extract text from abstract which can be either a string or a multilingual object
 * @param abstract - The abstract data (string or object with language keys)
 * @param preferredLanguage - Preferred language code to extract (defaults to 'en')
 * @returns The abstract text as a string, or empty string if not found
 */
export const getAbstractText = (
  abstract: string | IArticleAbstracts | undefined,
  preferredLanguage: string = 'en'
): string => {
  if (!abstract) return '';

  // If it's already a string, return it
  if (typeof abstract === 'string') {
    return abstract;
  }

  // If it's an object (multilingual), try to get the preferred language
  if (typeof abstract === 'object') {
    // Try preferred language first
    if (abstract[preferredLanguage as keyof IArticleAbstracts]) {
      return abstract[preferredLanguage as keyof IArticleAbstracts];
    }

    // Fallback to 'en' if not the preferred language
    if (preferredLanguage !== 'en' && abstract['en' as keyof IArticleAbstracts]) {
      return abstract['en' as keyof IArticleAbstracts];
    }

    // Fallback to the first available language
    const languages = Object.keys(abstract);
    if (languages.length > 0) {
      return abstract[languages[0] as keyof IArticleAbstracts];
    }
  }

  return '';
};
