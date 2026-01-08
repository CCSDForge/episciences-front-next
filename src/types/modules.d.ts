declare module '@/config/statistics' {
  export interface BlockConfig {
    render: boolean;
    title: string;
    description?: string;
    icon?: string;
    link?: string;
  }

  export function blocksConfiguration(): BlockConfig[];
}

declare module '@/utils/i18n' {
  export function getLanguageName(code: string): string;
  export function getLanguageCode(name: string): string;
}

declare module '@/utils/volume' {
  export enum VOLUME_TYPE {
    REGULAR = 'regular',
    SPECIAL = 'special',
    SUPPLEMENT = 'supplement',
  }

  export interface Volume {
    id: number;
    title: string;
    type: VOLUME_TYPE;
    year: number;
    number: string;
    description?: string;
    coverImage?: string;
    published: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export function getVolumeTitle(volume: Volume): string;
  export function getVolumeDescription(volume: Volume): string;
}

export interface Journal {
  id: number;
  code: string;
  name: string;
  description?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}
