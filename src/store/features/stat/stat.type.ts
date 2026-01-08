import { IStat } from '../../../types/stat';

export interface IStatState {
  stats: {
    data: IStat[];
    totalItems: number;
  };
  lastStat?: IStat;
}
