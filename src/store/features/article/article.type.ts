import { IArticle } from '@/types/article';

export interface IArticleState {
  articles: {
    data: IArticle[];
    totalItems: number;
  };
}
