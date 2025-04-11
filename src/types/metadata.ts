import { IArticleKeywords } from './article';

export interface IArticleMetadata {
  keywords?: IArticleKeywords;
  relatedItems?: Array<{
    title?: string;
    creators?: string[];
    publicationDate?: string;
    identifiers?: Array<{
      type: string;
      value: string;
    }>;
    relationType: string;
  }>;
} 