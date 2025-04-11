import { FetchedArticle } from "@/utils/article";

export interface ISearchState {
  search?: string;
  results: {
    data: FetchedArticle[];
    totalItems: number;
  }
} 