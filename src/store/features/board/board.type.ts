import { BoardPage, IBoardMember } from '@/types/board';

export interface IBoardState {
  pages: BoardPage[];
  members: IBoardMember[];
}
