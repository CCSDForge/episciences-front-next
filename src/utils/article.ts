import {
    IArticle,
    IArticleAbstracts,
    IArticleAuthor,
    IArticleCitedBy,
    IArticleKeywords,
    IArticleReference,
    IArticleRelatedItem,
    IInstitution,
    RawArticle
} from "@/types/article";
import {TFunction} from 'i18next';
import {toast} from 'react-toastify';

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

    let abstract: string | IArticleAbstracts = '';

    if (typeof articleContent.abstract?.value === 'string') {
      // Simple string abstract
      abstract = articleContent.abstract.value;
    } else if (Array.isArray(articleContent.abstract?.value)) {
      // Check if it's a multilingual array with @xml:lang or @language attributes
      const hasLanguageAttribute = articleContent.abstract.value.some(
        item => typeof item === 'object' && item !== null &&
          ('@xml:lang' in item || '@language' in item)
      );

      if (hasLanguageAttribute) {
        // Build multilingual abstracts object
        const abstractsObj: any = {};
        articleContent.abstract.value.forEach(item => {
          if (typeof item === 'object' && item !== null && 'value' in item) {
            // Support both @xml:lang (Zenodo) and @language attributes
            const lang = item['@xml:lang'] || item['@language'];
            const content = item.value;
            if (lang && content) {
              abstractsObj[lang] = content;
            }
          }
        });

        // Only use structured format if we have multiple languages
        if (Object.keys(abstractsObj).length > 1) {
          abstract = abstractsObj as IArticleAbstracts;
        } else if (Object.keys(abstractsObj).length === 1) {
          // Single language, use simple string
          abstract = Object.values(abstractsObj)[0] as string;
        } else {
          // Fallback to join if no valid language data
          abstract = articleContent.abstract.value
            .map(item => (typeof item === 'string' ? item : item.value))
            .join(' ');
        }
      } else {
        // Plain array without language codes - join them
        abstract = articleContent.abstract.value
          .map(item => (typeof item === 'string' ? item : item.value))
          .join(' ');
      }
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
      citedBy = Object.values(articleDB.current.cited_by).map((cb) => {
        try {
          const parsedCitations = JSON.parse(cb.citation as unknown as string);
          return {
            source: cb.source_id_name,
            citations: Object.values(parsedCitations).map((c) => {
              const citation = c as Record<string, string>;
              const authors: string[] = citation.author?.split(';') || [];

              return {
                title: citation.title || '',
                sourceTitle: citation.source_title || '',
                authors: authors.map(author => ({
                  fullname: author.split(',')[0]?.trim() || '',
                  orcid: author.split(',')[1]?.trim() || undefined
                })),
                reference: {
                  volume: citation.volume || '',
                  year: citation.year || '',
                  page: citation.page || ''
                },
                doi: citation.doi || ''
              }
            })
          };
        } catch (parseError) {
          console.error('[formatArticle] Error parsing citedBy citation:', parseError);
          // Return empty citations for this source if parsing fails
          return {
            source: cb.source_id_name,
            citations: []
          };
        }
      }).filter(cb => cb.citations.length > 0); // Remove sources with no valid citations
    }

    /** Format acceptance date */
    let acceptanceDate = undefined;
    if (articleContent?.acceptance_date) {
      acceptanceDate = `${articleContent?.acceptance_date.year}-${articleContent?.acceptance_date.month}-${articleContent?.acceptance_date.day}`
    }

    let isImported = false;
    if (articleDB?.current?.flag && articleDB?.current?.flag === "imported") {
      isImported = true;
    }

    /** Format authors */
    let authors: IArticleAuthor[] = [];
    if (Array.isArray(articleContent.contributors?.person_name)) {
      const authorOrder: Record<string, number> = {"first": 1, "additional": 2};
      const sortedAuthors = articleContent.contributors.person_name.sort((a, b) => {
        const orderA = authorOrder[a["@sequence"]] ?? 999;
        const orderB = authorOrder[b["@sequence"]] ?? 999;
        return orderA - orderB;
      });
      authors = sortedAuthors.map((author) => {
        const fullname = author.given_name ? `${author.given_name} ${author.surname}`.trim() : author.surname.trim()
        const orcid = author.ORCID
        let institutions: IInstitution[] = []
        if (Array.isArray(author.affiliations?.institution)) {
          institutions = author.affiliations?.institution.map(i => ({
            name: i.institution_name,
            rorId: i.institution_id?.['@type'] === 'ror' ? i.institution_id.value : undefined
          }))
        } else {
          if (author.affiliations?.institution?.institution_name) {
            const inst = author.affiliations?.institution
            institutions = [{
              name: inst.institution_name,
              rorId: inst.institution_id?.['@type'] === 'ror' ? inst.institution_id.value : undefined
            }]
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
      let authorInstitutions: IInstitution[] = []
      if (Array.isArray(articleContent.contributors.person_name.affiliations?.institution)) {
        authorInstitutions = articleContent.contributors.person_name.affiliations?.institution.map(i => ({
          name: i.institution_name,
          rorId: i.institution_id?.['@type'] === 'ror' ? i.institution_id.value : undefined
        }))
      } else {
        if (articleContent.contributors.person_name.affiliations?.institution?.institution_name) {
          const inst = articleContent.contributors.person_name.affiliations?.institution
          authorInstitutions = [{
            name: inst.institution_name,
            rorId: inst.institution_id?.['@type'] === 'ror' ? inst.institution_id.value : undefined
          }]
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

    /** Format keywords */
    let keywords: string[] | IArticleKeywords | undefined = undefined;

    // Check for keywords in various possible locations
    let rawKeywords: any = undefined;
    let keywordsLanguage: string | undefined = undefined;

    if (extendedArticle.keywords) {
      rawKeywords = extendedArticle.keywords;
    } else if (articleContent.keywords) {
      rawKeywords = articleContent.keywords;
      // Check if there's a @language attribute at the article content level
      keywordsLanguage = articleContent['@language'];
    } else if (articleContent.program) {
      // Check for keywords in program data
      const keywordProgram = Array.isArray(articleContent.program)
        ? articleContent.program.find((p): p is typeof p & { keywords: unknown } =>
            p && typeof p === 'object' && 'keywords' in p && !!p.keywords)
        : (articleContent.program as any)?.keywords ? articleContent.program : null;

      if (keywordProgram) {
        // TypeScript doesn't narrow the type properly, so we use type assertion
        const programWithKeywords = keywordProgram as { keywords?: unknown; '@language'?: string };
        if (programWithKeywords.keywords) {
          rawKeywords = programWithKeywords.keywords;
          keywordsLanguage = programWithKeywords['@language'];
        }
      }
    }

    // Process keywords - check if they're already structured by language
    if (rawKeywords) {
      if (Array.isArray(rawKeywords)) {
        // Simple array - check if we have a language indicator
        if (keywordsLanguage && rawKeywords.length > 0) {
          // If there's a language attribute, structure it by language
          const keywordsObj: any = {};
          keywordsObj[keywordsLanguage] = rawKeywords;
          // For now, keep as simple array since it's single language
          // The KeywordsSection component will handle single-language display
          keywords = rawKeywords;
        } else {
          keywords = rawKeywords;
        }
      } else if (typeof rawKeywords === 'object') {
        // Object - check if it's a language-keyed object
        const keys = Object.keys(rawKeywords);
        const isMultilingual = keys.length > 1 ||
          (keys.length === 1 && keys.some(k => k.length === 2)); // 2-char language codes

        if (isMultilingual) {
          keywords = rawKeywords as IArticleKeywords;
        } else if (keys.length === 1 && Array.isArray(rawKeywords[keys[0]])) {
          // Single language with array - extract the array
          keywords = rawKeywords[keys[0]];
        } else {
          keywords = rawKeywords;
        }
      }
    }

    /** Format metrics */
    const metrics: { views: number; downloads: number } = { views: 0, downloads: 0 };
    if (articleDB?.current?.metrics) {
        metrics.downloads = articleDB.current.metrics.file_count
        metrics.views = articleDB.current.metrics.page_count
    }

    /** Format section */
    let section = undefined;
    if (articleDB?.current?.section) {
      section = {
        id: articleDB.current.section.id,
        title: articleDB.current.section.titles
      };
    }

    /** Format DOI - try multiple sources */
    const doi = extendedArticle.doi || articleContent.doi_data?.doi || '';

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
      keywords,
      doi,
      volumeId: articleDB?.current?.volume?.id,
      section,
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
  toast.success(t('common.citeSuccess', { template: citation.key }));
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
  if (!csl || csl.trim() === '') {
    return [];
  }

  try {
    // Dynamically import citation-js only when needed (client-side)
    const citationModule = await import('citation-js');

    // Try different ways to access Cite - check if it's a valid constructor
    const Cite = citationModule.Cite || citationModule.default || citationModule;

    if (typeof Cite !== 'function') {
      console.error('[getCitations] citation-js module loaded incorrectly:', citationModule);
      throw new Error('Failed to load citation-js Cite constructor');
    }

    // Register plugins
    await import('@citation-js/plugin-csl');

    // Parse CSL data - it might be a JSON string, so try to parse it
    let cslData = csl;
    try {
      cslData = JSON.parse(csl);
    } catch (parseError) {
      // If not JSON, use as is (already a string or object)
    }

    // Parse CSL data
    const cite = new Cite(cslData);

    // Format citations in different styles
    const apaCitation = cite.format('bibliography', {
      format: 'text',
      template: 'apa',
      lang: 'en-US'
    });

    const mlaCitation = cite.format('bibliography', {
      format: 'text',
      template: 'mla',
      lang: 'en-US'
    });

    return [
        {key: CITATION_TEMPLATE.APA, citation: apaCitation},
        {key: CITATION_TEMPLATE.MLA, citation: mlaCitation},
        {key: CITATION_TEMPLATE.BIBTEX, citation: ''} // Empty initially, will be filled from metadataBibTeX API response
    ];
  } catch (error) {
    console.error('[getCitations] Error formatting citations:', error);
    return [];
  }
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
  { value: INTER_WORK_RELATIONSHIP.IS_SAME_AS, labelPath: 'pages.articleDetails.relationships.isSameAs' },
  { value: INTER_WORK_RELATIONSHIP.HAS_PREPRINT, labelPath: 'pages.articleDetails.relationships.hasPreprint' },
  { value: INTER_WORK_RELATIONSHIP.IS_DERIVED_FROM, labelPath: 'pages.articleDetails.relationships.isDerivedFrom' },
  { value: INTER_WORK_RELATIONSHIP.HAS_DERIVATION, labelPath: 'pages.articleDetails.relationships.hasDerivation' },
  { value: INTER_WORK_RELATIONSHIP.IS_REVIEW_OF, labelPath: 'pages.articleDetails.relationships.isReviewOf' },
  { value: INTER_WORK_RELATIONSHIP.HAS_REVIEW, labelPath: 'pages.articleDetails.relationships.hasReview' },
  { value: INTER_WORK_RELATIONSHIP.IS_COMMENT_ON, labelPath: 'pages.articleDetails.relationships.isCommentOn' },
  { value: INTER_WORK_RELATIONSHIP.HAS_COMMENT, labelPath: 'pages.articleDetails.relationships.hasComment' },
  { value: INTER_WORK_RELATIONSHIP.IS_REPLY_TO, labelPath: 'pages.articleDetails.relationships.isReplyTo' },
  { value: INTER_WORK_RELATIONSHIP.HAS_REPLY, labelPath: 'pages.articleDetails.relationships.hasReply' },
  { value: INTER_WORK_RELATIONSHIP.BASED_ON_DATA, labelPath: 'pages.articleDetails.relationships.basedOnData' },
  { value: INTER_WORK_RELATIONSHIP.IS_DATA_BASIS_FOR, labelPath: 'pages.articleDetails.relationships.isDataBasisFor' },
  { value: INTER_WORK_RELATIONSHIP.HAS_RELATED_MATERIAL, labelPath: 'pages.articleDetails.relationships.hasRelatedMaterial' },
  { value: INTER_WORK_RELATIONSHIP.IS_RELATED_MATERIAL, labelPath: 'pages.articleDetails.relationships.isRelatedMaterial' },
  { value: INTER_WORK_RELATIONSHIP.IS_COMPILED_BY, labelPath: 'pages.articleDetails.relationships.isCompiledBy' },
  { value: INTER_WORK_RELATIONSHIP.COMPILES, labelPath: 'pages.articleDetails.relationships.compiles' },
  { value: INTER_WORK_RELATIONSHIP.IS_DOCUMENTED_BY, labelPath: 'pages.articleDetails.relationships.isDocumentedBy' },
  { value: INTER_WORK_RELATIONSHIP.DOCUMENTS, labelPath: 'pages.articleDetails.relationships.documents' },
  { value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENT_TO, labelPath: 'pages.articleDetails.relationships.isSupplementTo' },
  { value: INTER_WORK_RELATIONSHIP.IS_SUPPLEMENTED_BY, labelPath: 'pages.articleDetails.relationships.isSupplementedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_CONTINUED_BY, labelPath: 'pages.articleDetails.relationships.isContinuedBy' },
  { value: INTER_WORK_RELATIONSHIP.CONTINUES, labelPath: 'pages.articleDetails.relationships.continues' },
  { value: INTER_WORK_RELATIONSHIP.IS_PART_OF, labelPath: 'pages.articleDetails.relationships.isPartOf' },
  { value: INTER_WORK_RELATIONSHIP.HAS_PART, labelPath: 'pages.articleDetails.relationships.hasPart' },
  { value: INTER_WORK_RELATIONSHIP.REFERENCES, labelPath: 'pages.articleDetails.relationships.references' },
  { value: INTER_WORK_RELATIONSHIP.IS_REFERENCED_BY, labelPath: 'pages.articleDetails.relationships.isReferencedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_BASED_ON, labelPath: 'pages.articleDetails.relationships.isBasedOn' },
  { value: INTER_WORK_RELATIONSHIP.IS_BASIS_FOR, labelPath: 'pages.articleDetails.relationships.isBasisFor' },
  { value: INTER_WORK_RELATIONSHIP.REQUIRES, labelPath: 'pages.articleDetails.relationships.requires' },
  { value: INTER_WORK_RELATIONSHIP.IS_REQUIRED_BY, labelPath: 'pages.articleDetails.relationships.isRequiredBy' },
  { value: INTER_WORK_RELATIONSHIP.FINANCES, labelPath: 'pages.articleDetails.relationships.finances' },
  { value: INTER_WORK_RELATIONSHIP.IS_FINANCED_BY, labelPath: 'pages.articleDetails.relationships.isFinancedBy' },
  { value: INTER_WORK_RELATIONSHIP.IS_VERSION_OF, labelPath: 'pages.articleDetails.relationships.isVersionOf' },
  { value: INTER_WORK_RELATIONSHIP.IS_RELATED_TO, labelPath: 'pages.articleDetails.relationships.isRelatedTo' }
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
} 