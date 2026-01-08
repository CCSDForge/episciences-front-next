import { IVolume } from '@/types/volume';

export interface IVolumeState {
  volumes: {
    data: IVolume[];
    totalItems: number;
  };
  lastVolume?: IVolume;
}
