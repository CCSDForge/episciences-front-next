import { IJournal } from '@/types/journal';

export interface IJournalState {
  journals: IJournal[];
  currentJournal?: IJournal;
}
