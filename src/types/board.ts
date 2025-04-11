import { AvailableLanguage } from "@/utils/i18n";
import { IPage } from "./page";

export type BoardPage = IPage;

export interface IBoardMemberAffiliation {
  label: string;
  rorId: string;
}

export interface IBoardMemberAssignedSection {
  sid: number;
  titles: Record<AvailableLanguage, string>;
  title?: Record<AvailableLanguage, string>;
}

export interface IBoardMember {
  id: number;
  firstname: string;
  lastname: string;
  email?: string;
  biography?: string;
  roles: string[];
  affiliations: IBoardMemberAffiliation[];
  assignedSections: IBoardMemberAssignedSection[];
  twitter?: string;
  mastodon?: string;
  website?: string;
  orcid?: string;
  picture?: string;
}

export type RawBoardMember = IBoardMember & {
  roles: string[][];
  assignedSections?: {
    sid: number;
    titles: Record<AvailableLanguage, string>
  }[];
  additionalProfileInformation?: {
    biography?: string;
    affiliations: IBoardMemberAffiliation[];
    socialMedias?: string;
    webSites: string[];
  }
}

export interface IBoard {
  id: number;
  title: Record<AvailableLanguage, string>;
  description?: Record<AvailableLanguage, string>;
  members: IBoardMember[];
  type: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBoardSection {
  id: number;
  title: Record<AvailableLanguage, string>;
  description?: Record<AvailableLanguage, string>;
  members: IBoardMember[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
} 