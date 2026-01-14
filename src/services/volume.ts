import {
  IVolume,
  IVolumeMetadata,
  IVolumeSettingsProceeding,
  RawVolume,
  RawVolumeMetadata,
} from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { PaginatedResponseWithCount, Range } from '@/utils/pagination';
import { API_URL } from '@/config/api';
import { getJournalCode } from './journal';
import { getJournalApiUrl } from '@/utils/env-loader';

export const formatVolume = (
  rvcode: string,
  language: AvailableLanguage,
  volume: RawVolume
): IVolume => {
  let metadatas: IVolumeMetadata[] = [];
  let tileImageURL = undefined;

  if (volume.metadata && volume.metadata.length) {
    metadatas = volume.metadata.map(meta => formatVolumeMetadata(meta));

    if (metadatas.length > 0) {
      const tileFile = metadatas.find(
        metadata => metadata.file && metadata.title && metadata.title[language] === 'tile'
      )?.file;
      if (tileFile) {
        tileImageURL = `https://${rvcode}.episciences.org/public/volumes/${volume.vid}/${tileFile}`;
      }
    }
  }

  let settingsProceeding: IVolumeSettingsProceeding[] = [];
  if (volume.settings_proceeding && volume.settings_proceeding.length) {
    settingsProceeding = volume.settings_proceeding;
  }

  return {
    ...volume,
    id: volume.vid,
    num: volume.vol_num,
    title: volume.titles,
    description: volume.descriptions,
    year: volume.vol_year,
    types: volume.vol_type,
    articles: volume.papers,
    downloadLink: `https://${rvcode}.episciences.org/volumes-full/${volume.vid}/${volume.vid}.pdf`,
    metadatas: metadatas,
    tileImageURL,
    settingsProceeding: settingsProceeding,
  };
};

export const formatVolumeMetadata = (metadata: RawVolumeMetadata): IVolumeMetadata => {
  return {
    ...metadata,
    title: metadata.titles,
    content: metadata.content,
    file: metadata.file,
    createdAt: metadata.date_creation,
    updatedAt: metadata.date_updated,
  };
};

export enum VOLUME_TYPE {
  SPECIAL_ISSUE = 'special_issue',
  PROCEEDINGS = 'proceedings',
}

interface FetchVolumesParams {
  rvcode: string;
  language?: string;
  page: number;
  itemsPerPage: number;
  years?: number[];
  types?: VOLUME_TYPE[] | string[];
}

export async function fetchVolumes({
  rvcode,
  language,
  page,
  itemsPerPage,
  years,
  types,
}: FetchVolumesParams): Promise<{
  data: IVolume[];
  totalItems: number;
  articlesCount?: number;
  range?: Range;
}> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      itemsPerPage: itemsPerPage.toString(),
    });

    if (language) {
      params.append('language', language);
    }

    if (types && types.length > 0) {
      types.forEach(type => params.append('type[]', type));
    }

    if (years && years.length > 0) {
      years.forEach(year => params.append('year[]', year.toString()));
    }

    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/volumes?${params.toString()}&rvcode=${rvcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { tags: ['volumes', `volumes-${rvcode}`] },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch volumes');
    }

    const data = await response.json();
    const members = Array.isArray(data) ? data : data['hydra:member'] || [];



    const rawRange = data['hydra:range'];


    const formattedRange = rawRange
      ? {
          types: Array.isArray(rawRange.types)
            ? rawRange.types
            : Array.isArray(rawRange.type)
              ? rawRange.type
              : [],
          years: Array.isArray(rawRange.years)
            ? rawRange.years
            : Array.isArray(rawRange.year)
              ? rawRange.year
              : [],
        }
      : { types: [], years: [] };


    return {
      data: members.map((volume: RawVolume) => formatVolume(rvcode, language || 'fr', volume)),
      totalItems: data['hydra:totalItems'] || members.length,
      articlesCount: data['hydra:totalPublishedArticles'] || 0,
      range: formattedRange,
    };
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return {
      data: [],
      totalItems: 0,
      articlesCount: 0,
      range: {
        types: [],
        years: [],
      },
    };
  }
}

export const volumeTypes: { labelPath: string; value: string }[] = [
  { labelPath: 'pages.volumes.types.specialIssues', value: VOLUME_TYPE.SPECIAL_ISSUE },
  { labelPath: 'pages.volumes.types.proceedings', value: VOLUME_TYPE.PROCEEDINGS },
];

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

export interface FetchVolumeParams {
  rvcode: string;
  vid: string;
  language?: string;
}

export async function fetchVolume(
  rvcode: string,
  vid: number,
  language: string = 'fr'
): Promise<IVolume | null> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/volumes/${vid}?language=${language}&rvcode=${rvcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { tags: ['volumes', `volume-${vid}`, `volumes-${rvcode}`] },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch volume with id ${vid}`);
    }

    const rawVolume = await response.json();
    return formatVolume(rvcode, language as AvailableLanguage, rawVolume);
  } catch (error) {
    console.error('Error fetching volume:', error);
    return null;
  }
}
