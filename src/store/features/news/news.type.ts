import { INews } from '../../../types/news'

export interface INewsState {
  news: {
    data: INews[];
    totalItems: number;
  }
} 