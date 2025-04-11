import { AvailableLanguage } from "@/utils/i18n";
import { PartialSectionArticle } from "@/types/article";

export interface ISection {
  id: number;
  title?: Record<AvailableLanguage, string>;
  description?: Record<AvailableLanguage, string>;
  committee?: ISectionCommitteeMember[];
  articles: PartialSectionArticle[];
}

export type RawSection = ISection & {
  sid: number;
  titles?: Record<AvailableLanguage, string>;
  descriptions?: Record<AvailableLanguage, string>;
  papers: PartialSectionArticle[];
}

interface ISectionCommitteeMember {
  uuid: string;
  screenName: string;
} 