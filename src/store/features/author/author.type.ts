import { IAuthor } from '@/types/author';

export interface IAuthorState {
  authors: {
    data: IAuthor[];
    totalItems: number;
  }
} 