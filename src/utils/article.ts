import { IArticle, IArticleAuthor, IArticleCitedBy, IArticleReference, IArticleRelatedItem, RawArticle } from "../types/article";
import { TFunction } from 'i18next';
import { toast } from 'react-toastify';

export interface ICitation {
  key: CITATION_TEMPLATE;
  citation: string;
}

export enum CITATION_TEMPLATE {
  APA = 'APA',
  MLA = 'MLA',
  BIBTEX = 'BibTeX'
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
  JSON = 'json'
}

export type FetchedArticle = IArticle | undefined;

// Type étendu pour ajouter le champ docid qui existe dans les réponses de l'API
// mais qui n'est pas officiellement dans le type RawArticle
interface ExtendedRawArticle extends RawArticle {
  docid?: number;
}

export function formatArticle(article: RawArticle): FetchedArticle {
  if (!article) {
    console.error('formatArticle: article is undefined');
    return undefined;
  }

  const extendedArticle = article as ExtendedRawArticle;

  try {
    // Récupération des métadonnées de base
    const id = Number(extendedArticle.paperid);
    const title = extendedArticle.document?.journal?.journal_article?.titles?.title || 'Titre non disponible';
    
    // Création d'un article minimal pour éviter les erreurs
    if (!title || !id) {
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
        metrics: { views: 0, downloads: 0 }
      };
    }
    
    const articleJournal = extendedArticle.document?.journal;
    const articleDB = extendedArticle.document?.database;
    const articleConference = extendedArticle.document?.conference;

    const articleContent = articleJournal?.journal_article ?? articleConference?.conference_paper;

    if (!articleContent) return undefined;

    let abstract = '';

    if (typeof articleContent.abstract?.value === 'string') {
      abstract = articleContent.abstract.value;
    } else if (Array.isArray(articleContent.abstract?.value)) {
      abstract = articleContent.abstract.value
          .map(item => (typeof item === 'string' ? item : item.value))
          .join(' ');
    } else if (typeof articleContent.abstract?.value?.value === 'string') {
      abstract = articleContent.abstract.value.value;
    }

    /** Format references */
    let references: IArticleReference[] = []
    if (articleContent.citation_list?.citation) {
      references = articleContent.citation_list.citation.map((c) => ({
        doi: c.doi,
        citation: c.unstructured_citation
      }))
    }

    /** Format citedBy */
    let citedBy: IArticleCitedBy[] = []
    if (articleDB?.current?.cited_by) {
      citedBy = Object.values(articleDB.current.cited_by).map((cb) => ({
        source: cb.source_id_name,
        citations: Object.values(JSON.parse(cb.citation as unknown as string)).map((c) => {
          const citation = c as Record<string, string>;
          const authors: string[] = citation.author.split(';')

          return {
            title: citation.title,
            sourceTitle: citation.source_title,
            authors: authors.map(author => ({
              fullname: author.split(',')[0].trim(),
              orcid: author.split(',')[1] ? author.split(',')[1].trim() : undefined
            })),
            reference: {
              volume: citation.volume,
              year: citation.year,
              page: citation.page
            },
            doi: citation.doi
          }
        })
      }))
    }

    /** Format acceptance date */
    let acceptanceDate = undefined;
    if (articleContent?.acceptance_date) {
      acceptanceDate = `${articleContent?.acceptance_date.year}-${articleContent?.acceptance_date.month}-${articleContent?.acceptance_date.day}`
    }

    let isImported = false;
    if (articleDB?.current?.flag && articleDB?.current?.flag == "imported") {
      isImported = true;
    }

    /** Format authors */
    let authors: IArticleAuthor[] = [];
    if (Array.isArray(articleContent.contributors?.person_name)) {
      const authorOrder = {"first": 1, "additional": 2};
      const sortedAuthors = articleContent.contributors.person_name.sort((a, b) => authorOrder[a["@sequence"] as keyof typeof authorOrder] - authorOrder[b["@sequence"] as keyof typeof authorOrder]);
      authors = sortedAuthors.map((author) => {
        const fullname = author.given_name ? `${author.given_name} ${author.surname}`.trim() : author.surname.trim()
        const orcid = author.ORCID
        let institutions: string[] = []
        if (Array.isArray(author.affiliations?.institution)) {
          institutions = author.affiliations?.institution.map(i => i.institution_name)
        } else {
          if (author.affiliations?.institution?.institution_name) {
            institutions = [author.affiliations?.institution?.institution_name]
          }
        }

        return {
          fullname,
          orcid,
          institutions
        }
      })
    } else if (articleContent.contributors?.person_name) {
      const authorFullname = articleContent.contributors.person_name.given_name ? `${articleContent.contributors.person_name.given_name} ${articleContent.contributors.person_name.surname}`.trim() : articleContent.contributors.person_name.surname.trim()
      const authorOrcid = articleContent.contributors.person_name.ORCID
      let authorInstitutions: string[] = []
      if (Array.isArray(articleContent.contributors.person_name.affiliations?.institution)) {
        authorInstitutions = articleContent.contributors.person_name.affiliations?.institution.map(i => i.institution_name)
      } else {
        if (articleContent.contributors.person_name.affiliations?.institution?.institution_name) {
          authorInstitutions = [articleContent.contributors.person_name.affiliations?.institution?.institution_name]
        }
      }

      authors = [
        { fullname: authorFullname, orcid: authorOrcid, institutions: authorInstitutions }
      ]
    }

    /** Format relatedItems */
    const relatedItems: IArticleRelatedItem[] = []
    if (Array.isArray(articleContent.program)) {
      articleContent.program.forEach((prog) => {
        if (Array.isArray(prog?.related_item)) {
          prog.related_item.forEach((item) => {
            if (item.inter_work_relation) {
              relatedItems.push({
                value: item.inter_work_relation?.value,
                identifierType: item.inter_work_relation['@identifier-type'],
                relationshipType: item.inter_work_relation['@relationship-type'],
                citation: item.inter_work_relation.unstructured_citation
              });
            }
            if (item.intra_work_relation) {
              relatedItems.push({
                value: item.intra_work_relation?.value,
                identifierType: item.intra_work_relation['@identifier-type'],
                relationshipType: item.intra_work_relation['@relationship-type'],
                citation: item.intra_work_relation.unstructured_citation
              });
            }
          })
        } else if (prog?.related_item?.inter_work_relation) {
          relatedItems.push({
            value: prog.related_item.inter_work_relation?.value,
            identifierType: prog.related_item.inter_work_relation['@identifier-type'],
            relationshipType: prog.related_item.inter_work_relation['@relationship-type'],
            citation: prog.related_item.inter_work_relation.unstructured_citation
          });
        } else if (prog?.related_item?.intra_work_relation) {
          relatedItems.push({
            value: prog.related_item.intra_work_relation?.value,
            identifierType: prog.related_item.intra_work_relation['@identifier-type'],
            relationshipType: prog.related_item.intra_work_relation['@relationship-type'],
            citation: prog.related_item.intra_work_relation.unstructured_citation
          });
        }
      })
    } else {
      if (Array.isArray(articleContent.program?.related_item)) {
        articleContent.program.related_item.forEach((item) => {
          if (item.inter_work_relation) {
            relatedItems.push({
              value: item.inter_work_relation?.value,
              identifierType: item.inter_work_relation['@identifier-type'],
              relationshipType: item.inter_work_relation['@relationship-type'],
              citation: item.inter_work_relation.unstructured_citation
            });
          }
          if (item.intra_work_relation) {
            relatedItems.push({
              value: item.intra_work_relation?.value,
              identifierType: item.intra_work_relation['@identifier-type'],
              relationshipType: item.intra_work_relation['@relationship-type'],
              citation: item.intra_work_relation.unstructured_citation
            });
          }
        })
      } else if (articleContent.program?.related_item?.inter_work_relation) {
        relatedItems.push({
          value: articleContent.program.related_item.inter_work_relation?.value,
          identifierType: articleContent.program.related_item.inter_work_relation['@identifier-type'],
          relationshipType: articleContent.program.related_item.inter_work_relation['@relationship-type'],
          citation: articleContent.program.related_item.inter_work_relation.unstructured_citation
        });
      } else if (articleContent.program?.related_item?.intra_work_relation) {
        relatedItems.push({
          value: articleContent.program.related_item.intra_work_relation?.value,
          identifierType: articleContent.program.related_item.intra_work_relation['@identifier-type'],
          relationshipType: articleContent.program.related_item.intra_work_relation['@relationship-type'],
          citation: articleContent.program.related_item.intra_work_relation.unstructured_citation
        });
      }
    }

    /** Format fundings */
    const fundings: string[] = []
    if (Array.isArray(articleContent.program)) {
      const fundref = articleContent.program.find(p => p['@name'] && p['@name'] === 'fundref')
      if (fundref) {
        if (Array.isArray(fundref.assertion?.assertion)) {
          fundref.assertion?.assertion?.forEach((as) => fundings.push(as.value))
        } else if (fundref.assertion?.assertion?.value) {
          fundings.push(fundref.assertion?.assertion?.value)
        }
      }
    } else {
      if (articleContent.program && articleContent.program['@name'] === 'fundref') {
        if (Array.isArray(articleContent.program.assertion?.assertion)) {
          articleContent.program.assertion?.assertion?.forEach((as) => fundings.push(as.value))
        } else if (articleContent.program.assertion?.assertion?.value) {
          fundings.push(articleContent.program.assertion?.assertion?.value)
        }
      }
    }

    /** Format license */
    let license = undefined;
    if (Array.isArray(articleContent.program)) {
      const licenseRef = articleContent.program.find(p => p.license_ref && p.license_ref.value)?.license_ref
      license = licenseRef?.value
    } else {
      license = articleContent.program?.license_ref?.value
    }

    /** Format metrics */
    const metrics: { views: number; downloads: number } = { views: 0, downloads: 0 };
    if (articleDB?.current?.metrics) {
        metrics.downloads = articleDB.current.metrics.file_count
        metrics.views = articleDB.current.metrics.page_count
    }

    return {
      id: Number(extendedArticle.paperid),
      title: articleContent.titles?.title,
      abstract,
      graphicalAbstract: articleDB?.current?.graphical_abstract_file,
      authors,
      publicationDate: articleDB?.current?.dates?.publication_date,
      acceptanceDate,
      submissionDate: articleDB?.current?.dates?.first_submission_date,
      modificationDate: articleDB?.current?.dates?.modification_date,
      isImported,
      tag: articleDB?.current?.type?.title?.toLowerCase(),
      repositoryName: articleDB?.current?.repository?.name,
      repositoryIdentifier: articleDB?.current?.identifiers?.repository_identifier,
      pdfLink: articleDB?.current?.mainPdfUrl?.length ? articleDB?.current?.mainPdfUrl : undefined,
      docLink: articleDB?.current?.repository?.doc_url,
      keywords: extendedArticle.keywords,
      doi: extendedArticle.doi,
      volumeId: articleDB?.current?.volume?.id,
      references,
      citedBy,
      relatedItems,
      fundings,
      license,
      metrics
    }
  } catch (error) {
    console.error('Error formatting article:', error);
    return undefined;
  }
}

