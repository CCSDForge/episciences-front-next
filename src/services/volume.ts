import {
  IVolume,
  IVolumeMetadata,
  IVolumeSettingsProceeding,
  RawVolume,
  RawVolumeMetadata,
} from '@/types/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { PaginatedResponseWithCount, Range } from '@/utils/pagination';
import { getJournalApiUrl } from '@/utils/env-loader';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'volume' });
import { CACHE_TTL } from '@/utils/cache-ttl';

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

export interface FetchVolumesResult {
  data: IVolume[];
  totalItems: number;
  articlesCount?: number;
  range?: Range;
}

/** First array found among the candidates, or an empty array. */
function firstArray<T>(...candidates: unknown[]): T[] {
  return (candidates.find(Array.isArray) as T[] | undefined) ?? [];
}

/**
 * Normalize the `hydra:range` payload into a `Range`, tolerating both the
 * `types`/`type` and `years`/`year` key spellings returned by the API.
 */
export function parseVolumesRange(rawRange: unknown): Range {
  const range = rawRange as { types?: unknown; type?: unknown; years?: unknown; year?: unknown };
  if (!range) return { types: [], years: [] };
  return {
    types: firstArray<string>(range.types, range.type),
    years: firstArray<number>(range.years, range.year),
  };
}

/** Build the query string for the volumes endpoint (pagination + optional filters). */
export function buildVolumesSearchParams({
  page,
  itemsPerPage,
  language,
  types,
  years,
}: Pick<
  FetchVolumesParams,
  'page' | 'itemsPerPage' | 'language' | 'types' | 'years'
>): URLSearchParams {
  const params = new URLSearchParams({
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  });
  if (language) params.append('language', language);
  types?.forEach(type => params.append('type[]', type));
  years?.forEach(year => params.append('year[]', year.toString()));
  return params;
}

/** Fallback result used when the volumes request fails. */
function emptyVolumesResult(): FetchVolumesResult {
  return { data: [], totalItems: 0, articlesCount: 0, range: { types: [], years: [] } };
}

export async function fetchVolumes(params: FetchVolumesParams): Promise<FetchVolumesResult> {
  const { rvcode, language, page, itemsPerPage, years, types } = params;
  try {
    const searchParams = buildVolumesSearchParams({ page, itemsPerPage, language, types, years });
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/volumes?${searchParams.toString()}&rvcode=${rvcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: CACHE_TTL.volumes, tags: ['volumes', `volumes-${rvcode}`] },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch volumes');
    }

    const data = await response.json();
    const members = Array.isArray(data) ? data : data['hydra:member'] || [];

    return {
      data: members.map((volume: RawVolume) => formatVolume(rvcode, language || 'fr', volume)),
      totalItems: data['hydra:totalItems'] || members.length,
      articlesCount: data['hydra:totalPublishedArticles'] || 0,
      range: parseVolumesRange(data['hydra:range']),
    };
  } catch (error) {
    log.error('Error fetching volumes:', error);
    return emptyVolumesResult();
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
      next: {
        revalidate: CACHE_TTL.volumes,
        tags: ['volumes', `volume-${vid}`, `volumes-${rvcode}`],
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        log.debug(`Volume ${vid} not found (404)`);
        return null;
      }
      throw new Error(`Failed to fetch volume with id ${vid}: HTTP ${response.status}`);
    }

    const rawVolume = await response.json();
    return formatVolume(rvcode, language as AvailableLanguage, rawVolume);
  } catch (error) {
    log.error('Error fetching volume:', error);
    return null;
  }
}
