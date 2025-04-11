import { AvailableLanguage } from "@/utils/i18n";

interface IJournalSettings {
  setting: string;
  value: string;
}

export interface IJournalIndexation {
  id: string;
  name: string;
  logo?: string;
}

export interface IJournal {
  id: number;
  name: string;
  description?: Record<AvailableLanguage, string>;
  indexation?: IJournalIndexation[];
  title: Record<AvailableLanguage, string>;
  logo?: string;
  coverImage?: string;
  issn?: string;
  eissn?: string;
  publisher?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  code: string;
  settings: IJournalSettings[];
}

export type RawJournal = IJournal & {
  rvid: number;
} 