export const copyToClipboardCitation = (citation: ICitation, t: TFunction<"translation", undefined>): void => {
  navigator.clipboard.writeText(citation.citation);
  toast.success(t('common.copied'));
};

export const getLicenseTranslations = (t: TFunction<"translation", undefined>): { value: string; label: string; isLink?: boolean }[] => [
  { value: 'CC-BY-4.0', label: t('pages.articleDetails.license.ccby4'), isLink: true },
  { value: 'CC-BY-SA-4.0', label: t('pages.articleDetails.license.ccbysa4'), isLink: true },
  { value: 'CC-BY-NC-4.0', label: t('pages.articleDetails.license.ccbync4'), isLink: true },
  { value: 'CC-BY-NC-SA-4.0', label: t('pages.articleDetails.license.ccbyncsa4'), isLink: true },
  { value: 'CC-BY-ND-4.0', label: t('pages.articleDetails.license.ccbynd4'), isLink: true },
  { value: 'CC-BY-NC-ND-4.0', label: t('pages.articleDetails.license.ccbyncnd4'), isLink: true }
];

export const getMetadataTypes = (): { type: METADATA_TYPE; label: string; }[] => [
  { type: METADATA_TYPE.TEI, label: 'TEI' },
  { type: METADATA_TYPE.DC, label: 'Dublin Core' },
  { type: METADATA_TYPE.CROSSREF, label: 'Crossref' },
  { type: METADATA_TYPE.ZBJATS, label: 'ZB Jats' },
  { type: METADATA_TYPE.DOAJ, label: 'DOAJ' },
  { type: METADATA_TYPE.BIBTEX, label: 'BibTeX' },
  { type: METADATA_TYPE.CSL, label: 'CSL' },
  { type: METADATA_TYPE.OPENAIRE, label: 'OpenAire' },
  { type: METADATA_TYPE.JSON, label: 'JSON' }
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
  SOFTWARE = 'software'
}

