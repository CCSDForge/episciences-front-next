import { AvailableLanguage } from "@/utils/i18n";

export interface INews {
  id: number;
  title: Record<AvailableLanguage, string>;
  content?: Record<AvailableLanguage, string>;
  publicationDate: string;
  date_creation?: string;
  author: string;
  link?: string;
}

export type RawNews = INews & {
  creator: {
    screenName: string;
  };
  link?: {
    und: string;
  }
} 