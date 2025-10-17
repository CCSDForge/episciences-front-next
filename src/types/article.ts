import { AvailableLanguage } from "@/utils/i18n";

export interface IPartialArticle {
  '@id': string;
  '@type': string;
  paperid: number;
}

export type PartialSectionArticle = IPartialArticle;
export type PartialVolumeArticle = IPartialArticle;

export interface IArticle {
  id: number;
  title: string;
  abstract?: string | IArticleAbstracts;
  graphicalAbstract?: string;
  authors: IArticleAuthor[];
  publicationDate: string;
  acceptanceDate?: string;
  submissionDate?: string;
  modificationDate?: string;
  isImported?: boolean;
  tag?: string;
  repositoryName: string;
  pdfLink?: string;
  docLink?: string;
  repositoryIdentifier: string;
  keywords?: string[] | IArticleKeywords;
  doi: string;
  volumeId?: number;
  section?: {
    id: number;
    title: Record<AvailableLanguage, string>;
  };
  references?: IArticleReference[];
  citedBy?: IArticleCitedBy[];
  relatedItems?: IArticleRelatedItem[];
  fundings?: string[];
  license?: string;
  metrics?: {
    views: number;
    downloads: number;
  }
}

export interface IInstitution {
  name: string;
  rorId?: string;
}

export interface IArticleAuthor {
  fullname: string;
  orcid?: string;
  institutions?: IInstitution[];
}

export type IArticleRecordKeywords = {
  [language in AvailableLanguage]: string[];
};

export interface IArticleKeywords extends IArticleRecordKeywords {
}

export type IArticleRecordAbstracts = {
  [language in AvailableLanguage]: string;
};

export interface IArticleAbstracts extends IArticleRecordAbstracts {
}

export interface IArticleReference {
  doi?: string;
  citation: string;
}

export interface IArticleCitedBy {
  source: string;
  citations: IArticleCitedByCitation[];
}

export interface IArticleCitedByCitation {
  title: string;
  sourceTitle: string;
  authors: {
    fullname: string;
    orcid?: string;
  }[];
  reference: {
    volume: string;
    year: string;
    page: string;
  }
  doi: string;
}

export interface IArticleRelatedItem {
  value: string;
  identifierType: string;
  relationshipType: string;
  citation?: string;
}

export type RawArticle = IPartialArticle & IArticle & {
  document: {
    journal?: {
      journal_article: IRawArticleContent;
    }
    database: {
      current: {
        'mainPdfUrl': string;
        cited_by?: {
          [key: number]: {
            source_id_name: string;
            citation: {
              [key: number]: {
                title: string;
                source_title: string;
                author: string;
                volume: string;
                year: string;
                page: string;
                doi: string;
              }
            };
          }
        }
        type?: {
          title: string;
        }
        flag?: string;
        dates: {
          publication_date: string;
          first_submission_date: string;
          modification_date: string;
        }
        graphical_abstract_file?: string;
        files: {
          link: string;
        } | {
          link: string;
        }[]
        repository: {
          name: string;
          doc_url: string;
          paper_url: string;
        }
        identifiers: {
          repository_identifier: string;
        }
        volume?: {
          id: number;
        }
        section?: {
          id: number;
          titles: Record<AvailableLanguage, string>;
        }
        metrics?: {
          file_count: number;
          page_count: number;
        }
      }
    }
    conference: {
      conference_paper: IRawArticleContent;
    }
  }
}

interface IRawArticleContent {
  titles: {
    title: string;
  }
  abstract?: {
    value: string | {
      value: string;
    } | {
      '@xml:lang'?: string;
      '@language'?: string;
      value: string;
    }[];
  }
  contributors: {
    person_name: {
      surname: string;
      '@sequence': string;
      given_name?: string;
      ORCID?: string;
      affiliations?: {
        institution?: {
          institution_name: string;
          institution_id?: {
            '@type': string;
            value: string;
          };
        } | {
          institution_name: string;
          institution_id?: {
            '@type': string;
            value: string;
          };
        }[]
      }
    } | {
      surname: string;
      '@sequence': string;
      given_name?: string;
      ORCID?: string;
      affiliations?: {
        institution?: {
          institution_name: string;
          institution_id?: {
            '@type': string;
            value: string;
          };
        } | {
          institution_name: string;
          institution_id?: {
            '@type': string;
            value: string;
          };
        }[]
      }
    }[]
  }
  program?: {
    '@name'?: string;
    assertion?: {
      assertion?: {
        value: string;
      }
    } | {
      assertion?: {
        value: string;
      }[]
    }
    license_ref?: {
      value: string;
    }
    related_item?: {
      inter_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
      intra_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
    } | {
      inter_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
      intra_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
    }[]
  } | {
    '@name'?: string;
    assertion?: {
      assertion?: {
        value: string;
      }
    } | {
      assertion?: {
        value: string;
      }[]
    }
    license_ref?: {
      value: string;
    }
    related_item?: {
      inter_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
      intra_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
    } | {
      inter_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
      intra_work_relation?: {
        '@identifier-type': string;
        '@relationship-type': string;
        value: string;
        unstructured_citation?: string;
      }
    }[]
  }[]
  citation_list?: {
    citation?: {
      doi: string;
      unstructured_citation: string;
    }[]
  }
  doi_data: {
    doi: string;
    resource: string;
  }
  keywords?: string[] | IArticleKeywords;
  '@language'?: string;
  acceptance_date?: {
    day: string;
    month: string;
    year: string;
  }
} 