export const articleTypes: { labelPath: string; value: string; }[] = [
  { labelPath: 'pages.articles.types.article', value: ARTICLE_TYPE.ARTICLE },
  { labelPath: 'pages.articles.types.book', value: ARTICLE_TYPE.BOOK },
  { labelPath: 'pages.articles.types.bookpart', value: ARTICLE_TYPE.BOOK_PART },
  { labelPath: 'pages.articles.types.conference', value: ARTICLE_TYPE.CONFERENCE },
  { labelPath: 'pages.articles.types.lecture', value: ARTICLE_TYPE.LECTURE },
  { labelPath: 'pages.articles.types.other', value: ARTICLE_TYPE.OTHER },
  { labelPath: 'pages.articles.types.preprint', value: ARTICLE_TYPE.PRE_PRINT },
  { labelPath: 'pages.articles.types.report', value: ARTICLE_TYPE.REPORT },
  { labelPath: 'pages.articles.types.software', value: ARTICLE_TYPE.SOFTWARE }
];

export const getCitations = async (csl?: string): Promise<ICitation[]> => {
  return [
    { key: CITATION_TEMPLATE.APA, citation: csl || '' },
    { key: CITATION_TEMPLATE.MLA, citation: csl || '' },
    { key: CITATION_TEMPLATE.BIBTEX, citation: csl || '' }
  ];
};

