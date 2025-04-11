import { AvailableLanguage } from "@/utils/i18n";
import { IVolume } from "./volume";

// Interface spécifique aux numéros spéciaux qui étend IVolume
export type IIssue = Omit<IVolume, 'downloadLink'> & {
  downloadLink?: string;
  tileImageURL?: string;
}

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

export interface IVolumeSettingsProceeding {
  setting?: string;
  value?: string;
} 