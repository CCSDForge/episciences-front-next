import { AvailableLanguage } from '@/utils/i18n';
import { PartialSectionArticle as ImportedPartialSectionArticle } from '@/types/article';
import { ICommitteeMember } from '@/types/committee';

// Re-export for external use
export type PartialSectionArticle = ImportedPartialSectionArticle;

export interface ISection {
  id: number;
  rvid?: number;
  title?: Record<AvailableLanguage, string>;
  description?: Record<AvailableLanguage, string>;
  committee?: ICommitteeMember[];
  articles: PartialSectionArticle[];
}

export type RawSection = ISection & {
  sid: number;
  titles?: Record<AvailableLanguage, string>;
  descriptions?: Record<AvailableLanguage, string>;
  papers: PartialSectionArticle[];
};