export enum LINKED_PUBLICATION_IDENTIFIER_TYPE {
  URI = 'uri',
  ARXIV = 'arxiv',
  HAL = 'hal',
  DOI = 'doi',
  OTHER = 'other'
}

export enum INTER_WORK_RELATIONSHIP {
  IS_SAME_AS = "isSameAs",
  HAS_PREPRINT = "hasPreprint",
  IS_DERIVED_FROM = "isDerivedFrom",
  HAS_DERIVATION = "hasDerivation",
  IS_REVIEW_OF = "isReviewOf",
  HAS_REVIEW = "hasReview",
  IS_COMMENT_ON = "isCommentOn",
  HAS_COMMENT = "hasComment",
  IS_REPLY_TO = "isReplyTo",
  HAS_REPLY = "hasReply",
  BASED_ON_DATA = "basedOnData",
  IS_DATA_BASIS_FOR = "isDataBasisFor",
  HAS_RELATED_MATERIAL = "hasRelatedMaterial",
  IS_RELATED_MATERIAL = "isRelatedMaterial",
  IS_COMPILED_BY = "isCompiledBy",
  COMPILES = "compiles",
  IS_DOCUMENTED_BY = "isDocumentedBy",
  DOCUMENTS = "documents",
  IS_SUPPLEMENT_TO = "isSupplementTo",
  IS_SUPPLEMENTED_BY = "isSupplementedBy",
  IS_CONTINUED_BY = "isContinuedBy",
  CONTINUES = "continues",
  IS_PART_OF = "isPartOf",
  HAS_PART = "hasPart",
  REFERENCES = "references",
  IS_REFERENCED_BY = "isReferencedBy",
  IS_BASED_ON = "isBasedOn",
  IS_BASIS_FOR = "isBasisFor",
  REQUIRES = "requires",
  IS_REQUIRED_BY = "isRequiredBy",
  FINANCES = "finances",
  IS_FINANCED_BY = "isFinancedBy",
  IS_VERSION_OF = "isVersionOf",
  IS_RELATED_TO = "isRelatedTo"
}

