import {
  IVolume,
  IVolumeMetadata,
  IVolumeSettingsProceeding,
  RawVolume,
  RawVolumeMetadata,
} from '../types/volume';
import { AvailableLanguage } from './i18n';

export function formatVolumeMetadata(metadata: RawVolumeMetadata): IVolumeMetadata {
  return {
    file: metadata.file,
    title: metadata.title,
    content: metadata.content,
    createdAt: metadata.date_creation,
    updatedAt: metadata.date_updated,
  };
}

export const formatVolume = (
  rvcode: string,
  language: AvailableLanguage,
  volume: RawVolume
): IVolume => {
  let metadatas: IVolumeMetadata[] = [];
  let tileImageURL = undefined;

  if (volume['metadata'] && volume['metadata'].length) {
    metadatas = volume['metadata'].map(meta => formatVolumeMetadata(meta));

    if (metadatas.length > 0) {
      const tileFile = metadatas.find(
        metadata => metadata['file'] && metadata['title'] && metadata['title'][language] === 'tile'
      )?.file;
      if (tileFile) {
        tileImageURL = `https://${rvcode}.episciences.org/public/volumes/${volume['vid']}/${tileFile}`;
      }
    }
  }

  let settingsProceeding: IVolumeSettingsProceeding[] = [];
  if (volume['settings_proceeding'] && volume['settings_proceeding'].length) {
    settingsProceeding = volume['settings_proceeding'];
  }

  return {
    ...volume,
    id: volume['vid'],
    num: volume['vol_num'],
    title: volume['titles'],
    description: volume['descriptions'],
    year: volume['vol_year'],
    types: volume['vol_type'],
    articles: volume['papers'],
    downloadLink: `https://${rvcode}.episciences.org/volumes-full/${volume['vid']}/${volume['vid']}.pdf`,
    metadatas: metadatas,
    tileImageURL,
    settingsProceeding: settingsProceeding,
  };
};

export enum VOLUME_TYPE {
  SPECIAL_ISSUE = 'special_issue',
  PROCEEDINGS = 'proceedings',
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
