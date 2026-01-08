export type VolumeTypeFilter = 'type' | 'year';

export interface IVolumeTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

export interface IVolumeYearSelection {
  year: number;
  isSelected: boolean;
}

export interface IVolumeFilter {
  type: VolumeTypeFilter;
  value: string | number;
  label?: number;
  labelPath?: string;
}
