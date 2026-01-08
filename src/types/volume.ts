import { AvailableLanguage } from '@/utils/i18n';
import { PartialVolumeArticle } from './article';

export interface IVolume {
  id: number;
  num: string;
  title?: Record<AvailableLanguage, string>;
  description?: Record<AvailableLanguage, string>;
  year?: number;
  types?: string[];
  committee?: IVolumeCommitteeMember[];
  articles: PartialVolumeArticle[];
  downloadLink: string;
  metadatas?: IVolumeMetadata[];
  tileImageURL?: string;
  settingsProceeding?: IVolumeSettingsProceeding[];
}

export type RawVolume = IVolume & {
  vid: number;
  vol_num: string;
  titles?: Record<AvailableLanguage, string>;
  descriptions?: Record<AvailableLanguage, string>;
  vol_year?: number;
  vol_type?: string[];
  papers: PartialVolumeArticle[];
  metadata?: RawVolumeMetadata[];
  settings_proceeding?: IVolumeSettingsProceeding[];
};

interface IVolumeCommitteeMember {
  uuid: string;
  screenName: string;
}

export interface IVolumeMetadata {
  title?: Record<AvailableLanguage, string>;
  content?: Record<AvailableLanguage, string>;
  file?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RawVolumeMetadata = IVolumeMetadata & {
  titles?: Record<AvailableLanguage, string>;
  date_creation?: string;
  date_updated?: string;
};

export interface IVolumeSettingsProceeding {
  setting?: string;
  value?: string;
}

export interface Range {
  types?: string[];
  years: number[];
}

export interface IVolumeResponse {
  data: IVolume[];
  totalItems: number;
  articlesCount?: number;
  range?: Range;
}
