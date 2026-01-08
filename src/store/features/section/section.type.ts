import { ISection } from '@/types/section';

export interface ISectionState {
  sections: {
    data: ISection[];
    totalItems: number;
  };
}