export const interworkRelationShipTypes:any[] = [
  { value: INTER_WORK_RELATIONSHIP.IS_SAME_AS, label: 'article.relationType.isSameAs' },
  { value: INTER_WORK_RELATIONSHIP.HAS_PREPRINT, label: 'article.relationType.hasPreprint' },
  { value: INTER_WORK_RELATIONSHIP.IS_DERIVED_FROM, label: 'article.relationType.isDerivedFrom' },
  { value: INTER_WORK_RELATIONSHIP.HAS_DERIVATION, label: 'article.relationType.hasDerivation' },
  { value: INTER_WORK_RELATIONSHIP.IS_REVIEW_OF, label: 'article.relationType.isReviewOf' },
  { value: INTER_WORK_RELATIONSHIP.HAS_REVIEW, label: 'article.relationType.hasReview' },
  { value: INTER_WORK_RELATIONSHIP.IS_COMMENT_ON, label: 'article.relationType.isCommentOn' },
  { value: INTER_WORK_RELATIONSHIP.HAS_COMMENT, label: 'article.relationType.hasComment' },
  { value: INTER_WORK_RELATIONSHIP.IS_REPLY_TO, label: 'article.relationType.isReplyTo' },
  { value: INTER_WORK_RELATIONSHIP.HAS_REPLY, label: 'article.relationType.hasReply' },
  { value: INTER_WORK_RELATIONSHIP.BASED_ON_DATA, label: 'article.relationType.basedOnData' },
  { value: INTER_WORK_RELATIONSHIP.IS_DATA_BASIS_FOR, label: 'article.relationType.isDataBasisFor' },
  { value: INTER_WORK_RELATIONSHIP.HAS_RELATED_MATERIAL, label: 'article.relationType.hasRelatedMaterial' },
  { value: INTER_WORK_RELATIONSHIP.IS_RELATED_MATERIAL, label: 'article.relationType.isRelatedMaterial' },
  { value: INTER_WORK_RELATIONSHIP.IS_COMPILED_BY, label: 'article.relationType.isCompiledBy' },
  { value: INTER_WORK_RELATIONSHIP.COMPILES, label: 'article.relationType.compiles' },
  { value: INTER_WORK_RELATIONSHIP.IS_DOCUMENTED_BY, label: 'article.relationType.isDocumentedBy' },
  { value: INTER_WORK_RELATIONSHIP.DOCUMENTS, label: 'article.relationType.documents' },
  { value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENT_TO, label: 'article.relationType.isSupplementTo' },
  { value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENTED_BY, label: 'article.relationType.isSupplementedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_CONTINUED_BY, label: 'article.relationType.isContinuedBy' },
  { value: INTER_WORK_RELATIONSHIP.CONTINUES, label: 'article.relationType.continues' },
  { value: INTER_WORK_RELATIONSHIP.IS_PART_OF, label: 'article.relationType.isPartOf' },
  { value: INTER_WORK_RELATIONSHIP.HAS_PART, label: 'article.relationType.hasPart' },
  { value: INTER_WORK_RELATIONSHIP.REFERENCES, label: 'article.relationType.references' },
  { value: INTER_WORK_RELATIONSHIP.IS_REFERENCED_BY, label: 'article.relationType.isReferencedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_BASED_ON, label: 'article.relationType.isBasedOn' },
  { value: INTER_WORK_RELATIONSHIP.IS_BASIS_FOR, label: 'article.relationType.isBasisFor' },
  { value: INTER_WORK_RELATIONSHIP.REQUIRES, label: 'article.relationType.requires' },
  { value: INTER_WORK_RELATIONSHIP.IS_REQUIRED_BY, label: 'article.relationType.isRequiredBy' },
  { value: INTER_WORK_RELATIONSHIP.FINANCES, label: 'article.relationType.finances' },
  { value: INTER_WORK_RELATIONSHIP.IS_FINANCED_BY, label: 'article.relationType.isFinancedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_VERSION_OF, label: 'article.relationType.isVersionOf' },
  { value: INTER_WORK_RELATIONSHIP.IS_RELATED_TO, label: 'article.relationType.isRelatedTo' }
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
    console.error('Error formatting authors:', error);
    return '';
  }
} 