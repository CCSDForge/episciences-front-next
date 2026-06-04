import { createApi } from '@reduxjs/toolkit/query/react';

import { IFacetAuthor, IAuthor, IAuthorArticle, RawAuthorArticle } from '@/types/author';
import { PaginatedResponse, PaginatedResponseWithAuthorsRange } from '@/utils/pagination';
import { createBaseQueryWithLdJsonAccept } from '@/store/utils';

export const authorApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'author',
  tagTypes: ['Author'],
  endpoints: build => ({
    fetchAuthors: build.query<
      { data: IAuthor[]; totalItems: number; range?: Record<string, number> },
      { rvcode: string; page: number; itemsPerPage: number; search?: string; letter?: string }
    >({
      query: ({
        rvcode,
        page,
        itemsPerPage,
        search,
        letter,
      }: {
        rvcode: string;
        page: number;
        itemsPerPage: number;
        search?: string;
        letter?: string;
      }) => {
        const baseUrl = `browse/authors/?page=${page}&itemsPerPage=${itemsPerPage}&code=${rvcode}`;
        let queryParams = '';

        if (search) queryParams += `&search=${search}`;

        if (letter) queryParams += `&letter=${letter}`;

        return `${baseUrl}${queryParams}`;
      },
      transformResponse(baseQueryReturnValue: PaginatedResponseWithAuthorsRange<IFacetAuthor>) {
        const range = baseQueryReturnValue['hydra:range'];

        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const formattedData = baseQueryReturnValue['hydra:member'].map(author => ({
          name: author.values.name,
          count: author.values.count,
        }));

        return {
          data: formattedData,
          totalItems,
          range,
        };
      },
    }),
    fetchAuthorArticles: build.query<
      { data: IAuthorArticle[]; totalItems: number },
      { rvcode: string; fullname: string }
    >({
      query: ({ rvcode, fullname }: { rvcode: string; fullname: string }) => {
        return `browse/authors-search/${fullname}?pagination=false&code=${rvcode}`;
      },
      transformResponse(baseQueryReturnValue: PaginatedResponse<RawAuthorArticle>) {
        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const byPaperId = new Map<number, RawAuthorArticle>();
        for (const article of baseQueryReturnValue['hydra:member']) {
          const existing = byPaperId.get(article.paperid);
          if (!existing || (article.version_td ?? 0) > (existing.version_td ?? 0)) {
            byPaperId.set(article.paperid, article);
          }
        }
        const formattedData = Array.from(byPaperId.values()).map(article => ({
          id: article.paperid,
          title: article.paper_title_t[0],
          publicationDate: article.publication_date_tdate,
          doi: article.doi_s,
        }));

        return {
          data: formattedData,
          totalItems: formattedData.length,
        };
      },
    }),
  }),
});

export const { useFetchAuthorsQuery, useFetchAuthorArticlesQuery } = authorApi;
