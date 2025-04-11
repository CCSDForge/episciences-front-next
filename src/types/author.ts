import { AvailableLanguage } from "../utils/i18n";

export interface IFacetAuthor {
  '@id': string;
  values: IAuthor;
}

export interface IAuthor {
  name: string;
  count: number;
}

export interface IAuthorArticle {
  id: number;
  title: string;
  publicationDate: string;
  doi?: string;
}

export type RawAuthorArticle = IAuthorArticle & {
  paperid: number;
  paper_title_t: string[];
  publication_date_tdate: string;
  doi_s?: string;
}

export interface IAuthorArticlesResponse {
  data: IAuthorArticle[];
  totalItems: number;
} 